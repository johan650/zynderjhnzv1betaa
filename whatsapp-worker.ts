/**
 * WhatsApp Worker — proses Node.js PERSISTEN terpisah dari Vercel.
 *
 * Mengapa terpisah: library Baileys membuka WebSocket ke server WhatsApp dan
 * menyimpan session di disk. Vercel Functions bersifat stateless dan
 * filesystem-nya read-only, sehingga tidak dapat menjalankan koneksi ini.
 *
 * Jalankan: npx tsx whatsapp-worker.ts
 *
 * Env wajib:
 *   WHATSAPP_WORKER_SECRET   rahasia bersama dengan API publik (Vercel)
 *   WHATSAPP_SESSIONS_DIR    folder session yang persisten (volume), mis. /data/sessions
 * Env opsional:
 *   WHATSAPP_WORKER_PORT     default 4000
 */
import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import crypto from 'crypto';
import { WhatsAppManager } from './src/services/whatsapp/WhatsAppManager.ts';

const PORT = Number(process.env.WHATSAPP_WORKER_PORT) || 4000;
const SECRET = process.env.WHATSAPP_WORKER_SECRET || '';

if (SECRET.length < 32) {
  console.error('[WORKER] WHATSAPP_WORKER_SECRET wajib diisi (minimal 32 karakter). Worker tidak dijalankan.');
  process.exit(1);
}

// Bandingkan secret dengan waktu konstan
const secretOk = (given: unknown): boolean => {
  if (typeof given !== 'string') return false;
  const a = Buffer.from(given);
  const b = Buffer.from(SECRET);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const app = express();
app.use(express.json({ limit: '1mb' }));

// Semua request wajib membawa secret. UID diambil dari header proxy (sudah diverifikasi oleh API publik).
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/healthz') return next();
  if (!secretOk(req.headers['x-worker-secret'])) {
    return res.status(401).json({ success: false, error: 'WORKER_UNAUTHORIZED', message: 'Akses worker ditolak.' });
  }
  const uid = req.headers['x-user-uid'];
  if (typeof uid !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(uid)) {
    return res.status(400).json({ success: false, error: 'INVALID_UID', message: 'UID pengguna tidak valid.' });
  }
  (req as any).uid = uid;
  next();
});

app.get('/healthz', (_req, res) => res.json({ success: true, status: 'ok' }));

app.get('/api/whatsapp/capabilities', (req, res) => {
  res.json({ capabilities: WhatsAppManager.getCapabilities((req as any).uid) });
});

app.get('/api/whatsapp/status', async (req, res) => {
  const status = await WhatsAppManager.getStatus((req as any).uid);
  res.json({ success: true, status });
});

app.get('/api/whatsapp/events', async (req, res) => {
  const uid = (req as any).uid as string;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (state: unknown) => res.write(`data: ${JSON.stringify(state)}\n\n`);
  send(await WhatsAppManager.getStatus(uid));
  WhatsAppManager.addListener(uid, send);
  const heartbeat = setInterval(() => res.write(': keepalive\n\n'), 20000);
  req.on('close', () => {
    clearInterval(heartbeat);
    WhatsAppManager.removeListener(uid, send);
  });
});

app.post('/api/whatsapp/connect', async (req, res) => {
  const uid = (req as any).uid as string;
  const { provider } = req.body || {};
  if (provider === 'cloud_api' || provider === 'gateway') WhatsAppManager.setProvider(uid, provider);
  const session = await WhatsAppManager.initConnection(uid);
  res.json({ success: true, session });
});

app.post('/api/whatsapp/request-pairing', async (req, res) => {
  const uid = (req as any).uid as string;
  const phoneNumber = String(req.body?.phoneNumber || '');
  if (phoneNumber.replace(/\D/g, '').length < 10) {
    return res.status(400).json({
      success: false,
      error: 'INVALID_PHONE',
      message: 'Nomor WhatsApp tidak valid. Masukkan nomor minimal 10 digit (contoh: 08123456789).',
    });
  }
  try {
    const pairingCode = await WhatsAppManager.requestPairingCode(uid, phoneNumber);
    res.json({ success: true, pairingCode, message: 'Kode pairing diterima dari server WhatsApp.' });
  } catch (err: any) {
    res.status(502).json({
      success: false,
      error: 'PAIRING_FAILED',
      message: err?.message || 'Gagal meminta kode pairing dari WhatsApp.',
    });
  }
});

app.post('/api/whatsapp/reconnect', async (req, res) => {
  const session = await WhatsAppManager.reconnect((req as any).uid);
  res.json({ success: true, session });
});

app.post('/api/whatsapp/disconnect', async (req, res) => {
  const result = await WhatsAppManager.disconnect((req as any).uid);
  res.json({ ...result });
});

app.post('/api/whatsapp/reset', async (req, res) => {
  const result = await WhatsAppManager.resetSession((req as any).uid);
  res.json({ ...result });
});

app.get('/api/whatsapp/groups', async (req, res) => {
  const groups = await WhatsAppManager.getGroups((req as any).uid);
  res.json({ success: true, groups });
});

// Error handler: selalu JSON
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[WORKER ERROR]', err?.message || err);
  if (res.headersSent) return;
  res.status(500).json({ success: false, error: 'WORKER_INTERNAL_ERROR', message: 'Terjadi kesalahan pada worker WhatsApp.' });
});

// Jangan biarkan error Baileys yang tak tertangani mematikan worker
process.on('unhandledRejection', (reason: any) => {
  console.error('[WORKER] unhandledRejection:', reason?.message || reason);
});

http.createServer(app).listen(PORT, '0.0.0.0', () => {
  console.log(`[WORKER] WhatsApp worker berjalan di http://0.0.0.0:${PORT}`);
});
