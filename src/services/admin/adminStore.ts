import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Types
export interface AdminUser {
  username: string;
  role: 'SUPER_ADMIN';
  lastLoginAt?: string;
}

export interface AdminSession {
  token: string;
  username: string;
  expiresAt: number;
  ip?: string;
  userAgent?: string;
}

export type PaymentStatus = 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED' | 'PENDING';

export interface PaymentProofHistoryItem {
  receiptUrl: string;
  submittedAt: string;
  senderName?: string;
  senderAccount?: string;
  notes?: string;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  tier: 'VIP' | 'VVIP';
  package?: string; // Alias matching prompt spec
  amount: number;
  currency: string;
  durationDays: number;
  method: 'QRIS_MANUAL' | 'QRIS_INSTANT' | 'BANK_TRANSFER' | 'E_WALLET';
  receiptUrl?: string; // Image base64 data url or public URL
  proofUrl?: string; // Alias matching prompt spec
  senderName?: string;
  senderAccount?: string;
  notes?: string;
  status: PaymentStatus;
  rejectionReason?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectedBy?: string | null;
  rejectedAt?: string | null;
  submittedAt?: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  proofHistory?: PaymentProofHistoryItem[];
  telegramNotificationStatus?: 'SENT' | 'FAILED' | 'PENDING';
  telegramError?: string;
  acknowledgedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TelegramConfig {
  botToken: string;
  adminChatId: string;
  isActive: boolean;
  botUsername?: string;
  lastTestedAt?: string;
  lastError?: string;
}

export interface SystemSettings {
  siteName: string;
  siteDescription: string;
  qrisImageUrl: string; // Base64 or image URL
  qrisManualActive: boolean;
  qiospayActive: boolean;
  vipPrice: number;
  vipDurationDays: number;
  adminWorkingHours: string; // Admin working hours for SLA
  whatsappChannelUrl: string;
  whatsappGroupUrl: string;
  adminWhatsappUrl: string;
  adminTelegramUrl: string;
  customerServiceUrl: string;
  announcementActive: boolean;
  announcementText: string;
  announcementType: 'info' | 'warning' | 'promo';
  maintenanceMode: boolean;
  maintenanceMessage: string;
  updatedAt: string;
  updatedBy: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  details: string;
  ip?: string;
  previousData?: any;
  newData?: any;
}

// In-Memory Persistent Data Store with JSON File Fallback
// Jangan melempar error saat import. Di Vercel, filesystem read-only: data hanya dimuat
// jika ada, dan penulisan gagal secara tertangani (sudah dibungkus try/catch di saveToFile).
const DATA_DIR = path.resolve(process.cwd(), 'data');
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (err) {
  console.warn('[AdminStore] Folder data tidak dapat dibuat:', (err as Error).message);
}

const ADMIN_STORE_FILE = path.join(DATA_DIR, 'admin_data.json');

interface StoredData {
  adminPasswordHash: string;
  telegramConfig: TelegramConfig;
  settings: SystemSettings;
  payments: PaymentRecord[];
  auditLogs: AuditLogItem[];
}

// Default initial password hash for "JhnzV1Beta" (overridden by ADMIN_PASSWORD_HASH env var)
const DEFAULT_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || bcrypt.hashSync('JhnzV1Beta', 10);

const DEFAULT_SETTINGS: SystemSettings = {
  siteName: 'ZynderJhnzV1Beta',
  siteDescription: 'Platform WhatsApp Automation & Broadcast Canggih Berbasis Multi-Session Gateway',
  qrisImageUrl: '', // Default empty; uses standard QRIS code or custom uploaded image
  qrisManualActive: true,
  qiospayActive: false,
  vipPrice: 10000,
  vipDurationDays: 30,
  adminWorkingHours: 'Senin - Minggu: 08:00 - 22:00 WIB',
  whatsappChannelUrl: 'https://whatsapp.com/channel/zynderjhnz',
  whatsappGroupUrl: 'https://chat.whatsapp.com/zynderjhnzsupport',
  adminWhatsappUrl: 'https://wa.me/6281234567890',
  adminTelegramUrl: 'https://t.me/zynderjhnz_admin',
  customerServiceUrl: 'https://wa.me/6281234567890?text=Halo%20Admin%20ZynderJhnz',
  announcementActive: true,
  announcementText: '🚀 ZynderJhnzV1Beta kini mendukung Group Member DM Broadcast dan integrasi multi-sesi WhatsApp!',
  announcementType: 'promo',
  maintenanceMode: false,
  maintenanceMessage: 'Sistem sedang dalam peningkatan performa berkala. Silakan kembali beberapa saat lagi.',
  updatedAt: new Date().toISOString(),
  updatedBy: 'System',
};

const DEFAULT_TELEGRAM_CONFIG: TelegramConfig = {
  botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  adminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID || '',
  isActive: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ADMIN_CHAT_ID),
};

// Seed initial payments to demonstrate dashboard and approval features immediately
const SEED_PAYMENTS: PaymentRecord[] = [
  {
    id: 'INV-20261102-001',
    userId: 'usr_sample_101',
    userName: 'Budi Pratama',
    userEmail: 'budi.pratama@gmail.com',
    tier: 'VIP',
    amount: 10000,
    currency: 'IDR',
    durationDays: 30,
    method: 'QRIS_MANUAL',
    senderName: 'Budi Pratama',
    senderAccount: 'BCA 8291029182',
    status: 'PENDING_VERIFICATION',
    package: 'VIP',
    submittedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'INV-20261102-002',
    userId: 'usr_sample_102',
    userName: 'Siti Rahmawati',
    userEmail: 'siti.rahma@yahoo.com',
    tier: 'VIP',
    amount: 10000,
    currency: 'IDR',
    durationDays: 30,
    method: 'QRIS_INSTANT',
    senderName: 'Siti Rahmawati',
    senderAccount: 'GoPay 081299887766',
    notes: 'Pembayaran QRIS instan otomatis',
    status: 'APPROVED',
    approvedBy: 'JhnzV1Beta',
    approvedAt: new Date(Date.now() - 86400000).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 1.1).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'INV-20261101-003',
    userId: 'usr_sample_103',
    userName: 'Ahmad Fauzi',
    userEmail: 'ahmad.fauzi@outlook.com',
    tier: 'VIP',
    amount: 10000,
    currency: 'IDR',
    durationDays: 30,
    method: 'BANK_TRANSFER',
    senderName: 'Ahmad Fauzi',
    senderAccount: 'Mandiri 14000998811',
    notes: 'Transfer manual ATM',
    status: 'APPROVED',
    approvedBy: 'JhnzV1Beta',
    approvedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 2.1).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

class AdminStoreService {
  private adminPasswordHash: string = DEFAULT_PASSWORD_HASH;
  private telegramConfig: TelegramConfig = { ...DEFAULT_TELEGRAM_CONFIG };
  private settings: SystemSettings = { ...DEFAULT_SETTINGS };
  private payments: Map<string, PaymentRecord> = new Map();
  private auditLogs: AuditLogItem[] = [];
  private activeSessions: Map<string, AdminSession> = new Map();

  // Brute force protection: IP -> { attempts: number, lockUntil: number }
  private loginRateLimiter: Map<string, { attempts: number; lockUntil: number }> = new Map();

  constructor() {
    this.loadFromFile();
    if (this.payments.size === 0) {
      SEED_PAYMENTS.forEach((p) => this.payments.set(p.id, p));
      this.saveToFile();
    }
  }

  private loadFromFile() {
    try {
      if (fs.existsSync(ADMIN_STORE_FILE)) {
        const raw = fs.readFileSync(ADMIN_STORE_FILE, 'utf-8');
        const data: StoredData = JSON.parse(raw);
        if (data.adminPasswordHash) this.adminPasswordHash = data.adminPasswordHash;
        if (data.telegramConfig) this.telegramConfig = { ...DEFAULT_TELEGRAM_CONFIG, ...data.telegramConfig };
        if (data.settings) this.settings = { ...DEFAULT_SETTINGS, ...data.settings };
        if (Array.isArray(data.payments)) {
          data.payments.forEach((p) => this.payments.set(p.id, p));
        }
        if (Array.isArray(data.auditLogs)) {
          this.auditLogs = data.auditLogs;
        }
      }
    } catch (err) {
      console.error('[AdminStore] Failed to load data from file:', err);
    }
  }

  private saveToFile() {
    try {
      const data: StoredData = {
        adminPasswordHash: this.adminPasswordHash,
        telegramConfig: this.telegramConfig,
        settings: this.settings,
        payments: Array.from(this.payments.values()),
        auditLogs: this.auditLogs.slice(-1000), // Keep last 1000 logs
      };
      fs.writeFileSync(ADMIN_STORE_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[AdminStore] Failed to save data to file:', err);
    }
  }

  // --- RATE LIMITING ---
  checkRateLimit(ip: string): { allowed: boolean; remainingAttempts: number; retryAfterSec?: number } {
    const now = Date.now();
    const entry = this.loginRateLimiter.get(ip);
    if (!entry) {
      return { allowed: true, remainingAttempts: 5 };
    }

    if (entry.lockUntil > now) {
      const retryAfterSec = Math.ceil((entry.lockUntil - now) / 1000);
      return { allowed: false, remainingAttempts: 0, retryAfterSec };
    }

    // Reset lock if expired
    if (entry.lockUntil > 0 && entry.lockUntil <= now) {
      this.loginRateLimiter.delete(ip);
      return { allowed: true, remainingAttempts: 5 };
    }

    const remaining = Math.max(0, 5 - entry.attempts);
    return { allowed: remaining > 0, remainingAttempts: remaining };
  }

  recordLoginAttempt(ip: string, success: boolean) {
    const now = Date.now();
    let entry = this.loginRateLimiter.get(ip) || { attempts: 0, lockUntil: 0 };

    if (success) {
      this.loginRateLimiter.delete(ip);
      return;
    }

    entry.attempts += 1;
    if (entry.attempts >= 5) {
      // Lock for 15 minutes
      entry.lockUntil = now + 15 * 60 * 1000;
    }
    this.loginRateLimiter.set(ip, entry);
  }

  // --- AUTHENTICATION ---
  verifyCredentials(username: string, passwordPlain: string): boolean {
    const envAdminUser = process.env.ADMIN_USERNAME || 'JhnzV1Beta';
    if (username !== envAdminUser) {
      return false;
    }
    return bcrypt.compareSync(passwordPlain, this.adminPasswordHash);
  }

  createSession(username: string, ip?: string, userAgent?: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    this.activeSessions.set(token, {
      token,
      username,
      expiresAt,
      ip,
      userAgent,
    });
    this.logAction('LOGIN', username, `Admin ${username} berhasil masuk ke Admin Panel.`, ip);
    return token;
  }

  validateSession(token: string): AdminSession | null {
    if (!token) return null;
    const session = this.activeSessions.get(token);
    if (!session) return null;
    if (session.expiresAt < Date.now()) {
      this.activeSessions.delete(token);
      return null;
    }
    return session;
  }

  destroySession(token: string, ip?: string): boolean {
    const session = this.activeSessions.get(token);
    if (session) {
      this.logAction('LOGOUT', session.username, `Admin ${session.username} keluar dari Admin Panel.`, ip);
      this.activeSessions.delete(token);
      return true;
    }
    return false;
  }

  changePassword(oldPasswordPlain: string, newPasswordPlain: string, actor: string, ip?: string): boolean {
    if (!bcrypt.compareSync(oldPasswordPlain, this.adminPasswordHash)) {
      return false;
    }
    this.adminPasswordHash = bcrypt.hashSync(newPasswordPlain, 10);
    this.saveToFile();
    this.logAction('CHANGE_PASSWORD', actor, 'Kata sandi Admin berhasil diubah.', ip);
    return true;
  }

  // --- AUDIT LOGS ---
  logAction(action: string, actor: string, details: string, ip?: string, previousData?: any, newData?: any) {
    const item: AuditLogItem = {
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      action,
      actor,
      details,
      ip: ip || '127.0.0.1',
      previousData,
      newData,
    };
    this.auditLogs.unshift(item);
    if (this.auditLogs.length > 1000) {
      this.auditLogs.pop();
    }
    this.saveToFile();
  }

  getAuditLogs(limit: number = 200): AuditLogItem[] {
    return this.auditLogs.slice(0, limit);
  }

  // --- SETTINGS ---
  getSettings(): SystemSettings {
    return { ...this.settings };
  }

  updateSettings(updates: Partial<SystemSettings>, actor: string, ip?: string): SystemSettings {
    const prev = { ...this.settings };
    this.settings = {
      ...this.settings,
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: actor,
    };
    this.saveToFile();
    this.logAction('UPDATE_SETTINGS', actor, 'Pengaturan website & pembayaran diperbarui.', ip, prev, this.settings);
    return this.settings;
  }

  // --- TELEGRAM CONFIG ---
  getTelegramConfig(): TelegramConfig {
    return { ...this.telegramConfig };
  }

  updateTelegramConfig(config: Partial<TelegramConfig>, actor: string, ip?: string): TelegramConfig {
    this.telegramConfig = {
      ...this.telegramConfig,
      ...config,
      isActive: Boolean(config.botToken && config.adminChatId),
    };
    this.saveToFile();
    this.logAction('UPDATE_TELEGRAM_CONFIG', actor, 'Konfigurasi Telegram Bot diperbarui.', ip);
    return this.telegramConfig;
  }

  async sendTelegramMessage(text: string, replyMarkup?: any): Promise<{ success: boolean; error?: string }> {
    if (!this.telegramConfig.botToken || !this.telegramConfig.adminChatId) {
      return { success: false, error: 'Telegram Bot Token atau Chat ID belum dikonfigurasi.' };
    }

    try {
      const url = `https://api.telegram.org/bot${this.telegramConfig.botToken}/sendMessage`;
      const body: any = {
        chat_id: this.telegramConfig.adminChatId,
        text,
        parse_mode: 'HTML',
      };
      if (replyMarkup) {
        body.reply_markup = replyMarkup;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!data.ok) {
        return { success: false, error: data.description || 'Gagal mengirim pesan ke Telegram' };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Koneksi ke server Telegram gagal.' };
    }
  }

  async sendTelegramPhoto(
    caption: string,
    photoDataUrlOrUrl?: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.telegramConfig.botToken || !this.telegramConfig.adminChatId) {
      return { success: false, error: 'Telegram Bot Token atau Chat ID belum dikonfigurasi.' };
    }

    try {
      // 1. If photo is a Base64 Data URL, extract buffer and send via multipart FormData
      if (photoDataUrlOrUrl && photoDataUrlOrUrl.startsWith('data:image/')) {
        const matches = photoDataUrlOrUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          const buffer = Buffer.from(base64Data, 'base64');
          const ext = mimeType.split('/')[1] || 'jpg';
          const filename = `bukti_transfer_${Date.now()}.${ext}`;

          const formData = new FormData();
          formData.append('chat_id', this.telegramConfig.adminChatId);
          formData.append('caption', caption);
          formData.append('parse_mode', 'HTML');
          const blob = new Blob([buffer], { type: mimeType });
          formData.append('photo', blob, filename);

          const res = await fetch(`https://api.telegram.org/bot${this.telegramConfig.botToken}/sendPhoto`, {
            method: 'POST',
            body: formData,
          });
          const data = await res.json();
          if (!data.ok) {
            console.warn('[Telegram sendPhoto Error]:', data.description);
            // Fallback to text message
            return this.sendTelegramMessage(caption);
          }
          return { success: true };
        }
      }

      // 2. If photo is an HTTP / HTTPS link
      if (photoDataUrlOrUrl && (photoDataUrlOrUrl.startsWith('http://') || photoDataUrlOrUrl.startsWith('https://'))) {
        const res = await fetch(`https://api.telegram.org/bot${this.telegramConfig.botToken}/sendPhoto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.telegramConfig.adminChatId,
            photo: photoDataUrlOrUrl,
            caption,
            parse_mode: 'HTML',
          }),
        });
        const data = await res.json();
        if (!data.ok) {
          console.warn('[Telegram sendPhoto URL Error]:', data.description);
          return this.sendTelegramMessage(caption);
        }
        return { success: true };
      }

      // 3. Fallback: text-only message
      return this.sendTelegramMessage(caption);
    } catch (err: any) {
      console.warn('[Telegram sendPhoto Exception]:', err.message);
      // Fallback to text message
      return this.sendTelegramMessage(caption);
    }
  }

  async notifyNewPayment(payment: PaymentRecord): Promise<{ success: boolean; error?: string }> {
    if (!this.telegramConfig.isActive || !this.telegramConfig.botToken || !this.telegramConfig.adminChatId) {
      payment.telegramNotificationStatus = 'PENDING';
      payment.telegramError = 'Telegram Bot belum dikonfigurasikan atau tidak aktif.';
      this.saveToFile();
      return { success: false, error: payment.telegramError };
    }

    const formattedDate = new Date(payment.submittedAt || payment.createdAt).toLocaleString('id-ID', {
      dateStyle: 'full',
      timeStyle: 'medium',
    });

    // Format strictly conforming to user requirement specification
    const caption = `📥 <b>BUKTI TRANSFER BARU</b>\n\n` +
      `👤 <b>Pengguna:</b> ${payment.userEmail}\n` +
      `🆔 <b>UID:</b> <code>${payment.userId}</code>\n` +
      `💎 <b>Paket:</b> ${payment.package || payment.tier} (${payment.durationDays} Hari)\n` +
      `💰 <b>Nominal:</b> Rp ${payment.amount.toLocaleString('id-ID')}\n` +
      `🧾 <b>ID Transaksi:</b> <code>${payment.id}</code>\n` +
      `📅 <b>Waktu:</b> ${formattedDate}\n\n` +
      `📷 <b>Bukti Transfer:</b>\n` +
      `<i>(Foto bukti transfer terlampir di atas)</i>\n\n` +
      `<b>Status:</b> MENUNGGU VERIFIKASI\n\n` +
      `Silakan periksa bukti transfer melalui Admin Panel website ZynderJhnzV1Beta.`;

    const result = await this.sendTelegramPhoto(caption, payment.receiptUrl || payment.proofUrl);

    if (result.success) {
      payment.telegramNotificationStatus = 'SENT';
      payment.telegramError = undefined;
    } else {
      payment.telegramNotificationStatus = 'FAILED';
      payment.telegramError = result.error;
    }
    this.saveToFile();
    return result;
  }

  async retryTelegramNotification(id: string): Promise<{ success: boolean; message: string }> {
    const payment = this.payments.get(id);
    if (!payment) {
      return { success: false, message: 'Transaksi tidak ditemukan.' };
    }
    const result = await this.notifyNewPayment(payment);
    if (result.success) {
      return { success: true, message: 'Notifikasi bukti transfer berhasil dikirimkan ulang ke Telegram admin.' };
    }
    return { success: false, message: `Gagal mengirim ulang ke Telegram: ${result.error}` };
  }

  // --- PAYMENTS MANAGEMENT ---
  getPayments(): PaymentRecord[] {
    return Array.from(this.payments.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getPaymentById(id: string): PaymentRecord | undefined {
    return this.payments.get(id);
  }

  createPayment(payment: Omit<PaymentRecord, 'status' | 'createdAt' | 'updatedAt'>): PaymentRecord {
    const nowIso = new Date().toISOString();
    const record: PaymentRecord = {
      ...payment,
      package: payment.package || payment.tier || 'VIP',
      proofUrl: payment.proofUrl || payment.receiptUrl || '',
      receiptUrl: payment.receiptUrl || payment.proofUrl || '',
      status: 'PENDING_VERIFICATION',
      submittedAt: payment.submittedAt || nowIso,
      reviewedAt: null,
      reviewedBy: null,
      rejectionReason: null,
      proofHistory: [],
      telegramNotificationStatus: 'PENDING',
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    this.payments.set(record.id, record);
    this.saveToFile();
    // Trigger Telegram notification
    this.notifyNewPayment(record).catch((e) => console.error('[Telegram Notify Error]:', e));
    return record;
  }

  resubmitPaymentProof(
    id: string,
    newReceiptUrl: string,
    senderName?: string,
    senderAccount?: string,
    notes?: string
  ): { success: boolean; payment?: PaymentRecord; message: string } {
    const payment = this.payments.get(id);
    if (!payment) {
      return { success: false, message: 'Transaksi pembayaran tidak ditemukan.' };
    }
    if (payment.status === 'APPROVED') {
      return { success: false, message: 'Transaksi yang sudah disetujui tidak perlu diunggah ulang.' };
    }

    const nowIso = new Date().toISOString();
    if (!payment.proofHistory) {
      payment.proofHistory = [];
    }
    if (payment.receiptUrl || payment.proofUrl) {
      payment.proofHistory.unshift({
        receiptUrl: payment.receiptUrl || payment.proofUrl || '',
        submittedAt: payment.submittedAt || payment.updatedAt || nowIso,
        senderName: payment.senderName,
        senderAccount: payment.senderAccount,
        notes: payment.notes,
      });
    }

    payment.receiptUrl = newReceiptUrl;
    payment.proofUrl = newReceiptUrl;
    if (senderName) payment.senderName = senderName;
    if (senderAccount) payment.senderAccount = senderAccount;
    if (notes !== undefined) payment.notes = notes;
    payment.status = 'PENDING_VERIFICATION';
    payment.rejectionReason = null;
    payment.submittedAt = nowIso;
    payment.updatedAt = nowIso;
    payment.telegramNotificationStatus = 'PENDING';

    this.payments.set(id, payment);
    this.saveToFile();

    this.logAction(
      'RESUBMIT_PAYMENT_PROOF',
      payment.userName,
      `Pengguna mengunggah ulang bukti transfer untuk transaksi ${payment.id}. Status kembali menjadi PENDING_VERIFICATION.`,
      undefined,
      { status: 'REJECTED' },
      { status: 'PENDING_VERIFICATION' }
    );

    // Resend Telegram notification with new proof photo
    this.notifyNewPayment(payment).catch((e) => console.error('[Telegram Resubmit Notify Error]:', e));

    return {
      success: true,
      payment,
      message: 'Bukti transfer terbaru berhasil dikirim. Status kembali menjadi PENDING_VERIFICATION.',
    };
  }

  approvePayment(id: string, actor: string, ip?: string): { success: boolean; payment?: PaymentRecord; message: string } {
    const payment = this.payments.get(id);
    if (!payment) {
      return { success: false, message: 'Transaksi pembayaran tidak ditemukan.' };
    }

    if (payment.status === 'APPROVED') {
      return { success: false, payment, message: 'Transaksi ini telah disetujui sebelumnya (Idempotent).' };
    }

    const nowIso = new Date().toISOString();
    payment.status = 'APPROVED';
    payment.approvedBy = actor;
    payment.approvedAt = nowIso;
    payment.reviewedAt = nowIso;
    payment.reviewedBy = actor;
    payment.updatedAt = nowIso;

    this.payments.set(id, payment);
    this.saveToFile();

    this.logAction(
      'APPROVE_PAYMENT',
      actor,
      `Pembayaran ${payment.id} untuk user ${payment.userName} (${payment.userEmail}) sebesar Rp ${payment.amount.toLocaleString('id-ID')} disetujui.`,
      ip,
      { status: 'PENDING_VERIFICATION' },
      { status: 'APPROVED', approvedBy: actor }
    );

    // Send confirmation to Telegram without buttons
    if (this.telegramConfig.isActive) {
      this.sendTelegramMessage(
        `✅ <b>PEMBAYARAN DISETUJUI</b>\n\nID: <code>${payment.id}</code>\nPengguna: ${payment.userName} (${payment.userEmail})\nStatus: VIP Aktif (${payment.durationDays} hari)\nDisetujui oleh: ${actor} di Admin Panel`
      ).catch(() => {});
    }

    return { success: true, payment, message: 'Pembayaran berhasil disetujui dan status VIP diaktifkan.' };
  }

  rejectPayment(id: string, reason: string, actor: string, ip?: string): { success: boolean; payment?: PaymentRecord; message: string } {
    const payment = this.payments.get(id);
    if (!payment) {
      return { success: false, message: 'Transaksi pembayaran tidak ditemukan.' };
    }

    if (payment.status === 'APPROVED') {
      return { success: false, message: 'Transaksi yang sudah disetujui tidak dapat ditolak.' };
    }

    const nowIso = new Date().toISOString();
    payment.status = 'REJECTED';
    payment.rejectionReason = reason || 'Bukti transfer tidak valid atau belum masuk ke rekening.';
    payment.rejectedBy = actor;
    payment.rejectedAt = nowIso;
    payment.reviewedAt = nowIso;
    payment.reviewedBy = actor;
    payment.updatedAt = nowIso;

    this.payments.set(id, payment);
    this.saveToFile();

    this.logAction(
      'REJECT_PAYMENT',
      actor,
      `Pembayaran ${payment.id} untuk user ${payment.userName} ditolak dengan alasan: "${payment.rejectionReason}".`,
      ip,
      { status: 'PENDING_VERIFICATION' },
      { status: 'REJECTED', reason: payment.rejectionReason }
    );

    // Send confirmation to Telegram without buttons
    if (this.telegramConfig.isActive) {
      this.sendTelegramMessage(
        `❌ <b>PEMBAYARAN DITOLAK</b>\n\nID: <code>${payment.id}</code>\nPengguna: ${payment.userName} (${payment.userEmail})\nAlasan: ${payment.rejectionReason}\nDitolak oleh: ${actor} di Admin Panel`
      ).catch(() => {});
    }

    return { success: true, payment, message: 'Pembayaran berhasil ditolak.' };
  }

  // Acknowledge payment approval (marks payment as acknowledged by user so notification does not reappear)
  acknowledgePayment(id: string, userId: string): { success: boolean; acknowledgedAt?: string | null; error?: string } {
    const payment = this.payments.get(id);
    if (!payment) {
      return { success: false, error: 'NOT_FOUND', acknowledgedAt: null };
    }
    if (payment.userId !== userId) {
      return { success: false, error: 'FORBIDDEN', acknowledgedAt: null };
    }
    if (payment.status !== 'APPROVED') {
      return { success: false, error: 'NOT_APPROVED', acknowledgedAt: null };
    }
    if (payment.acknowledgedAt) {
      return { success: true, acknowledgedAt: payment.acknowledgedAt };
    }

    const nowIso = new Date().toISOString();
    payment.acknowledgedAt = nowIso;
    payment.updatedAt = nowIso;
    this.payments.set(id, payment);
    this.saveToFile();

    this.logAction(
      'ACKNOWLEDGE_PAYMENT',
      payment.userName,
      `Pengguna mengakui persetujuan pembayaran ${payment.id}. Notifikasi tidak akan muncul kembali.`,
      undefined,
      { acknowledgedAt: null },
      { acknowledgedAt: nowIso }
    );

    return { success: true, acknowledgedAt: nowIso };
  }
}

export const AdminStore = new AdminStoreService();
