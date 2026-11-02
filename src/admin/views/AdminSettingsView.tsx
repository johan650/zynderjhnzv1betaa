import React, { useState, useEffect, useRef } from 'react';
import {
  Sliders,
  QrCode,
  Upload,
  Globe,
  Share2,
  AlertTriangle,
  Save,
  Loader2,
  Eye,
  Check,
  ToggleLeft,
  ToggleRight,
  DollarSign,
  Calendar,
  Clock,
  MessageCircle,
  Megaphone,
} from 'lucide-react';
import { adminApi } from '../services/adminApi';
import { SystemSettingsData } from '../types';

interface AdminSettingsViewProps {
  onShowToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({ onShowToast }) => {
  const [settings, setSettings] = useState<SystemSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    adminApi
      .getSettings()
      .then((data) => setSettings(data))
      .catch((err) => onShowToast('error', err.message || 'Gagal memuat pengaturan sistem.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const res = await adminApi.updateSettings(settings);
      setSettings(res.settings);
      onShowToast('success', res.message, 'Pengaturan Berhasil Disimpan');
    } catch (err: any) {
      onShowToast('error', err.message || 'Gagal menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onShowToast('error', 'File yang dipilih harus berupa gambar (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      onShowToast('error', 'Ukuran gambar maksimal 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setSettings((prev) => (prev ? { ...prev, qrisImageUrl: base64 } : null));
      onShowToast('info', 'Gambar QRIS baru dimuat ke pratinjau. Klik "Simpan Semua Pengaturan" untuk menerapkan.', 'QRIS Dimuat');
    };
    reader.readAsDataURL(file);
  };

  if (loading || !settings) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400 space-y-3">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        <span className="text-xs">Memuat konfigurasi website dan gateway pembayaran...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <span>Pengaturan QRIS & Konfigurasi Website Dinamis</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Ubah gambar QRIS nasional, tarif paket VIP, tautan komunitas resmi, banner pengumuman, dan mode pemeliharaan.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white shadow-lg shadow-cyan-500/25 transition-all self-start cursor-pointer disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Simpan Semua Pengaturan</span>
        </button>
      </div>

      {/* SECTION 1: QRIS & Membership Pricing */}
      <div className="rounded-3xl bg-[#0a0f1d] border border-slate-800 p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">QRIS Nasional & Pembayaran Dinamis</h3>
              <p className="text-[11px] text-slate-400">
                Gambar QRIS yang diunggah akan otomatis ditampilkan di modal pembayaran pengguna utama.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* QRIS Upload & Preview (1 Col) */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col items-center text-center space-y-3">
            <div className="text-xs font-bold text-slate-300">Gambar QRIS Aktif</div>

            <div className="w-48 h-48 rounded-2xl bg-white p-3 flex flex-col items-center justify-center border-2 border-dashed border-cyan-500/40 shadow-inner overflow-hidden relative group">
              {settings.qrisImageUrl ? (
                <img
                  src={settings.qrisImageUrl}
                  alt="QRIS Aktif"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="text-slate-700 flex flex-col items-center gap-2 text-center p-2">
                  <QrCode className="w-20 h-20 text-slate-400" />
                  <span className="text-[10px] font-semibold text-slate-500 leading-tight">
                    QRIS Default Server Digunakan
                  </span>
                </div>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Unggah Gambar QRIS Baru</span>
            </button>
            <p className="text-[10px] text-slate-500">Mendukung format PNG/JPG/WebP hingga 5MB.</p>
          </div>

          {/* Pricing & Duration + Gateway Toggles (2 Cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Tarif Paket VIP (Rp)</span>
                </label>
                <input
                  type="number"
                  min={1000}
                  step={1000}
                  value={settings.vipPrice}
                  onChange={(e) => setSettings({ ...settings, vipPrice: Number(e.target.value) || 10000 })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold focus:border-cyan-400"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Default: Rp10.000 / paket</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Durasi Paket VIP (Hari)</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={settings.vipDurationDays}
                  onChange={(e) => setSettings({ ...settings, vipDurationDays: Number(e.target.value) || 30 })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white font-mono font-bold focus:border-cyan-400"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Default: 30 hari aktif</span>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Jam Operasional Kerja Admin (Batas Maksimal 1x24 Jam)</span>
                </label>
                <input
                  type="text"
                  value={settings.adminWorkingHours || 'Senin - Minggu: 08:00 - 22:00 WIB'}
                  onChange={(e) => setSettings({ ...settings, adminWorkingHours: e.target.value })}
                  placeholder="Contoh: Senin - Minggu: 08:00 - 22:00 WIB"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-cyan-400"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Informasi ini ditampilkan di halaman status verifikasi pembayaran pengguna.
                </span>
              </div>
            </div>

            {/* Gateway switches */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="text-xs font-bold text-white mb-2">Metode Penerimaan Pembayaran</div>

              <div className="flex items-center justify-between py-2 border-b border-slate-800/80">
                <div>
                  <div className="text-xs font-semibold text-slate-200">QRIS Manual & Upload Bukti Transfer</div>
                  <div className="text-[10px] text-slate-400">
                    Memungkinkan pengguna mentransfer dan mengunggah screenshot bukti untuk verifikasi admin.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, qrisManualActive: !settings.qrisManualActive })}
                  className={`p-1 text-2xl transition-colors cursor-pointer ${
                    settings.qrisManualActive ? 'text-cyan-400' : 'text-slate-600'
                  }`}
                >
                  {settings.qrisManualActive ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                </button>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Gateway Qiospay Otomatis</div>
                  <div className="text-[10px] text-slate-400">
                    Integrasi pembayaran instan otomatis melalui Qiospay QRIS gateway.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, qiospayActive: !settings.qiospayActive })}
                  className={`p-1 text-2xl transition-colors cursor-pointer ${
                    settings.qiospayActive ? 'text-cyan-400' : 'text-slate-600'
                  }`}
                >
                  {settings.qiospayActive ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Website Info & Official Links */}
      <div className="rounded-3xl bg-[#0a0f1d] border border-slate-800 p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Identitas Website & Tautan Komunitas</h3>
              <p className="text-[11px] text-slate-400">
                Informasi dan tautan sosial resmi yang tampil di navbar, footer, dan kontak publik.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Nama Website</label>
            <input
              type="text"
              value={settings.siteName}
              onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Deskripsi Singkat</label>
            <input
              type="text"
              value={settings.siteDescription}
              onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Link Saluran WhatsApp Resmi</label>
            <input
              type="text"
              value={settings.whatsappChannelUrl}
              onChange={(e) => setSettings({ ...settings, whatsappChannelUrl: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:border-cyan-400 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Link Grup WhatsApp Resmi</label>
            <input
              type="text"
              value={settings.whatsappGroupUrl}
              onChange={(e) => setSettings({ ...settings, whatsappGroupUrl: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:border-cyan-400 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Nomor / Link WhatsApp Admin</label>
            <input
              type="text"
              value={settings.adminWhatsappUrl}
              onChange={(e) => setSettings({ ...settings, adminWhatsappUrl: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:border-cyan-400 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Link Telegram Admin</label>
            <input
              type="text"
              value={settings.adminTelegramUrl}
              onChange={(e) => setSettings({ ...settings, adminTelegramUrl: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:border-cyan-400 font-mono"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Link Layanan Pelanggan (CS)</label>
            <input
              type="text"
              value={settings.customerServiceUrl}
              onChange={(e) => setSettings({ ...settings, customerServiceUrl: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:border-cyan-400 font-mono"
            />
          </div>
        </div>
      </div>

      {/* SECTION 3: Announcement Banner & Maintenance Mode */}
      <div className="rounded-3xl bg-[#0a0f1d] border border-slate-800 p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Banner Pengumuman & Mode Maintenance</h3>
              <p className="text-[11px] text-slate-400">
                Pesan peringatan langsung ke seluruh pengguna dan saklar pemeliharaan darurat website.
              </p>
            </div>
          </div>
        </div>

        {/* Announcement Banner */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-cyan-400" />
              <span>Banner Pengumuman Halaman Depan</span>
            </div>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, announcementActive: !settings.announcementActive })}
              className={`p-1 text-2xl transition-colors cursor-pointer ${
                settings.announcementActive ? 'text-cyan-400' : 'text-slate-600'
              }`}
            >
              {settings.announcementActive ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
            </button>
          </div>

          <textarea
            value={settings.announcementText}
            onChange={(e) => setSettings({ ...settings, announcementText: e.target.value })}
            placeholder="Tulis pesan pengumuman..."
            rows={2}
            className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:border-cyan-400 resize-none"
          />
        </div>

        {/* Maintenance Mode */}
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Mode Maintenance (Nonaktifkan Akses Pengguna Publik)</span>
            </div>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
              className={`p-1 text-2xl transition-colors cursor-pointer ${
                settings.maintenanceMode ? 'text-rose-400' : 'text-slate-600'
              }`}
            >
              {settings.maintenanceMode ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
            </button>
          </div>

          <textarea
            value={settings.maintenanceMessage}
            onChange={(e) => setSettings({ ...settings, maintenanceMessage: e.target.value })}
            placeholder="Pesan pemeliharaan untuk pengguna..."
            rows={2}
            className="w-full px-3 py-2 text-xs rounded-xl bg-slate-950/80 border border-rose-500/40 text-rose-200 placeholder-rose-400/50 focus:border-rose-400 resize-none"
          />
        </div>
      </div>
    </form>
  );
};
