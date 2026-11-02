import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import pino from 'pino';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  WASocket,
} from '@whiskeysockets/baileys';
import {
  WhatsAppProviderAdapter,
  ProviderCapabilities,
  WhatsAppConnectionState,
  ConnectionStatus,
  SendResult,
  GroupMetadata,
  GroupMember,
} from './types';

interface InternalUserSession {
  uid: string;
  safeUid: string;
  status: ConnectionStatus;
  sock: WASocket | null;
  phoneNumber?: string;
  pushName?: string;
  qrPayload?: string;
  qrDataUrl?: string;
  pairingCode?: string;
  lastHeartbeat: number;
  connectedAt?: string;
  lastError?: string | null;
  groups: GroupMetadata[];
  qrExpiryTimer?: NodeJS.Timeout | null;
  reconnectTimer?: NodeJS.Timeout | null;
  isInitializing?: boolean;
  qrCount?: number;
  saveCreds?: () => Promise<void>;
}

const SESSIONS_BASE_DIR = path.resolve(process.cwd(), 'data', 'sessions');

// Ensure sessions directory exists
if (!fs.existsSync(SESSIONS_BASE_DIR)) {
  fs.mkdirSync(SESSIONS_BASE_DIR, { recursive: true });
}

export class GatewaySessionAdapter implements WhatsAppProviderAdapter {
  id = 'gateway';
  name = 'WhatsApp Multi-Device Gateway (Official Protocol)';

  // Per-user isolated sessions in memory
  private sessions = new Map<string, InternalUserSession>();
  // Real-time event listeners for Server-Sent Events (SSE)
  private listeners = new Map<string, Set<(state: WhatsAppConnectionState) => void>>();

  constructor() {
    // 10-minute inactivity watchdog (only drops stale disconnected sessions)
    setInterval(() => {
      this.checkInactivityWatchdog();
    }, 60000);
  }

  getCapabilities(): ProviderCapabilities {
    return {
      qrPairing: true,
      groupBroadcast: true,
      channelBroadcast: false,
      contactBroadcast: true,
      mediaMessage: true,
      notes:
        'Koneksi Multi-Device WhatsApp nyata menggunakan protokol resmi WhatsApp Web. Mendukung pemindaian QR Code asli, pairing code 8-karakter langsung dari WhatsApp, pengiriman ke grup di mana nomor menjadi anggota, dan broadcast kontak 1-ke-1. WhatsApp Channels tidak didukung karena enkripsi newsletter Meta belum membuka broadcast terprogram.',
    };
  }

  // Subscribe to real-time connection state updates (used by SSE)
  addListener(userId: string, callback: (state: WhatsAppConnectionState) => void): void {
    if (!this.listeners.has(userId)) {
      this.listeners.set(userId, new Set());
    }
    this.listeners.get(userId)!.add(callback);
  }

  removeListener(userId: string, callback: (state: WhatsAppConnectionState) => void): void {
    const userListeners = this.listeners.get(userId);
    if (userListeners) {
      userListeners.delete(callback);
      if (userListeners.size === 0) {
        this.listeners.delete(userId);
      }
    }
  }

  private notifyListeners(userId: string, state: WhatsAppConnectionState): void {
    const userListeners = this.listeners.get(userId);
    if (userListeners) {
      userListeners.forEach((callback) => {
        try {
          callback(state);
        } catch (err) {
          console.error(`[WHATSAPP ERROR] Listener callback failed for ${userId}:`, err);
        }
      });
    }
  }

  private getSessionPath(safeUid: string): string {
    return path.join(SESSIONS_BASE_DIR, safeUid);
  }

  private getOrCreateSession(userId: string): InternalUserSession {
    let session = this.sessions.get(userId);
    if (!session) {
      const safeUid = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
      session = {
        uid: userId,
        safeUid,
        status: 'DISCONNECTED',
        sock: null,
        lastHeartbeat: Date.now(),
        groups: [],
        qrCount: 0,
      };
      this.sessions.set(userId, session);
    }
    return session;
  }

  /**
   * Watchdog: jika sesi offline / disconnected selama lebih dari 15 menit,
   * bersihkan socket idle yang tidak aktif.
   */
  private checkInactivityWatchdog(): void {
    const now = Date.now();
    const fifteenMinutes = 15 * 60 * 1000;

    this.sessions.forEach((session, userId) => {
      if (session.status !== 'CONNECTED' && now - session.lastHeartbeat > fifteenMinutes) {
        if (session.sock) {
          try {
            session.sock.end(undefined);
          } catch {}
          session.sock = null;
        }
      }
    });
  }

  private formatState(session: InternalUserSession): WhatsAppConnectionState {
    return {
      uid: session.uid,
      provider: 'gateway',
      status: session.status,
      phoneNumber: session.phoneNumber,
      pushName: session.pushName,
      qrCode: session.qrPayload,
      qrDataUrl: session.qrDataUrl,
      pairingCode: session.pairingCode,
      connectedAt: session.connectedAt,
      lastHeartbeat: new Date(session.lastHeartbeat).toISOString(),
      lastError: session.lastError,
      deviceInfo: {
        platform: 'WhatsApp Multi-Device Engine (Baileys v6.7)',
        waVersion: '2.3000.x',
      },
    };
  }

  async getStatus(userId: string): Promise<WhatsAppConnectionState> {
    const session = this.getOrCreateSession(userId);
    const sessionDir = this.getSessionPath(session.safeUid);

    // Auto-recovery: only recover if creds.json exists AND registration is complete (registered === true)
    const credsPath = path.join(sessionDir, 'creds.json');
    if (session.status === 'DISCONNECTED' && !session.sock && fs.existsSync(credsPath)) {
      try {
        const rawCreds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
        if (rawCreds && rawCreds.registered === true) {
          console.log(`[WHATSAPP] Found authenticated session on disk for ${userId}. Restoring socket...`);
          this.initSession(userId).catch((err) => {
            console.error(`[WHATSAPP ERROR] Auto-recovery failed for ${userId}:`, err);
          });
        } else {
          console.log(`[WHATSAPP] Stored credentials for ${userId} are unauthenticated/incomplete (registered: false). Clearing corrupt state to prevent Bad MAC...`);
          try {
            fs.rmSync(sessionDir, { recursive: true, force: true });
          } catch {}
        }
      } catch {
        try {
          fs.rmSync(sessionDir, { recursive: true, force: true });
        } catch {}
      }
    }

    return this.formatState(session);
  }

  /**
   * Initialize a real WhatsApp connection socket and generate actual authentication QR
   */
  async initSession(userId: string, isReconnect = false): Promise<WhatsAppConnectionState> {
    const session = this.getOrCreateSession(userId);

    // If already connected and socket is alive, return immediately
    if (session.status === 'CONNECTED' && session.sock) {
      session.lastHeartbeat = Date.now();
      return this.formatState(session);
    }

    // If currently initializing, prevent duplicate concurrent sockets
    if (session.isInitializing && session.sock && !isReconnect) {
      return this.formatState(session);
    }

    console.log(`[WHATSAPP] Initializing connection for user ${userId} (reconnect: ${isReconnect})`);
    session.isInitializing = true;
    if (!isReconnect) {
      session.status = 'INITIALIZING';
      session.lastError = null;
      session.qrPayload = undefined;
      session.qrDataUrl = undefined;
      session.pairingCode = undefined;
      session.qrCount = 0;
    }
    session.lastHeartbeat = Date.now();
    this.notifyListeners(userId, this.formatState(session));

    // Safely close previous socket without deleting session files
    if (session.sock) {
      try {
        session.sock.ev.removeAllListeners('connection.update');
        session.sock.ev.removeAllListeners('creds.update');
        session.sock.ev.removeAllListeners('messages.upsert');
        session.sock.end(undefined);
      } catch {}
      session.sock = null;
    }

    const sessionDir = this.getSessionPath(session.safeUid);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    try {
      let { state, saveCreds } = await useMultiFileAuthState(sessionDir);

      // CRITICAL DEFENSE: If credentials exist but are unauthenticated (registered === false),
      // purge the corrupt folder and re-initialize auth state to prevent Bad MAC errors.
      if (state.creds && state.creds.me && !state.creds.registered && !isReconnect) {
        console.log(`[WHATSAPP] Detected unauthenticated session (registered: false) for ${userId}. Resetting keys to prevent Bad MAC errors...`);
        try {
          fs.rmSync(sessionDir, { recursive: true, force: true });
          fs.mkdirSync(sessionDir, { recursive: true });
        } catch {}
        const freshAuth = await useMultiFileAuthState(sessionDir);
        state = freshAuth.state;
        saveCreds = freshAuth.saveCreds;
      }

      session.saveCreds = saveCreds;

      const silentLogger = pino({ level: 'silent' });

      // Create official WhatsApp Web socket connection
      const sock = makeWASocket({
        auth: state,
        logger: silentLogger,
        printQRInTerminal: false,
        browser: ['ZynderJhnzV1Beta', 'Chrome', '1.0.0'],
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
        syncFullHistory: false,
        emitOwnEvents: false,
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: false,
        // Ignore status stories and newsletters to prevent missing sender-key decrypt errors
        shouldIgnoreJid: (jid: string) => {
          return (
            !jid ||
            jid === 'status@broadcast' ||
            jid.endsWith('@broadcast') ||
            jid.endsWith('@newsletter') ||
            jid.includes('newsletter')
          );
        },
        // Provide message lookup fallback to resolve decrypt retry loops
        getMessage: async () => {
          return undefined;
        },
      });

      session.sock = sock;

      // Catch and safely ignore incoming message stream to prevent unhandled decryption rejections
      sock.ev.on('messages.upsert', async () => {
        // ZynderJhnzV1Beta is a broadcast engine; incoming group banter is safely ignored
      });

      // Handle credentials update from WhatsApp servers
      sock.ev.on('creds.update', async () => {
        try {
          await session.saveCreds?.();
          console.log(`[WHATSAPP] Credentials updated and saved to disk for ${userId}`);
        } catch (err) {
          console.error(`[WHATSAPP ERROR] Failed to save creds for ${userId}:`, err);
        }
      });

      // Handle connection updates
      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        session.lastHeartbeat = Date.now();

        // 1. REAL QR CODE received directly from WhatsApp authentication server
        if (qr) {
          session.isInitializing = false;
          session.status = 'QR_READY';
          session.qrPayload = qr;
          session.qrCount = (session.qrCount || 0) + 1;
          console.log(`[WHATSAPP] QR received from WhatsApp servers (Count: ${session.qrCount}) for ${userId}`);

          // Render real, high-resolution scannable QR Code as Data URL
          try {
            session.qrDataUrl = await QRCode.toDataURL(qr, {
              margin: 2,
              width: 320,
              color: {
                dark: '#0f172a',
                light: '#ffffff',
              },
            });
          } catch (qrErr: any) {
            console.error('[WHATSAPP ERROR] QR Render Error:', qrErr);
          }

          // In Baileys, WhatsApp refreshes QR automatically every ~20s up to 5-6 times (~2.5 minutes total)
          // Set a generous safety timer (3 minutes) only if no new QR arrives
          if (session.qrExpiryTimer) clearTimeout(session.qrExpiryTimer);
          session.qrExpiryTimer = setTimeout(() => {
            if (session.status === 'QR_READY') {
              console.log(`[WHATSAPP] QR Code timed out without scan for ${userId}`);
              session.status = 'CONNECTION_EXPIRED';
              session.lastError = 'QR Code telah kedaluwarsa. Silakan klik "Muat Ulang QR" untuk memperbarui.';
              this.notifyListeners(userId, this.formatState(session));
            }
          }, 180000);

          this.notifyListeners(userId, this.formatState(session));
        }

        // 2. Transitioning to AUTHENTICATING / CONNECTING
        if (connection === 'connecting') {
          console.log(`[WHATSAPP] Waiting for authentication / connecting socket for ${userId}`);
          if (session.status === 'QR_READY' || session.status === 'PAIRING_REQUIRED') {
            session.status = 'AUTHENTICATING';
            this.notifyListeners(userId, this.formatState(session));
          }
        }

        // 3. Authenticated: CONNECTION OPEN
        if (connection === 'open') {
          session.isInitializing = false;
          if (session.qrExpiryTimer) clearTimeout(session.qrExpiryTimer);
          if (session.reconnectTimer) clearTimeout(session.reconnectTimer);

          session.status = 'CONNECTED';
          session.qrPayload = undefined;
          session.qrDataUrl = undefined;
          session.pairingCode = undefined;
          session.lastError = null;
          session.connectedAt = new Date().toISOString();

          // Extract real phone number and profile name
          if (sock.user) {
            const rawId = sock.user.id || '';
            session.phoneNumber = rawId.split(':')[0].replace(/@.*/, '');
            session.pushName = sock.user.name || (sock.user as any).notify || 'WhatsApp User';
          }

          console.log(`[WHATSAPP] Connection established successfully for ${userId}! Number: ${session.phoneNumber || 'unknown'}`);

          // Fetch real groups
          try {
            await this.refreshGroups(userId);
          } catch (gErr) {
            console.warn('[WHATSAPP] Could not fetch groups immediately:', gErr);
          }

          this.notifyListeners(userId, this.formatState(session));
        }

        // 4. CONNECTION CLOSED / DISCONNECTED
        if (connection === 'close') {
          session.isInitializing = false;
          if (session.qrExpiryTimer) clearTimeout(session.qrExpiryTimer);

          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const errorMsg = lastDisconnect?.error?.message || 'Unknown disconnect reason';
          const isLoggedOut = statusCode === DisconnectReason.loggedOut;
          const shouldReconnect = !isLoggedOut;

          console.log(`[WHATSAPP] Connection closed for ${userId} (Code: ${statusCode}, Reason: ${errorMsg}, ShouldReconnect: ${shouldReconnect}, PrevStatus: ${session.status})`);

          if (isLoggedOut) {
            console.log(`[WHATSAPP ERROR] User logged out from device for ${userId}`);
            session.status = 'DISCONNECTED';
            session.phoneNumber = undefined;
            session.pushName = undefined;
            session.qrPayload = undefined;
            session.qrDataUrl = undefined;
            session.pairingCode = undefined;
            session.lastError = 'Sesi telah dikeluarkan dari perangkat WhatsApp. Silakan hubungkan kembali.';

            // Remove stored session files on explicit logout
            try {
              fs.rmSync(sessionDir, { recursive: true, force: true });
            } catch {}
            this.notifyListeners(userId, this.formatState(session));
          } else if (shouldReconnect) {
            // CRITICAL BUG FIX:
            // DisconnectReason.restartRequired (515) is triggered when QR code is scanned or Pairing Code is submitted!
            // It MUST NOT be marked as CONNECTION_EXPIRED!
            // We must reload the socket with the saved keys to finalize authentication!
            console.log(`[WHATSAPP] Handshake/Restart required (code: ${statusCode}). Reconnecting to finalize authentication for ${userId}...`);

            if (session.status === 'QR_READY' || session.status === 'PAIRING_REQUIRED' || session.status === 'AUTHENTICATING') {
              session.status = 'AUTHENTICATING';
              session.lastError = 'Memproses autentikasi WhatsApp...';
            } else if (session.status === 'CONNECTED') {
              session.status = 'RECONNECTING';
              session.lastError = 'Koneksi terputus sesaat. Menyambung kembali...';
            }

            this.notifyListeners(userId, this.formatState(session));

            // Schedule immediate reconnect
            if (session.reconnectTimer) clearTimeout(session.reconnectTimer);
            session.reconnectTimer = setTimeout(() => {
              this.initSession(userId, true).catch((err) => {
                console.error(`[WHATSAPP ERROR] Reconnect attempt failed for ${userId}:`, err);
              });
            }, 1200);
          } else {
            console.log(`[WHATSAPP ERROR] Non-recoverable disconnect for ${userId}`);
            session.status = 'DISCONNECTED';
            session.lastError = `Koneksi terputus: ${errorMsg}`;
            this.notifyListeners(userId, this.formatState(session));
          }
        }
      });

      return this.formatState(session);
    } catch (err: any) {
      session.isInitializing = false;
      session.status = 'ERROR';
      session.lastError = err.message || 'Gagal memulai koneksi WhatsApp socket.';
      console.error(`[WHATSAPP ERROR] Socket initialization failed for ${userId}:`, err);
      this.notifyListeners(userId, this.formatState(session));
      return this.formatState(session);
    }
  }

  /**
   * Request a real 8-character Pairing Code from WhatsApp's authentication server
   */
  async requestPairingCode(userId: string, phoneNumber: string): Promise<string> {
    console.log(`[WHATSAPP] Requesting pairing code for user ${userId}, target phone: ${phoneNumber}`);
    const session = this.getOrCreateSession(userId);

    // Clean phone number: remove non-digits, ensure country code
    let clean = phoneNumber.replace(/\D/g, '');
    if (clean.startsWith('08')) {
      clean = '62' + clean.slice(1);
    } else if (clean.startsWith('8')) {
      clean = '62' + clean;
    }

    if (clean.length < 10) {
      throw new Error('Nomor telepon tidak valid. Gunakan format contoh: 08123456789 atau 628123456789.');
    }

    // Ensure session socket is initialized
    if (!session.sock || session.status === 'DISCONNECTED' || session.status === 'CONNECTION_EXPIRED' || session.status === 'ERROR') {
      await this.initSession(userId);
    }

    // Wait until socket is ready to accept pairing request
    let attempts = 0;
    while ((!session.sock || session.isInitializing) && attempts < 15) {
      await new Promise((r) => setTimeout(r, 200));
      attempts++;
    }

    if (!session.sock) {
      throw new Error('Socket WhatsApp belum siap. Silakan klik Hubungkan WhatsApp terlebih dahulu.');
    }

    try {
      // Call official Baileys requestPairingCode
      const rawCode = await session.sock.requestPairingCode(clean);
      const formattedCode =
        rawCode.length === 8 ? `${rawCode.slice(0, 4)}-${rawCode.slice(4)}` : rawCode;

      console.log(`[WHATSAPP] Pairing code generated successfully: ${formattedCode}`);

      session.pairingCode = formattedCode;
      session.status = 'PAIRING_REQUIRED';
      session.phoneNumber = clean;
      session.qrPayload = undefined;
      session.qrDataUrl = undefined;
      session.lastHeartbeat = Date.now();
      session.lastError = null;

      // WhatsApp pairing code is valid for 150 seconds
      if (session.qrExpiryTimer) clearTimeout(session.qrExpiryTimer);
      session.qrExpiryTimer = setTimeout(() => {
        if (session.status === 'PAIRING_REQUIRED') {
          console.log(`[WHATSAPP] Pairing code expired for ${userId}`);
          session.status = 'CONNECTION_EXPIRED';
          session.lastError = 'Kode pairing telah kedaluwarsa. Silakan minta kode pairing baru.';
          this.notifyListeners(userId, this.formatState(session));
        }
      }, 150000);

      this.notifyListeners(userId, this.formatState(session));
      return formattedCode;
    } catch (err: any) {
      console.error(`[WHATSAPP ERROR] Failed to request pairing code for ${userId}:`, err);
      session.status = 'ERROR';
      session.lastError = `Gagal meminta pairing code dari WhatsApp: ${err.message}`;
      this.notifyListeners(userId, this.formatState(session));
      throw new Error(`Gagal meminta pairing code: ${err.message}`);
    }
  }

  async disconnect(userId: string): Promise<{ success: boolean; message: string }> {
    console.log(`[WHATSAPP] Disconnecting session for user ${userId}`);
    const session = this.getOrCreateSession(userId);

    if (session.qrExpiryTimer) clearTimeout(session.qrExpiryTimer);
    if (session.reconnectTimer) clearTimeout(session.reconnectTimer);

    if (session.sock) {
      try {
        session.sock.ev.removeAllListeners('connection.update');
        session.sock.ev.removeAllListeners('creds.update');
        await session.sock.logout();
      } catch {
        try {
          session.sock.end(undefined);
        } catch {}
      }
      session.sock = null;
    }

    session.status = 'DISCONNECTED';
    session.phoneNumber = undefined;
    session.pushName = undefined;
    session.qrPayload = undefined;
    session.qrDataUrl = undefined;
    session.pairingCode = undefined;
    session.lastError = null;
    session.groups = [];
    session.lastHeartbeat = Date.now();

    // Clean local session credentials
    const sessionDir = this.getSessionPath(session.safeUid);
    try {
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      }
    } catch (cleanErr) {
      console.warn('[WHATSAPP] Error cleaning session folder:', cleanErr);
    }

    this.notifyListeners(userId, this.formatState(session));

    return {
      success: true,
      message: 'Koneksi WhatsApp berhasil diputus dan sesi kredensial telah dibersihkan secara aman.',
    };
  }

  async reconnect(userId: string): Promise<WhatsAppConnectionState> {
    console.log(`[WHATSAPP] Manual reconnect requested for ${userId}`);
    const session = this.getOrCreateSession(userId);
    if (session.sock) {
      try {
        session.sock.end(undefined);
      } catch {}
      session.sock = null;
    }
    return this.initSession(userId, true);
  }

  async resetSession(userId: string): Promise<{ success: boolean; message: string }> {
    console.log(`[WHATSAPP] Resetting session completely for ${userId}`);
    const session = this.getOrCreateSession(userId);

    if (session.qrExpiryTimer) clearTimeout(session.qrExpiryTimer);
    if (session.reconnectTimer) clearTimeout(session.reconnectTimer);

    if (session.sock) {
      try {
        session.sock.ev.removeAllListeners('connection.update');
        session.sock.ev.removeAllListeners('creds.update');
        session.sock.ev.removeAllListeners('messages.upsert');
        session.sock.end(undefined);
      } catch {}
      session.sock = null;
    }

    session.status = 'DISCONNECTED';
    session.phoneNumber = undefined;
    session.pushName = undefined;
    session.qrPayload = undefined;
    session.qrDataUrl = undefined;
    session.pairingCode = undefined;
    session.lastError = null;
    session.groups = [];
    session.isInitializing = false;

    const sessionDir = this.getSessionPath(session.safeUid);
    try {
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      }
    } catch (cleanErr) {
      console.warn('[WHATSAPP] Error cleaning session folder:', cleanErr);
    }

    this.notifyListeners(userId, this.formatState(session));

    return {
      success: true,
      message: 'Sesi WhatsApp berhasil direset dan seluruh kunci kredensial dibersihkan.',
    };
  }

  private async refreshGroups(userId: string): Promise<GroupMetadata[]> {
    const session = this.getOrCreateSession(userId);
    if (session.status !== 'CONNECTED' || !session.sock) {
      return [];
    }

    try {
      const rawGroups = await session.sock.groupFetchAllParticipating();
      const rawList = Object.values(rawGroups);
      const groups: GroupMetadata[] = await Promise.all(
        rawList.map(async (g) => {
          let picUrl: string | null = null;
          try {
            picUrl = await session.sock?.profilePictureUrl(g.id, 'image') || null;
          } catch {}

          return {
            id: g.id,
            name: g.subject || 'Grup Komunitas',
            memberCount: g.participants ? g.participants.length : 0,
            isAdmin: Boolean(
              g.participants?.some(
                (p) =>
                  p.id.includes(session.phoneNumber || '') &&
                  (p.admin === 'admin' || p.admin === 'superadmin')
              )
            ),
            isAnnouncementOnly: Boolean(g.announce),
            pictureUrl: picUrl,
          };
        })
      );

      session.groups = groups;
      console.log(`[WHATSAPP] Fetched ${groups.length} participating groups for ${userId}`);
      return groups;
    } catch (err) {
      console.error('[WHATSAPP ERROR] Error fetching real groups:', err);
      return session.groups;
    }
  }

  async getGroups(userId: string): Promise<GroupMetadata[]> {
    const session = this.getOrCreateSession(userId);
    if (session.status !== 'CONNECTED') {
      return [];
    }
    if (session.groups.length === 0) {
      return this.refreshGroups(userId);
    }
    return session.groups;
  }

  async getGroupMembers(userId: string, groupId: string): Promise<GroupMember[]> {
    const session = this.getOrCreateSession(userId);
    if (session.status !== 'CONNECTED' || !session.sock) {
      throw new Error('WhatsApp belum terhubung. Silakan hubungkan akun WhatsApp Anda terlebih dahulu.');
    }

    const cleanGroupId = groupId.includes('@g.us') ? groupId : `${groupId}@g.us`;
    try {
      console.log(`[WHATSAPP] Fetching actual participants for group ${cleanGroupId} by user ${userId}`);
      const metadata = await session.sock.groupMetadata(cleanGroupId);
      const userPhoneClean = (session.phoneNumber || '').replace(/\D/g, '');

      const members: GroupMember[] = (metadata.participants || []).map((p) => {
        const isLid = p.id.includes('@lid');
        const rawId = p.id.split('@')[0];
        let cleanPhone = isLid ? rawId : rawId.replace(/\D/g, '');
        if (!isLid && cleanPhone.startsWith('08')) {
          cleanPhone = '62' + cleanPhone.slice(1);
        } else if (!isLid && cleanPhone.startsWith('8')) {
          cleanPhone = '62' + cleanPhone;
        }

        let formatted = cleanPhone;
        if (!isLid && cleanPhone.startsWith('62') && cleanPhone.length >= 10) {
          formatted = `+62 ${cleanPhone.slice(2, 5)}-${cleanPhone.slice(5, 9)}-${cleanPhone.slice(9)}`;
        } else if (isLid) {
          formatted = `LID-${cleanPhone.slice(-6)}`;
        }

        const role: 'admin' | 'superadmin' | 'member' =
          p.admin === 'admin' ? 'admin' : p.admin === 'superadmin' ? 'superadmin' : 'member';

        const isUserSelf = Boolean(
          userPhoneClean && (cleanPhone.endsWith(userPhoneClean) || userPhoneClean.endsWith(cleanPhone))
        );

        return {
          id: p.id,
          phone: cleanPhone,
          formattedPhone: formatted,
          role,
          isUserSelf,
          consentApproved: !isUserSelf,
          optedOut: false,
        };
      });

      console.log(`[WHATSAPP] Successfully retrieved ${members.length} participants for ${cleanGroupId}`);
      return members;
    } catch (err: any) {
      console.error(`[WHATSAPP ERROR] Failed to fetch group metadata for ${cleanGroupId}:`, err);
      throw new Error(`Gagal mengambil data anggota grup dari WhatsApp: ${err.message || 'Grup tidak ditemukan atau akun dikeluarkan'}`);
    }
  }

  async sendGroupMessage(
    userId: string,
    groupId: string,
    message: string,
    mediaUrl?: string
  ): Promise<SendResult> {
    const session = this.getOrCreateSession(userId);
    if (session.status !== 'CONNECTED' || !session.sock) {
      throw new Error('WhatsApp belum terhubung. Silakan hubungkan WhatsApp terlebih dahulu.');
    }

    const jid = groupId.includes('@g.us') ? groupId : `${groupId}@g.us`;
    console.log(`[WHATSAPP] Sending group message to ${jid} from ${userId}`);

    try {
      const messageContent: any = { text: message };
      if (mediaUrl) {
        if (mediaUrl.startsWith('data:image/')) {
          const base64Data = mediaUrl.split(',')[1];
          if (base64Data) {
            messageContent.image = Buffer.from(base64Data, 'base64');
          }
        } else {
          messageContent.image = { url: mediaUrl };
        }
        messageContent.caption = message;
      }

      const sent = await session.sock.sendMessage(jid, messageContent);

      return {
        success: true,
        messageId: sent?.key?.id || `msg-${Date.now()}`,
        status: 'DELIVERED',
        timestamp: new Date().toISOString(),
        provider: this.name,
        recipient: groupId,
      };
    } catch (err: any) {
      console.error(`[WHATSAPP ERROR] Failed to send group message to ${jid}:`, err);
      throw new Error(`Gagal mengirim pesan ke grup: ${err.message}`);
    }
  }

  async sendContactMessage(
    userId: string,
    phoneNumber: string,
    message: string,
    mediaUrl?: string
  ): Promise<SendResult> {
    const session = this.getOrCreateSession(userId);
    if (session.status !== 'CONNECTED' || !session.sock) {
      throw new Error('WhatsApp belum terhubung. Silakan hubungkan WhatsApp terlebih dahulu.');
    }

    let jid = phoneNumber.trim();
    if (!jid.includes('@')) {
      let clean = phoneNumber.replace(/\D/g, '');
      if (clean.startsWith('08')) {
        clean = '62' + clean.slice(1);
      } else if (clean.startsWith('8')) {
        clean = '62' + clean;
      }
      jid = `${clean}@s.whatsapp.net`;
    }

    console.log(`[WHATSAPP] Sending contact message to ${jid} from ${userId}`);

    try {
      const messageContent: any = { text: message };
      if (mediaUrl) {
        if (mediaUrl.startsWith('data:image/')) {
          const base64Data = mediaUrl.split(',')[1];
          if (base64Data) {
            messageContent.image = Buffer.from(base64Data, 'base64');
          }
        } else {
          messageContent.image = { url: mediaUrl };
        }
        messageContent.caption = message;
      }

      const sent = await session.sock.sendMessage(jid, messageContent);

      return {
        success: true,
        messageId: sent?.key?.id || `msg-${Date.now()}`,
        status: 'DELIVERED',
        timestamp: new Date().toISOString(),
        provider: this.name,
        recipient: phoneNumber,
      };
    } catch (err: any) {
      console.error(`[WHATSAPP ERROR] Failed to send contact message to ${jid}:`, err);
      throw new Error(`Gagal mengirim pesan ke kontak: ${err.message}`);
    }
  }

  async sendChannelMessage(
    userId: string,
    channelId: string,
    message: string
  ): Promise<SendResult> {
    return {
      success: false,
      status: 'REJECTED',
      timestamp: new Date().toISOString(),
      provider: this.name,
      recipient: channelId,
      error:
        'WhatsApp Channels (Saluran) berstatus BELUM TERSEDIA. Protokol WhatsApp multi-device saat ini belum membuka akses pengiriman broadcast terprogram ke Channels newsletter Meta.',
    };
  }
}
