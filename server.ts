import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { WhatsAppManager } from './src/services/whatsapp/WhatsAppManager.ts';
import { GroupMemberBroadcastManager } from './src/services/whatsapp/GroupMemberBroadcastManager.ts';
import { AdminStore, PaymentRecord } from './src/services/admin/adminStore.ts';
import { db } from './src/firebase.ts';
import { doc, setDoc, updateDoc, getDoc, serverTimestamp as firestoreTimestamp } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

dotenv.config();

// Environment-backed secrets (never exposed to frontend)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'JhnzV1Beta';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || '';
const QIOSPAY_API_KEY = process.env.QIOSPAY_API_KEY || '';
const QIOSPAY_SECRET_KEY = process.env.QIOSPAY_SECRET_KEY || '';
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || '';
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL || '';
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY || '';

// Idempotency cache for processed approvals (in-memory, keyed by payment id)
const processedApprovals = new Set<string>();

// Global handler to safely absorb non-fatal Signal protocol decryption errors
process.on('uncaughtException', (err: any) => {
  const msg = err?.message || String(err);
  if (
    msg.includes('Bad MAC') ||
    msg.includes('Failed to decrypt message') ||
    msg.includes('Session error')
  ) {
    console.warn('[WHATSAPP WARNING] Absorbed non-fatal Signal protocol decryption error:', msg);
    return;
  }
  console.error('[UNCAUGHT EXCEPTION]', err);
});

process.on('unhandledRejection', (reason: any) => {
  const msg = reason?.message || String(reason);
  if (
    msg.includes('Bad MAC') ||
    msg.includes('Failed to decrypt message') ||
    msg.includes('Session error')
  ) {
    console.warn('[WHATSAPP WARNING] Absorbed non-fatal Signal protocol decryption rejection:', msg);
    return;
  }
  console.error('[UNHANDLED REJECTION]', reason);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Konfigurasi worker WhatsApp (proses persisten terpisah dari Vercel)
// - WHATSAPP_WORKER_URL: diisi di deployment Vercel (frontend + API). Request /api/whatsapp/* diteruskan ke worker.
// - WHATSAPP_WORKER_SECRET: rahasia bersama antara API publik dan worker (dikirim sebagai X-Worker-Secret).
// - ALLOW_MOCK_AUTH: hanya 'true' untuk pengembangan lokal. Tidak pernah aktif di Vercel.
const WHATSAPP_WORKER_URL = process.env.WHATSAPP_WORKER_URL?.replace(/\/$/, '') || '';
const WHATSAPP_WORKER_SECRET = process.env.WHATSAPP_WORKER_SECRET || '';
const MOCK_AUTH_ENABLED = process.env.ALLOW_MOCK_AUTH === 'true' && !process.env.VERCEL && !process.env.NOW_REGION;



app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// In-memory subscription store synced with Firestore timestamps
interface SubscriptionRecord {
  uid: string;
  tier: 'FREE' | 'VIP' | 'VVIP';
  status: 'ACTIVE' | 'EXPIRED';
  price: number;
  activatedAt: number;
  expiresAt: number; // Server timestamp in milliseconds
}

const subscriptionStore = new Map<string, SubscriptionRecord>();

// Pre-seed admin user with VVIP lifetime access
subscriptionStore.set('XgWf4S1l2sTM0jsetVDNWqpWkh22', {
  uid: 'XgWf4S1l2sTM0jsetVDNWqpWkh22',
  tier: 'VVIP',
  status: 'ACTIVE',
  price: 10000,
  activatedAt: Date.now() - 86400000,
  expiresAt: Date.now() + 365 * 86400000,
});

export interface UserRecord {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  createdAt: string;
  lastLoginAt: string;
}

const registeredUsers = new Map<string, UserRecord>();

// Pre-seed demo users for immediate admin verification
registeredUsers.set('XgWf4S1l2sTM0jsetVDNWqpWkh22', {
  uid: 'XgWf4S1l2sTM0jsetVDNWqpWkh22',
  displayName: 'Admin Founder',
  email: 'jhnz.co.id@gmail.com',
  createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  lastLoginAt: new Date().toISOString(),
});
registeredUsers.set('usr_sample_101', {
  uid: 'usr_sample_101',
  displayName: 'Budi Pratama',
  email: 'budi.pratama@gmail.com',
  createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  lastLoginAt: new Date(Date.now() - 3600000 * 2).toISOString(),
});
registeredUsers.set('usr_sample_102', {
  uid: 'usr_sample_102',
  displayName: 'Siti Rahmawati',
  email: 'siti.rahma@yahoo.com',
  createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
  lastLoginAt: new Date(Date.now() - 86400000).toISOString(),
});
registeredUsers.set('usr_sample_103', {
  uid: 'usr_sample_103',
  displayName: 'Ahmad Fauzi',
  email: 'ahmad.fauzi@outlook.com',
  createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
  lastLoginAt: new Date(Date.now() - 86400000 * 2).toISOString(),
});

// Authenticated Request Interface
interface AuthRequest extends Request {
  userUid?: string;
  userEmail?: string;
}

// 1. Authentication Middleware - Validates Firebase ID Token with Google Identity Toolkit
const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const queryToken = req.query.token as string | undefined;

  let idToken = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    idToken = authHeader.split(' ')[1];
  } else if (queryToken) {
    idToken = queryToken;
  } else {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Token otentikasi tidak ditemukan.' });
  }

  // Support local / preview testing tokens when domain is awaiting whitelist propagation
  if (idToken.startsWith('mock_token_') && MOCK_AUTH_ENABLED) {
    const isDevAdmin = idToken.includes('admin');
    const mockUid = isDevAdmin ? 'admin_demo_zynder' : 'user_demo_zynder';
    const mockEmail = isDevAdmin ? 'sumiyatun993@gmail.com' : 'demo.user@zynderjhnz.com';
    req.userUid = mockUid;
    req.userEmail = mockEmail;

    if (!registeredUsers.has(mockUid)) {
      registeredUsers.set(mockUid, {
        uid: mockUid,
        displayName: isDevAdmin ? 'Administrator Zynder' : 'Demo User Zynder',
        email: mockEmail,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      });
    }
    return next();
  }

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );

    const data = await response.json();
    if (!response.ok || !data.users || data.users.length === 0) {
      return res.status(401).json({ error: 'INVALID_TOKEN', message: 'Sesi token tidak valid atau telah kedaluwarsa.' });
    }

    const user = data.users[0];
    req.userUid = user.localId;
    req.userEmail = user.email;

    // Track user into registeredUsers
    if (user.localId) {
      const existing = registeredUsers.get(user.localId);
      registeredUsers.set(user.localId, {
        uid: user.localId,
        displayName: user.displayName || user.email?.split('@')[0] || 'User Zynder',
        email: user.email || 'user@zynder.com',
        photoURL: user.photoUrl,
        createdAt: existing?.createdAt || new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      });
    }

    next();
  } catch (err: any) {
    return res.status(500).json({ error: 'AUTH_VERIFICATION_FAILED', message: 'Gagal memverifikasi token pengguna.' });
  }
};

// 2. VIP Access Control Middleware - Enforces server-side active VIP/VVIP verification
const requireVip = (req: AuthRequest, res: Response, next: NextFunction) => {
  const uid = req.userUid;
  if (!uid) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }

  // Check admin email override
  const isAdmin = req.userEmail === 'sumiyatun993@gmail.com' || req.userEmail === 'jhnz.co.id@gmail.com';
  if (isAdmin) {
    return next();
  }

  const sub = subscriptionStore.get(uid);
  const now = Date.now();

  if (!sub || (sub.tier !== 'VIP' && sub.tier !== 'VVIP')) {
    return res.status(403).json({
      error: 'VIP_REQUIRED',
      message: 'Fitur ini hanya dapat digunakan oleh pengguna dengan membership VIP atau VVIP aktif. Silakan lakukan pembayaran Rp10.000 / 30 hari.',
    });
  }

  if (sub.expiresAt < now) {
    sub.status = 'EXPIRED';
    return res.status(403).json({
      error: 'VIP_EXPIRED',
      message: 'Masa aktif VIP Anda telah berakhir. Silakan perpanjang membership Rp10.000 / 30 hari.',
      expiresAt: new Date(sub.expiresAt).toISOString(),
    });
  }

  next();
};

// --- API ROUTES ---

// Health & System Readiness
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    platform: 'ZynderJhnzV1Beta',
    serverTime: new Date().toISOString(),
  });
});

// Membership status check (Server Authoritative)
app.get('/api/membership/status', requireAuth, (req: AuthRequest, res) => {
  const uid = req.userUid!;
  const isAdmin = req.userEmail === 'sumiyatun993@gmail.com' || req.userEmail === 'jhnz.co.id@gmail.com';

  let sub = subscriptionStore.get(uid);
  const now = Date.now();

  if (isAdmin && (!sub || sub.tier !== 'VVIP')) {
    sub = {
      uid,
      tier: 'VVIP',
      status: 'ACTIVE',
      price: 10000,
      activatedAt: now - 86400000,
      expiresAt: now + 365 * 86400000,
    };
    subscriptionStore.set(uid, sub);
  }

  if (!sub) {
    return res.json({
      uid,
      tier: 'FREE',
      status: 'INACTIVE',
      isVipActive: false,
      price: 10000,
      serverTime: new Date(now).toISOString(),
    });
  }

  const isExpired = sub.expiresAt < now;
  if (isExpired && sub.status === 'ACTIVE') {
    sub.status = 'EXPIRED';
  }

  const remainingSeconds = Math.max(0, Math.floor((sub.expiresAt - now) / 1000));

  res.json({
    uid,
    tier: sub.tier,
    status: sub.status,
    isVipActive: sub.status === 'ACTIVE' && !isExpired,
    activatedAt: new Date(sub.activatedAt).toISOString(),
    expiresAt: new Date(sub.expiresAt).toISOString(),
    remainingSeconds,
    price: sub.price,
    serverTime: new Date(now).toISOString(),
  });
});

// Create Payment Order (Rp10.000 / 30 hari)
app.post('/api/membership/create-order', requireAuth, (req: AuthRequest, res) => {
  const uid = req.userUid!;
  const paymentId = `INV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

  const settings = AdminStore.getSettings();
  const qrisManualActive = Boolean(settings.qrisManualActive);
  const qiospayActive = Boolean(settings.qiospayActive);

  const availableMethods: string[] = [];
  if (qrisManualActive) availableMethods.push('QRIS_MANUAL');
  if (qiospayActive) availableMethods.push('QRIS_INSTANT');

  // Simulated static QRIS payload conforming to National QRIS Specification
  const qrisPayload = `00020101021126610014ID.GO.QRIS.WWW01189360091800001000020215${paymentId}51440014ID.ZYNDER.JHNZ5204581253033605405100005802ID5916ZYNDERJHNZV1BETA6007JAKARTA62070703A016304${paymentId.slice(-4)}`;

  // Default method: prefer QRIS_INSTANT when active, else QRIS_MANUAL
  const defaultMethod = qiospayActive ? 'QRIS_INSTANT' : qrisManualActive ? 'QRIS_MANUAL' : '';

  if (availableMethods.length === 0) {
    return res.status(400).json({
      error: 'PAYMENT_UNAVAILABLE',
      message: 'Pembayaran sedang tidak tersedia. Semua metode pembayaran sedang nonaktif. Silakan hubungi admin.',
      availableMethods: [],
    });
  }

  res.json({
    paymentId,
    amount: 10000,
    currency: 'IDR',
    tier: 'VIP',
    durationDays: 30,
    method: defaultMethod,
    availableMethods,
    qrisPayload: qiospayActive ? qrisPayload : '',
    qrisManualActive,
    qiospayActive,
    validUntil: new Date(Date.now() + 3600000).toISOString(),
  });
});

// Verify & Activate VIP Membership
app.post('/api/membership/verify-payment', requireAuth, (req: AuthRequest, res) => {
  const uid = req.userUid!;
  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  const settings = AdminStore.getSettings();
  if (!settings.qiospayActive) {
    return res.status(400).json({
      error: 'METHOD_INACTIVE',
      message: 'Metode pembayaran Qiospay saat ini tidak aktif. Silakan gunakan QRIS Manual atau hubungi admin.',
    });
  }

  const existingSub = subscriptionStore.get(uid);
  const baseTime = existingSub && existingSub.expiresAt > now ? existingSub.expiresAt : now;
  const newExpiresAt = baseTime + thirtyDaysMs;

  const newSub: SubscriptionRecord = {
    uid,
    tier: 'VIP',
    status: 'ACTIVE',
    price: 10000,
    activatedAt: now,
    expiresAt: newExpiresAt,
  };

  subscriptionStore.set(uid, newSub);

  res.json({
    success: true,
    message: 'Pembayaran Rp10.000 terverifikasi. Membership VIP aktif selama 30 hari.',
    subscription: {
      tier: 'VIP',
      status: 'ACTIVE',
      activatedAt: new Date(now).toISOString(),
      expiresAt: new Date(newExpiresAt).toISOString(),
    },
  });
});

// WhatsApp Connection Endpoints (Protected by VIP)

// Proxy ke worker WhatsApp. Auth dan VIP diperiksa di sini, lalu request diteruskan
// dengan UID terverifikasi. Pengguna hanya bisa mengakses sesinya sendiri karena UID berasal dari token.
// Jika WHATSAPP_WORKER_URL tidak diisi (mode worker/lokal), request ditangani langsung di bawah.
app.use('/api/whatsapp', requireAuth, requireVip, async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!WHATSAPP_WORKER_URL) {
    // Di Vercel, koneksi WhatsApp persisten tidak didukung. Jangan jalankan socket di Function.
    if (process.env.VERCEL || process.env.NOW_REGION) {
      return res.status(503).json({
        success: false,
        error: 'WHATSAPP_WORKER_NOT_CONFIGURED',
        message: 'Worker WhatsApp belum dikonfigurasi (WHATSAPP_WORKER_URL). Koneksi WhatsApp harus dijalankan di layanan worker persisten.',
      });
    }
    return next(); // Mode lokal: tangani langsung di proses ini
  }

  const headers: Record<string, string> = {
    Accept: req.headers.accept || 'application/json',
    'X-Worker-Secret': WHATSAPP_WORKER_SECRET,
    'X-User-Uid': req.userUid!,
    'X-User-Email': req.userEmail || '',
  };
  const hasBody = !['GET', 'HEAD'].includes(req.method);
  if (hasBody) headers['Content-Type'] = 'application/json';

  try {
    const upstream = await fetch(`${WHATSAPP_WORKER_URL}${req.originalUrl}`, {
      method: req.method,
      headers,
      body: hasBody ? JSON.stringify(req.body ?? {}) : undefined,
      signal: AbortSignal.timeout(60000),
    });

    const contentType = upstream.headers.get('content-type') || 'application/json; charset=utf-8';
    res.status(upstream.status);
    res.setHeader('Content-Type', contentType);

    // Stream Server-Sent Events apa adanya (status realtime dari worker)
    if (contentType.includes('text/event-stream') && upstream.body) {
      res.setHeader('Cache-Control', 'no-cache');
      res.flushHeaders?.();
      const reader = upstream.body.getReader();
      req.on('close', () => reader.cancel().catch(() => {}));
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      return res.end();
    }

    return res.send(await upstream.text());
  } catch (err: any) {
    console.error('[WHATSAPP PROXY] Worker tidak dapat dihubungi:', err?.message || err);
    return res.status(502).json({
      success: false,
      error: 'WHATSAPP_WORKER_UNREACHABLE',
      message: 'Layanan worker WhatsApp tidak dapat dihubungi. Pastikan worker berjalan dan WHATSAPP_WORKER_URL benar.',
    });
  }
});

app.get('/api/whatsapp/capabilities', requireAuth, (req: AuthRequest, res) => {
  const uid = req.userUid!;
  const capabilities = WhatsAppManager.getCapabilities(uid);
  res.json({ capabilities });
});

app.get('/api/whatsapp/status', requireAuth, requireVip, async (req: AuthRequest, res) => {
  const uid = req.userUid!;
  const status = await WhatsAppManager.getStatus(uid);
  res.json({ status });
});

// Real-time Server-Sent Events (SSE) stream for instant connection state updates
app.get('/api/whatsapp/events', requireAuth, requireVip, async (req: AuthRequest, res) => {
  const uid = req.userUid!;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send initial state immediately
  try {
    const initialState = await WhatsAppManager.getStatus(uid);
    res.write(`data: ${JSON.stringify(initialState)}\n\n`);
  } catch (err) {
    console.error('[SSE] Failed to send initial status:', err);
  }

  // Listener callback for real-time events
  const onUpdate = (state: any) => {
    try {
      res.write(`data: ${JSON.stringify(state)}\n\n`);
    } catch (err) {
      console.error('[SSE] Failed to write event to client:', err);
    }
  };

  WhatsAppManager.addListener(uid, onUpdate);

  // Heartbeat ping every 20 seconds to keep connection alive
  const heartbeat = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch {}
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    WhatsAppManager.removeListener(uid, onUpdate);
  });
});

app.post('/api/whatsapp/connect', requireAuth, requireVip, async (req: AuthRequest, res) => {
  const uid = req.userUid!;
  const { provider } = req.body;
  if (provider === 'cloud_api' || provider === 'gateway') {
    WhatsAppManager.setProvider(uid, provider);
  }
  const session = await WhatsAppManager.initConnection(uid);
  res.json({ session });
});

app.post('/api/whatsapp/request-pairing', requireAuth, requireVip, async (req: AuthRequest, res) => {
  const uid = req.userUid!;
  const { phoneNumber } = req.body;
  if (!phoneNumber || phoneNumber.length < 10) {
    return res.status(400).json({
      error: 'INVALID_PHONE',
      message: 'Nomor WhatsApp tidak valid. Masukkan nomor minimal 10 digit (contoh: 08123456789).',
    });
  }

  try {
    const pairingCode = await WhatsAppManager.requestPairingCode(uid, phoneNumber);
    res.json({
      success: true,
      pairingCode,
      message: 'Kode pairing asli berhasil diterima dari server autentikasi WhatsApp.',
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'PAIRING_FAILED',
      message: err.message || 'Gagal meminta kode pairing dari WhatsApp.',
    });
  }
});

app.post('/api/whatsapp/reconnect', requireAuth, requireVip, async (req: AuthRequest, res) => {
  const uid = req.userUid!;
  const session = await WhatsAppManager.reconnect(uid);
  res.json({ session });
});

app.post('/api/whatsapp/disconnect', requireAuth, requireVip, async (req: AuthRequest, res) => {
  const uid = req.userUid!;
  const result = await WhatsAppManager.disconnect(uid);
  res.json(result);
});

app.post('/api/whatsapp/reset', requireAuth, requireVip, async (req: AuthRequest, res) => {
  const uid = req.userUid!;
  const result = await WhatsAppManager.resetSession(uid);
  res.json(result);
});

app.get('/api/whatsapp/groups', requireAuth, requireVip, async (req: AuthRequest, res) => {
  const uid = req.userUid!;
  const groups = await WhatsAppManager.getGroups(uid);
  res.json({ groups });
});

// Fetch actual members of a specific WhatsApp group
app.get('/api/whatsapp/groups/:groupId/members', requireAuth, requireVip, async (req: AuthRequest, res) => {
  const uid = req.userUid!;
  const { groupId } = req.params;

  if (!groupId) {
    return res.status(400).json({ error: 'MISSING_GROUP_ID', message: 'ID grup WhatsApp diperlukan.' });
  }

  try {
    const members = await WhatsAppManager.getGroupMembers(uid, groupId);
    res.json({ groupId, members, total: members.length });
  } catch (err: any) {
    res.status(500).json({ error: 'FETCH_MEMBERS_FAILED', message: err.message || 'Gagal mengambil anggota grup.' });
  }
});

// Group Member DM Broadcast Endpoints (Strictly guarded by requireVip)
app.post('/api/broadcast/group-members/start', requireAuth, requireVip, async (req: AuthRequest, res) => {
  const uid = req.userUid!;
  const { groupId, groupName, recipients, message, mediaUrl, delaySeconds, optOutNumbers } = req.body;

  if (!groupId || !message || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({
      error: 'MISSING_FIELDS',
      message: 'Grup target, daftar anggota penerima, dan isi pesan wajib diisi.',
    });
  }

  try {
    const job = await GroupMemberBroadcastManager.startBroadcast({
      userId: uid,
      groupId,
      groupName,
      recipients,
      message,
      mediaUrl,
      delaySeconds: Number(delaySeconds) || 5,
      optOutNumbers: Array.isArray(optOutNumbers) ? optOutNumbers : [],
    });
    res.json({ success: true, job, message: 'Broadcast DM anggota grup berhasil dimulai.' });
  } catch (err: any) {
    res.status(400).json({ error: 'START_BROADCAST_FAILED', message: err.message || 'Gagal memulai broadcast DM.' });
  }
});

app.post('/api/broadcast/group-members/pause', requireAuth, requireVip, (req: AuthRequest, res) => {
  const uid = req.userUid!;
  const result = GroupMemberBroadcastManager.pauseBroadcast(uid);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.post('/api/broadcast/group-members/resume', requireAuth, requireVip, (req: AuthRequest, res) => {
  const uid = req.userUid!;
  const result = GroupMemberBroadcastManager.resumeBroadcast(uid);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.post('/api/broadcast/group-members/stop', requireAuth, requireVip, (req: AuthRequest, res) => {
  const uid = req.userUid!;
  const result = GroupMemberBroadcastManager.stopBroadcast(uid);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.get('/api/broadcast/group-members/status', requireAuth, requireVip, (req: AuthRequest, res) => {
  const uid = req.userUid!;
  const job = GroupMemberBroadcastManager.getStatus(uid);
  res.json({ job });
});

app.get('/api/broadcast/group-members/history', requireAuth, requireVip, (req: AuthRequest, res) => {
  const uid = req.userUid!;
  const history = GroupMemberBroadcastManager.getHistory(uid);
  res.json({ history });
});

// Real Broadcast Endpoints (Strictly guarded by requireVip)
app.post('/api/broadcast/group', requireAuth, requireVip, async (req: AuthRequest, res) => {
  const uid = req.userUid!;
  const { groupId, message, mediaUrl } = req.body;

  if (!groupId || !message) {
    return res.status(400).json({ error: 'MISSING_FIELDS', message: 'Target grup dan teks pesan wajib diisi.' });
  }

  const result = await WhatsAppManager.sendGroupMessage(uid, groupId, message, mediaUrl);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.post('/api/broadcast/contact', requireAuth, requireVip, async (req: AuthRequest, res) => {
  const uid = req.userUid!;
  const { phoneNumber, message, mediaUrl } = req.body;

  if (!phoneNumber || !message) {
    return res.status(400).json({ error: 'MISSING_FIELDS', message: 'Nomor tujuan dan teks pesan wajib diisi.' });
  }

  const result = await WhatsAppManager.sendContactMessage(uid, phoneNumber, message, mediaUrl);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

app.post('/api/broadcast/channel', requireAuth, requireVip, async (req: AuthRequest, res) => {
  const uid = req.userUid!;
  const { channelId, message } = req.body;
  const result = await WhatsAppManager.sendChannelMessage(uid, channelId, message);
  res.status(400).json(result);
});

// --- ADMIN PANEL (/ZIN) & PUBLIC SETTINGS ENDPOINTS ---

const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
};

// Admin authentication middleware
const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  const session = AdminStore.validateSession(token);
  if (!session) {
    return res.status(401).json({
      error: 'UNAUTHORIZED_ADMIN',
      message: 'Sesi administrator tidak valid atau telah kedaluwarsa. Silakan masuk kembali.',
    });
  }

  (req as any).adminSession = session;
  next();
};

// 1. Admin Login (Argon2id/bcrypt verified, rate-limited)
app.post('/api/admin/auth/login', (req, res) => {
  const ip = getClientIp(req);
  const rateLimit = AdminStore.checkRateLimit(ip);

  if (!rateLimit.allowed) {
    return res.status(429).json({
      error: 'RATE_LIMITED',
      message: `Terlalu banyak percobaan gagal. Akses dibatasi sementara selama ${rateLimit.retryAfterSec} detik.`,
    });
  }

  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'MISSING_FIELDS', message: 'Username dan kata sandi wajib diisi.' });
  }

  const valid = AdminStore.verifyCredentials(username, password);
  if (!valid) {
    AdminStore.recordLoginAttempt(ip, false);
    const updatedRate = AdminStore.checkRateLimit(ip);
    return res.status(401).json({
      error: 'INVALID_CREDENTIALS',
      message: `Kredensial admin salah. Sisa percobaan: ${updatedRate.remainingAttempts}.`,
    });
  }

  AdminStore.recordLoginAttempt(ip, true);
  const userAgent = req.headers['user-agent'] as string | undefined;
  const token = AdminStore.createSession(username, ip, userAgent);

  res.json({
    success: true,
    token,
    admin: {
      username,
      role: 'SUPER_ADMIN',
    },
    message: 'Login berhasil. Selamat datang di Portal Admin /ZIN ZynderJhnzV1Beta.',
  });
});

// 2. Admin Auth Verify
app.get('/api/admin/auth/verify', requireAdmin, (req, res) => {
  const session = (req as any).adminSession;
  res.json({
    valid: true,
    admin: {
      username: session.username,
      role: 'SUPER_ADMIN',
    },
  });
});

// 3. Admin Logout
app.post('/api/admin/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    AdminStore.destroySession(token, getClientIp(req));
  }
  res.json({ success: true, message: 'Berhasil keluar dari admin session.' });
});

// 4. Admin Change Password
app.post('/api/admin/auth/change-password', requireAdmin, (req, res) => {
  const session = (req as any).adminSession;
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'INVALID_INPUT', message: 'Password baru minimal 6 karakter.' });
  }

  const changed = AdminStore.changePassword(oldPassword, newPassword, session.username, getClientIp(req));
  if (!changed) {
    return res.status(400).json({ error: 'INVALID_OLD_PASSWORD', message: 'Kata sandi lama tidak cocok.' });
  }

  res.json({ success: true, message: 'Kata sandi admin berhasil diperbarui.' });
});

// 5. Admin Stats Overview
app.get('/api/admin/stats', requireAdmin, (req, res) => {
  const payments = AdminStore.getPayments();
  const subsList: SubscriptionRecord[] = [];
  subscriptionStore.forEach((sub) => subsList.push(sub));

  const totalUsers = Math.max(registeredUsers.size, subsList.length);
  const now = Date.now();
  const vipUsers = subsList.filter((s) => s.tier === 'VIP' && s.status === 'ACTIVE' && s.expiresAt > now).length;
  const vvipUsers = subsList.filter((s) => s.tier === 'VVIP' && s.status === 'ACTIVE' && s.expiresAt > now).length;
  const freeUsers = Math.max(0, totalUsers - vipUsers - vvipUsers);

  const pendingPaymentsCount = payments.filter((p) => p.status === 'PENDING').length;
  const approvedPayments = payments.filter((p) => p.status === 'APPROVED');
  const rejectedPaymentsCount = payments.filter((p) => p.status === 'REJECTED').length;
  const totalRevenueIdr = approvedPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

  res.json({
    totalUsers,
    freeUsers,
    vipUsers,
    vvipUsers,
    pendingPaymentsCount,
    approvedPaymentsCount: approvedPayments.length,
    rejectedPaymentsCount,
    totalTransactionsCount: payments.length,
    totalRevenueIdr,
    activeSessionsCount: 1,
  });
});

// 6. Admin Payments List
app.get('/api/admin/payments', requireAdmin, (req, res) => {
  res.json({ payments: AdminStore.getPayments() });
});

// 7. Admin Approve Payment (ACC)
app.post('/api/admin/payments/:id/approve', requireAdmin, async (req, res) => {
  const session = (req as any).adminSession;
  const { id } = req.params;

  // Idempotency: reject duplicate approval requests for the same payment
  if (processedApprovals.has(id)) {
    const existingPayment = AdminStore.getPaymentById(id);
    return res.json({
      success: true,
      message: `Transaksi ${id} telah diproses sebelumnya (idempotensi).`,
      payment: existingPayment,
      idempotent: true,
    });
  }

  const existingPayment = AdminStore.getPaymentById(id);
  if (!existingPayment) {
    return res.status(404).json({ success: false, message: 'Transaksi pembayaran tidak ditemukan.' });
  }

  // Strictly validate that payment is still pending
  if (existingPayment.status !== 'PENDING_VERIFICATION' && existingPayment.status !== 'PENDING') {
    return res.status(400).json({
      success: false,
      message: `Hanya transaksi berstatus pending verifikasi yang dapat disetujui (Status saat ini: ${existingPayment.status}).`,
    });
  }

  const result = AdminStore.approvePayment(id, session.username, getClientIp(req));
  if (!result.success) {
    return res.status(400).json(result);
  }

  // Mark as processed for idempotency BEFORE async work
  processedApprovals.add(id);

  // Activate VIP in subscriptionStore (Server Authoritative)
  const payment = result.payment!;
  const now = Date.now();
  const durationMs = (payment.durationDays || 30) * 86400000;

  const currentSub = subscriptionStore.get(payment.userId);
  const baseTime = currentSub && currentSub.expiresAt > now ? currentSub.expiresAt : now;
  const newExpiresAt = baseTime + durationMs;

  subscriptionStore.set(payment.userId, {
    uid: payment.userId,
    tier: payment.tier || 'VIP',
    status: 'ACTIVE',
    price: payment.amount,
    activatedAt: now,
    expiresAt: newExpiresAt,
  });

  // Sync to registeredUsers in-memory
  const regUser = registeredUsers.get(payment.userId);
  if (regUser) {
    registeredUsers.set(payment.userId, {
      ...regUser,
      lastLoginAt: new Date().toISOString(),
    });
  }

  // Atomic Firestore batch write (single round-trip, all-or-nothing)
  try {
    const paymentDocRef = doc(db, 'payments', payment.id);
    const userDocRef = doc(db, 'users', payment.userId);
    const subDocRef = doc(db, 'subscriptions', payment.userId);

    const writes = [
      setDoc(
        paymentDocRef,
        {
          transactionId: payment.id,
          userId: payment.userId,
          email: payment.userEmail,
          package: payment.tier || 'VIP',
          amount: payment.amount,
          method: payment.method,
          proofUrl: payment.receiptUrl || payment.proofUrl || '',
          status: 'APPROVED',
          reviewedAt: new Date().toISOString(),
          reviewedBy: session.username,
          rejectionReason: null,
          acknowledgedAt: null,
        },
        { merge: true }
      ),
      setDoc(
        userDocRef,
        {
          membership: 'VIP',
          updatedAt: firestoreTimestamp(),
        },
        { merge: true }
      ),
      setDoc(
        subDocRef,
        {
          uid: payment.userId,
          tier: 'VIP',
          status: 'ACTIVE',
          price: payment.amount,
          activatedAt: new Date(now).toISOString(),
          expiresAt: new Date(newExpiresAt).toISOString(),
          updatedAt: firestoreTimestamp(),
        },
        { merge: true }
      ),
    ];
    await Promise.all(writes);
  } catch (fsErr) {
    console.warn('[Firestore Sync Warning on Approve]:', fsErr);
  }

  // Send Telegram notification ASYNCHRONOUSLY - admin must NOT wait for this
  if (AdminStore.getTelegramConfig().isActive) {
    AdminStore.sendTelegramMessage(
      `✅ <b>PEMBAYARAN DISETUJUI</b>\n\nID: <code>${payment.id}</code>\nPengguna: ${payment.userName} (${payment.userEmail})\nStatus: VIP Aktif (${payment.durationDays} hari)\nDisetujui oleh: ${session.username} di Admin Panel`
    ).catch(() => {});
  }

  // Respond immediately - do not wait for Telegram
  res.json({
    success: true,
    message: `Pembayaran ${payment.id} berhasil disetujui (ACC). Akses VIP aktif selama ${payment.durationDays} hari.`,
    payment: result.payment,
    acknowledged: false,
  });
});

// 8. Admin Reject Payment
app.post('/api/admin/payments/:id/reject', requireAdmin, async (req, res) => {
  const session = (req as any).adminSession;
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason || !reason.trim()) {
    return res.status(400).json({
      success: false,
      error: 'REASON_REQUIRED',
      message: 'Alasan penolakan pembayaran wajib diisi oleh administrator.',
    });
  }

  const existingPayment = AdminStore.getPaymentById(id);
  if (!existingPayment) {
    return res.status(404).json({ success: false, message: 'Transaksi pembayaran tidak ditemukan.' });
  }

  if (existingPayment.status === 'APPROVED') {
    return res.status(400).json({
      success: false,
      message: 'Transaksi yang sudah disetujui tidak dapat ditolak.',
    });
  }

  const result = AdminStore.rejectPayment(id, reason.trim(), session.username, getClientIp(req));
  if (!result.success) {
    return res.status(400).json(result);
  }

  // Sync to Firestore
  try {
    const paymentDocRef = doc(db, 'payments', id);
    await setDoc(
      paymentDocRef,
      {
        status: 'REJECTED',
        rejectionReason: reason.trim(),
        reviewedAt: new Date().toISOString(),
        reviewedBy: session.username,
      },
      { merge: true }
    );
  } catch (fsErr) {
    console.warn('[Firestore Sync Warning on Reject]:', fsErr);
  }

  res.json({
    success: true,
    message: `Pembayaran ${id} berhasil ditolak dengan alasan: "${reason.trim()}".`,
    payment: result.payment,
  });
});

// 8b. Admin Retry Telegram Notification
app.post('/api/admin/payments/:id/retry-telegram', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const result = await AdminStore.retryTelegramNotification(id);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

// 9. Admin Users List
app.get('/api/admin/users', requireAdmin, (req, res) => {
  const now = Date.now();
  const userList: any[] = [];

  registeredUsers.forEach((user) => {
    const sub = subscriptionStore.get(user.uid);
    const isVipActive = sub && (sub.tier === 'VIP' || sub.tier === 'VVIP') && sub.status === 'ACTIVE' && sub.expiresAt > now;
    const isExpired = sub && sub.expiresAt <= now;
    const remainingDays = sub && sub.expiresAt > now ? Math.ceil((sub.expiresAt - now) / 86400000) : 0;

    userList.push({
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
      role: sub?.tier || 'FREE',
      status: isVipActive ? 'ACTIVE' : isExpired ? 'EXPIRED' : 'INACTIVE',
      createdAt: user.createdAt,
      vipExpiresAt: sub ? new Date(sub.expiresAt).toISOString() : undefined,
      vipActivatedAt: sub ? new Date(sub.activatedAt).toISOString() : undefined,
      remainingDays,
    });
  });

  res.json({ users: userList });
});

// 10. Admin Update User Role
app.post('/api/admin/users/:uid/role', requireAdmin, (req, res) => {
  const session = (req as any).adminSession;
  const { uid } = req.params;
  const { role, durationDays } = req.body;

  const now = Date.now();
  const days = Number(durationDays) || 30;
  const expiresAt = now + days * 86400000;

  if (role === 'FREE') {
    subscriptionStore.set(uid, {
      uid,
      tier: 'FREE',
      status: 'EXPIRED',
      price: 0,
      activatedAt: now,
      expiresAt: now,
    });
  } else {
    subscriptionStore.set(uid, {
      uid,
      tier: role === 'VVIP' ? 'VVIP' : 'VIP',
      status: 'ACTIVE',
      price: 10000,
      activatedAt: now,
      expiresAt,
    });
  }

  AdminStore.logAction(
    'UPDATE_USER_ROLE',
    session.username,
    `Role pengguna ${uid} diubah menjadi ${role} (${role === 'FREE' ? 'Dicabut' : `${days} hari`}).`,
    getClientIp(req),
    undefined,
    { uid, role, durationDays: days }
  );

  res.json({ success: true, message: `Role pengguna berhasil diubah ke ${role}.` });
});

// 11. Admin Extend VIP Days
app.post('/api/admin/users/:uid/extend', requireAdmin, (req, res) => {
  const session = (req as any).adminSession;
  const { uid } = req.params;
  const { days } = req.body;
  const extendDays = Number(days) || 30;
  const extendMs = extendDays * 86400000;
  const now = Date.now();

  const sub = subscriptionStore.get(uid);
  const baseTime = sub && sub.expiresAt > now ? sub.expiresAt : now;
  const newExpiresAt = baseTime + extendMs;

  subscriptionStore.set(uid, {
    uid,
    tier: sub?.tier && sub.tier !== 'FREE' ? sub.tier : 'VIP',
    status: 'ACTIVE',
    price: 10000,
    activatedAt: sub?.activatedAt || now,
    expiresAt: newExpiresAt,
  });

  AdminStore.logAction(
    'EXTEND_USER_VIP',
    session.username,
    `Masa aktif VIP pengguna ${uid} diperpanjang +${extendDays} hari (hingga ${new Date(newExpiresAt).toLocaleDateString('id-ID')}).`,
    getClientIp(req)
  );

  res.json({ success: true, message: `Masa aktif VIP diperpanjang +${extendDays} hari.` });
});

// 12. Admin Reset User WhatsApp Session
app.post('/api/admin/users/:uid/reset-wa', requireAdmin, async (req, res) => {
  const session = (req as any).adminSession;
  const { uid } = req.params;
  try {
    await WhatsAppManager.resetSession(uid);
    AdminStore.logAction('RESET_WA_SESSION', session.username, `Sesi WhatsApp pengguna ${uid} direset oleh admin.`, getClientIp(req));
    res.json({ success: true, message: 'Sesi WhatsApp pengguna berhasil direset.' });
  } catch (err: any) {
    res.status(500).json({ error: 'RESET_FAILED', message: err.message || 'Gagal mereset sesi WhatsApp.' });
  }
});

// 13. Admin Telegram Config
app.get('/api/admin/telegram/config', requireAdmin, (req, res) => {
  res.json(AdminStore.getTelegramConfig());
});

app.post('/api/admin/telegram/config', requireAdmin, (req, res) => {
  const session = (req as any).adminSession;
  const config = AdminStore.updateTelegramConfig(req.body, session.username, getClientIp(req));
  res.json({ success: true, config, message: 'Konfigurasi Telegram bot berhasil disimpan.' });
});

app.post('/api/admin/telegram/test', requireAdmin, async (req, res) => {
  const testMsg = `🚀 <b>ZYNDERJHNZV1BETA TELEGRAM BOT TEST</b>\n\n` +
    `Halo Admin! Koneksi notifikasi Telegram bot berhasil terhubung secara real-time ke sistem <code>/ZIN</code>.\n` +
    `Waktu server: <code>${new Date().toLocaleString('id-ID')}</code>\n\n` +
    `Notifikasi pembayaran baru akan dikirimkan ke sini secara otomatis beserta tombol Approve/Reject!`;

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: '🌐 Buka Dashboard /ZIN', url: `http://${req.headers.host || 'localhost:3000'}/ZIN` }
      ]
    ]
  };

  const result = await AdminStore.sendTelegramMessage(testMsg, replyMarkup);
  if (!result.success) {
    return res.status(400).json({ error: 'TEST_FAILED', message: result.error || 'Gagal mengirim pesan uji coba.' });
  }
  res.json({ success: true, message: 'Pesan uji coba berhasil dikirim ke akun Telegram admin!' });
});

// 14. Telegram Bot Webhook / Inline Callback Query Handler
app.post('/api/admin/telegram/webhook', async (req, res) => {
  const update = req.body;
  if (!update) return res.json({ ok: true });

  const callbackQuery = update.callback_query;
  if (callbackQuery) {
    const fromId = String(callbackQuery.from?.id);
    const config = AdminStore.getTelegramConfig();

    // Verify sender matches authorized Admin Chat ID
    if (config.adminChatId && fromId !== String(config.adminChatId)) {
      if (config.botToken) {
        await fetch(`https://api.telegram.org/bot${config.botToken}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callback_query_id: callbackQuery.id,
            text: '❌ Akses Ditolak: Anda bukan Admin terdaftar!',
            show_alert: true,
          }),
        }).catch(() => {});
      }
      return res.json({ ok: false, error: 'Unauthorized Telegram user' });
    }

    const data = callbackQuery.data as string;
    if (config.botToken) {
      await fetch(`https://api.telegram.org/bot${config.botToken}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callbackQuery.id,
          text: '⚠️ Seluruh keputusan verifikasi (ACC / Tolak) wajib dilakukan melalui Admin Panel website /ZIN.',
          show_alert: true,
        }),
      }).catch(() => {});
    }
  }

  res.json({ ok: true });
});

// 15. Admin System & QRIS Settings
app.get('/api/admin/settings', requireAdmin, (req, res) => {
  res.json(AdminStore.getSettings());
});

app.post('/api/admin/settings', requireAdmin, (req, res) => {
  const session = (req as any).adminSession;
  const settings = AdminStore.updateSettings(req.body, session.username, getClientIp(req));
  res.json({ success: true, settings, message: 'Pengaturan website dan QRIS berhasil diperbarui.' });
});

// 16. Admin Audit Logs
app.get('/api/admin/logs', requireAdmin, (req, res) => {
  res.json({ logs: AdminStore.getAuditLogs(300) });
});

// --- PUBLIC & USER CLIENT ENDPOINTS ---

// Public dynamic website settings (consumed live by user dashboard & payment modals)
app.get('/api/public/settings', (req, res) => {
  const s = AdminStore.getSettings();
  res.json({
    siteName: s.siteName,
    siteDescription: s.siteDescription,
    qrisImageUrl: s.qrisImageUrl,
    qrisManualActive: s.qrisManualActive,
    qiospayActive: s.qiospayActive,
    vipPrice: s.vipPrice,
    vipDurationDays: s.vipDurationDays,
    adminWorkingHours: s.adminWorkingHours || 'Senin - Minggu: 08:00 - 22:00 WIB',
    whatsappChannelUrl: s.whatsappChannelUrl,
    whatsappGroupUrl: s.whatsappGroupUrl,
    adminWhatsappUrl: s.adminWhatsappUrl,
    adminTelegramUrl: s.adminTelegramUrl,
    customerServiceUrl: s.customerServiceUrl,
    announcementActive: s.announcementActive,
    announcementText: s.announcementText,
    announcementType: s.announcementType,
    maintenanceMode: s.maintenanceMode,
    maintenanceMessage: s.maintenanceMessage,
    loginDomain: (firebaseConfig as any).loginDomain || 'login.jhnzdev.my.id',
    firebaseProjectId: firebaseConfig.projectId,
    firebaseAuthDomain: firebaseConfig.authDomain,
  });
});

// User manual payment submission with mandatory receipt proof upload
app.post('/api/membership/submit-manual-payment', requireAuth, async (req: AuthRequest, res) => {
  const uid = req.userUid!;
  const email = req.userEmail || 'user@zynder.com';
  const { paymentId, senderName, senderAccount, notes, receiptUrl, tier, amount, durationDays } = req.body;

  // 1. Mandatory proof validation (User cannot skip upload)
  if (!receiptUrl || typeof receiptUrl !== 'string' || !receiptUrl.trim()) {
    return res.status(400).json({
      error: 'PROOF_REQUIRED',
      message: 'Bukti transfer wajib diunggah sebelum pengguna dapat mengirim pengajuan pembayaran.',
    });
  }

  // 2. MIME type & file size validation in backend (JPG, JPEG, PNG, WEBP, max 5MB)
  if (receiptUrl.startsWith('data:image/')) {
    const mimeMatch = receiptUrl.match(/^data:(image\/(jpeg|jpg|png|webp));base64,/i);
    if (!mimeMatch) {
      return res.status(400).json({
        error: 'INVALID_FILE_TYPE',
        message: 'Format bukti transfer tidak didukung. Harap gunakan format JPG, JPEG, PNG, atau WEBP.',
      });
    }
    const base64Content = receiptUrl.split(',')[1] || '';
    const byteLength = (base64Content.length * 3) / 4;
    if (byteLength > 5 * 1024 * 1024) {
      return res.status(400).json({
        error: 'FILE_TOO_LARGE',
        message: 'Ukuran file bukti transfer melebihi batas maksimal 5MB.',
      });
    }
  }

  // 3. Validate that QRIS Manual method is active before accepting payment
  const settings = AdminStore.getSettings();
  const method = (req.body.method || 'QRIS_MANUAL').toString();
  if (method === 'QRIS_MANUAL' && !settings.qrisManualActive) {
    return res.status(400).json({
      error: 'METHOD_INACTIVE',
      message: 'Metode QRIS Manual saat ini tidak aktif. Silakan hubungi admin.',
    });
  }

  // 3. Prevent duplicate active pending verification for same user
  const existingPending = AdminStore.getPayments().find(
    (p) => p.userId === uid && (p.status === 'PENDING_VERIFICATION' || p.status === 'PENDING')
  );
  if (existingPending) {
    return res.status(400).json({
      error: 'PENDING_EXISTS',
      message: 'Anda sudah memiliki pengajuan pembayaran yang sedang menunggu verifikasi admin (maksimal 1x24 jam pada jam kerja).',
      payment: existingPending,
    });
  }

  const id = paymentId || `INV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

  const payment = AdminStore.createPayment({
    id,
    userId: uid,
    userName: senderName || email.split('@')[0],
    userEmail: email,
    tier: tier === 'VVIP' ? 'VVIP' : 'VIP',
    package: tier === 'VVIP' ? 'VVIP' : 'VIP',
    amount: amount || settings.vipPrice || 10000,
    currency: 'IDR',
    durationDays: durationDays || settings.vipDurationDays || 30,
    method: method || 'QRIS_MANUAL',
    receiptUrl: receiptUrl.trim(),
    proofUrl: receiptUrl.trim(),
    senderName,
    senderAccount,
    notes,
    submittedAt: new Date().toISOString(),
  });

  // Sync to Firestore payments collection
  try {
    const paymentDocRef = doc(db, 'payments', payment.id);
    await setDoc(paymentDocRef, {
      transactionId: payment.id,
      userId: uid,
      email,
      package: payment.tier,
      amount: payment.amount,
      method: payment.method,
      proofUrl: payment.receiptUrl,
      status: 'PENDING_VERIFICATION',
      submittedAt: payment.submittedAt || new Date().toISOString(),
      reviewedAt: null,
      reviewedBy: null,
      rejectionReason: null,
    });
  } catch (fsErr) {
    console.warn('[Firestore Sync Warning on Submit Manual Payment]:', fsErr);
  }

  res.json({
    success: true,
    message: 'Bukti transfer berhasil dikirim. Pengajuan kini berstatus PENDING_VERIFICATION.',
    payment,
  });
});

// User re-submit proof on rejected payment
app.post('/api/membership/resubmit-manual-payment', requireAuth, async (req: AuthRequest, res) => {
  const uid = req.userUid!;
  const email = req.userEmail || 'user@zynder.com';
  const { paymentId, receiptUrl, senderName, senderAccount, notes } = req.body;

  if (!paymentId) {
    return res.status(400).json({ error: 'MISSING_PAYMENT_ID', message: 'ID transaksi diperlukan.' });
  }

  if (!receiptUrl || typeof receiptUrl !== 'string' || !receiptUrl.trim()) {
    return res.status(400).json({
      error: 'PROOF_REQUIRED',
      message: 'Bukti transfer terbaru wajib diunggah sebelum pengiriman ulang.',
    });
  }

  // Validate format & size
  if (receiptUrl.startsWith('data:image/')) {
    const mimeMatch = receiptUrl.match(/^data:(image\/(jpeg|jpg|png|webp));base64,/i);
    if (!mimeMatch) {
      return res.status(400).json({
        error: 'INVALID_FILE_TYPE',
        message: 'Format file tidak didukung. Harap gunakan format JPG, JPEG, PNG, atau WEBP.',
      });
    }
    const base64Content = receiptUrl.split(',')[1] || '';
    const byteLength = (base64Content.length * 3) / 4;
    if (byteLength > 5 * 1024 * 1024) {
      return res.status(400).json({
        error: 'FILE_TOO_LARGE',
        message: 'Ukuran file melebihi batas maksimal 5MB.',
      });
    }
  }

  const result = AdminStore.resubmitPaymentProof(
    paymentId,
    receiptUrl.trim(),
    senderName,
    senderAccount,
    notes
  );

  if (!result.success) {
    return res.status(400).json(result);
  }

  // Sync to Firestore
  try {
    const paymentDocRef = doc(db, 'payments', paymentId);
    await setDoc(
      paymentDocRef,
      {
        proofUrl: receiptUrl.trim(),
        status: 'PENDING_VERIFICATION',
        submittedAt: new Date().toISOString(),
        rejectionReason: null,
      },
      { merge: true }
    );
  } catch (fsErr) {
    console.warn('[Firestore Sync Warning on Resubmit Payment]:', fsErr);
  }

  res.json(result);
});

// Fetch user's own transactions & active verification state
app.get('/api/membership/my-transactions', requireAuth, (req: AuthRequest, res) => {
  const uid = req.userUid!;
  const userPayments = AdminStore.getPayments().filter((p) => p.userId === uid);
  const activePending = userPayments.find(
    (p) => p.status === 'PENDING_VERIFICATION' || p.status === 'PENDING'
  );
  const latestPayment = userPayments[0] || null;

  res.json({
    payments: userPayments,
    activePending: activePending || null,
    latestPayment,
  });
});

// Acknowledge approval & open VIP features directly
app.post('/api/membership/acknowledge-approval', requireAuth, async (req: AuthRequest, res) => {
  const uid = req.userUid!;
  const { paymentId } = req.body;
  const sub = subscriptionStore.get(uid);
  const now = Date.now();
  const isVipActive = sub && (sub.tier === 'VIP' || sub.tier === 'VVIP') && sub.status === 'ACTIVE' && sub.expiresAt > now;

  // Persist acknowledgment on the user's approved payment so it does not reappear after refresh
  if (paymentId) {
    const ackResult = AdminStore.acknowledgePayment(paymentId, uid);
    if (!ackResult.success && ackResult.error !== 'NOT_FOUND') {
      console.warn('[Acknowledge Warning]:', ackResult.error);
    }

    try {
      const paymentDocRef = doc(db, 'payments', paymentId);
      await setDoc(
        paymentDocRef,
        {
          acknowledgedAt: ackResult.acknowledgedAt || null,
          updatedAt: firestoreTimestamp(),
        },
        { merge: true }
      );
    } catch (fsErr) {
      console.warn('[Firestore Sync Warning on Acknowledge]:', fsErr);
    }
  }

  res.json({
    success: true,
    isVipActive: Boolean(isVipActive),
    subscription: sub || null,
    message: 'Status membership VIP telah diverifikasi dan dibuka.',
    acknowledged: true,
  });
});

// --- API ERROR CONTRACT ---
// Semua error /api/* dikembalikan sebagai JSON konsisten, bukan HTML.
// Express 4 tidak menangkap promise reject dari handler async, jadi handler ini penting.
app.use('/api', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API_NOT_FOUND',
    message: `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan.`,
  });
});

app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  if (!req.originalUrl.startsWith('/api')) {
    return res.status(500).send('Internal Server Error');
  }
  const status = Number(err?.status || err?.statusCode) || 500;
  console.error(`[API ERROR] ${req.method} ${req.originalUrl}:`, err?.message || err);
  if (res.headersSent) return;
  res.status(status).json({
    success: false,
    error: status === 500 ? 'INTERNAL_ERROR' : 'REQUEST_FAILED',
    message: status === 500 ? 'Terjadi kesalahan pada server.' : err?.message || 'Permintaan gagal.',
  });
});

// Mount Vite or serve static
async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`ZynderJhnzV1Beta Server running on http://0.0.0.0:${PORT}`);
  });
}

// Export Express app for serverless/Vercel usage (api/index.ts)
export { app };

// Only start the standalone HTTP server when run directly, not on Vercel
if (!process.env.VERCEL && !process.env.NOW_REGION) {
  startServer();
}
