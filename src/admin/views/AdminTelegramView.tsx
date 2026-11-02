import React, { useState, useEffect } from 'react';
import {
  Send,
  Shield,
  Key,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Save,
  Loader2,
  Bot,
  Terminal,
} from 'lucide-react';
import { adminApi } from '../services/adminApi';
import { TelegramConfigData } from '../types';

interface AdminTelegramViewProps {
  onShowToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export const AdminTelegramView: React.FC<AdminTelegramViewProps> = ({ onShowToast }) => {
  const [config, setConfig] = useState<TelegramConfigData>({
    botToken: '',
    adminChatId: '',
    isActive: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    adminApi
      .getTelegramConfig()
      .then((data) => setConfig(data))
      .catch((err) => onShowToast('error', err.message || 'Gagal memuat konfigurasi Telegram.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await adminApi.updateTelegramConfig(config);
      setConfig(res.config);
      onShowToast('success', res.message, 'Pengaturan Disimpan');
    } catch (err: any) {
      onShowToast('error', err.message || 'Gagal menyimpan konfigurasi Telegram.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestBot = async () => {
    if (!config.botToken || !config.adminChatId) {
      onShowToast('error', 'Bot Token dan Admin Chat ID wajib diisi terlebih dahulu.');
      return;
    }
    setTesting(true);
    try {
      const res = await adminApi.testTelegramBot();
      onShowToast('success', res.message, 'Pesan Uji Coba Terkirim');
    } catch (err: any) {
      onShowToast('error', err.message || 'Uji coba bot Telegram gagal.');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400 space-y-3">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        <span className="text-xs">Memuat konfigurasi integrasi Telegram...</span>
      </div>
    );
  }

  const isConnected = Boolean(config.isActive && config.botToken && config.adminChatId);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Send className="w-5 h-5 text-cyan-400" />
            <span>Integrasi Telegram Bot & Inline Approve</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Kirimkan notifikasi pembayaran baru langsung ke akun Telegram Admin dengan tombol inline Approve & Reject.
          </p>
        </div>

        {/* Connection Status Badge */}
        <div
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-2 border self-start ${
            isConnected
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
          <span>Status Bot: {isConnected ? 'AKTIF & TERHUBUNG' : 'TIDAK AKTIF / BELUM LENGKAP'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Configuration (2 Cols) */}
        <div className="lg:col-span-2 rounded-3xl bg-[#0a0f1d] border border-slate-800 p-6 space-y-6">
          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Telegram Bot Token</span>
                <span className="text-[10px] text-slate-500">Dapatkan dari @BotFather</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={config.botToken}
                  onChange={(e) => setConfig({ ...config, botToken: e.target.value })}
                  placeholder="Contoh: 123456789:ABCdefGhIJKlmNoPQRstuVWXyz..."
                  className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Admin Telegram Chat ID</span>
                <span className="text-[10px] text-slate-500">ID akun Telegram admin (contoh via @userinfobot)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={config.adminChatId}
                  onChange={(e) => setConfig({ ...config, adminChatId: e.target.value })}
                  placeholder="Contoh: 123456789 atau -100xxxxxxxx"
                  className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white shadow-lg shadow-cyan-500/20 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Simpan Konfigurasi Bot</span>
              </button>

              <button
                type="button"
                onClick={handleTestBot}
                disabled={testing || !config.botToken || !config.adminChatId}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
              >
                {testing ? <Loader2 className="w-4 h-4 animate-spin text-cyan-400" /> : <Send className="w-4 h-4 text-cyan-400" />}
                <span>Kirim Pesan Uji Coba (Test Bot)</span>
              </button>
            </div>
          </form>

          {/* Architecture note */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-200">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span>Validasi Identitas Admin Telegram Ketat</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Tindakan Approve & Reject melalui inline button Telegram memanggil endpoint backend yang sama dengan tombol di website.
              Server memvalidasi <code>from.id</code> pengirim Telegram secara mutlak terhadap <code>Admin Chat ID</code> yang terdaftar agar tidak ada pihak luar yang dapat memanipulasi persetujuan pembayaran.
            </p>
          </div>
        </div>

        {/* Telegram Preview & Quick Guide (1 Col) */}
        <div className="space-y-4">
          {/* Simulated Telegram Message Card */}
          <div className="rounded-3xl bg-[#0e1628] border border-cyan-500/30 p-5 shadow-xl text-xs space-y-3">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs pb-2 border-b border-slate-800">
              <Bot className="w-4 h-4" />
              <span>Preview Pesan Notifikasi Bot</span>
            </div>

            <div className="p-3 rounded-xl bg-[#080d1a] border border-slate-800/80 space-y-2 text-[11px] font-mono text-slate-300">
              <div className="font-bold text-amber-300 font-sans flex items-center gap-1.5">
                <span>🔔</span>
                <span>PEMBAYARAN BARU MASUK!</span>
              </div>
              <div>ID: <span className="text-cyan-400">INV-20261102-001</span></div>
              <div>Nama: Budi Pratama</div>
              <div>Paket: VIP (30 Hari)</div>
              <div>Jumlah: Rp 10.000</div>
              <div>Metode: QRIS_MANUAL</div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="py-2 text-center rounded-lg bg-emerald-600/30 border border-emerald-500/50 text-emerald-300 text-[10px] font-bold">
                ✅ Setujui (Approve)
              </div>
              <div className="py-2 text-center rounded-lg bg-rose-600/30 border border-rose-500/50 text-rose-300 text-[10px] font-bold">
                ❌ Tolak (Reject)
              </div>
            </div>
          </div>

          {/* Quick Guide Card */}
          <div className="rounded-3xl bg-[#0a0f1d] border border-slate-800 p-5 text-xs space-y-3">
            <div className="flex items-center gap-2 text-slate-200 font-bold">
              <HelpCircle className="w-4 h-4 text-purple-400" />
              <span>Panduan Setup Bot</span>
            </div>
            <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-slate-400 leading-relaxed">
              <li>Buka Telegram, cari akun <strong>@BotFather</strong>.</li>
              <li>Ketik perintah <code>/newbot</code> dan ikuti petunjuk hingga menerima token API.</li>
              <li>Salin token dan tempel pada bidang <strong>Telegram Bot Token</strong> di atas.</li>
              <li>Untuk mencari Chat ID Anda, buka bot <strong>@userinfobot</strong> lalu salin ID akun Anda.</li>
              <li>Klik <strong>Simpan</strong> lalu tekan <strong>Kirim Pesan Uji Coba</strong>.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
