import React, { useState } from 'react';
import {
  Users,
  Radio,
  Send,
  QrCode,
  History,
  Crown,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export const FiturUtamaSection: React.FC = () => {
  const [selectedFeature, setSelectedFeature] = useState(0);

  const features = [
    {
      id: 'group-broadcast',
      title: 'Group Broadcast',
      tagline: 'Pengelolaan pesan ke grup yang didukung integrasi',
      description:
        'Kirimkan materi promosi jual beli akun dan produk digital ke berbagai grup komunitas sekaligus. Dilengkapi pengatur jeda otomatis (anti-ban delay) dan tagar pesan terstandar.',
      icon: Users,
      benefits: [
        'Multi-group blast dalam satu kali eksekusi',
        'Pengaturan random delay 4-10 detik untuk menjaga keamanan nomor',
        'Filter grup aktif dan pembersihan grup tidak responsif',
        'Penyisipan variabel teks dinamis otomatis',
      ],
      badge: 'Paling Populer',
    },
    {
      id: 'channel-broadcast',
      title: 'Channel Broadcast',
      tagline: 'Pengelolaan publikasi ke saluran yang didukung integrasi',
      description:
        'Fitur siaran saluran WhatsApp. Catatan: Saat ini Meta Cloud API dan provider gateway belum membuka endpoint siaran Channels ke pihak ketiga (Status: Menunggu Dukungan Provider Resmi).',
      icon: Radio,
      benefits: [
        'Status transparan: Menunggu rilis endpoint Meta resmi',
        'Tidak menampilkan broadcast palsu/pura-pura sukses',
        'Kesiapan otomatis saat endpoint Channels dirilis Meta',
        'Panduan publikasi manual yang sesuai regulasi',
      ],
      badge: 'Menunggu Provider',
    },
    {
      id: 'contact-broadcast',
      title: 'Contact Broadcast',
      tagline: 'Pengelolaan promosi kepada kontak yang menyetujui pesan',
      description:
        'Kirimkan penawaran khusus dan personal kepada kontak pelanggan yang telah memberikan izin (pushkontak). Personalisasi sapaan nama membuat rasio konversi melonjak.',
      icon: Send,
      benefits: [
        'Segmentasi tag: JB Akun, Reseller, Jasa Digital, VIP Buyer',
        'Variabel nama dinamis {nama} untuk pendekatan ramah',
        'Sistem verifikasi persetujuan kontak (opt-in compliance)',
        'Import/export kontak cepat via file spreadsheet',
      ],
      badge: 'Tinggi Konversi',
    },
    {
      id: 'whatsapp-connection',
      title: 'WhatsApp Connection',
      tagline: 'Pengelolaan koneksi WhatsApp',
      description:
        'Hubungkan dan kelola koneksi WhatsApp Anda dengan mudah melalui scan QR resmi perangkat tertaut. Sistem menjaga koneksi tetap stabil dan siap broadcast 24/7.',
      icon: QrCode,
      benefits: [
        'Koneksi cepat via scan QR Web Socket resmi',
        'Indikator status sinyal, baterai, dan uptime perangkat',
        'Fitur auto-reconnect jika koneksi internet terputus',
        'Mendukung multi-device untuk manajemen beberapa nomor',
      ],
      badge: 'Stabil & Aman',
    },
    {
      id: 'broadcast-history',
      title: 'Broadcast History',
      tagline: 'Riwayat aktivitas pengiriman',
      description:
        'Arsip lengkap seluruh kampanye promosi yang telah dan sedang berlangsung. Ketahui status terkirim, dibaca, maupun nomor yang tidak aktif secara transparan.',
      icon: History,
      benefits: [
        'Log pengiriman real-time per detik',
        'Pencatatan status centang satu, centang dua, dan gagal',
        'Export laporan promosi untuk evaluasi ROI penjualan',
        'Riwayat tersimpan aman dalam arsip cloud',
      ],
      badge: 'Transparan',
    },
    {
      id: 'vip-membership',
      title: 'VIP Membership',
      tagline: 'Akses fitur premium',
      description:
        'Buka potensi penuh promosi dengan kuota broadcast harian lebih masif, akses prioritas antrean pengiriman, slot nomor lebih banyak, dan dukungan teknis khusus.',
      icon: Crown,
      benefits: [
        'Kuota pengiriman hingga puluhan ribu pesan per hari',
        'Slot multi-device hingga 10 nomor WhatsApp aktif',
        'Prioritas jalur pengiriman berkecepatan tinggi',
        'Akses konsultasi setup promosi WhatsApp JB & Reseller',
      ],
      badge: 'Fitur Unggulan',
    },
  ];

  const current = features[selectedFeature];
  const CurrentIcon = current.icon;

  return (
    <section id="fitur" className="py-20 bg-[#090d18] border-t border-slate-800/80 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-3">
            <span>Fitur Utama</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Fitur Lengkap <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">ZynderJhnzV1Beta</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-400">
            Enam modul utama yang terintegrasi secara harmonis untuk mempercepat perputaran penjualan dan promosi digital Anda.
          </p>
        </div>

        {/* Feature Grid with Interactive Detail Modal or Focus */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, index) => {
            const Icon = feat.icon;
            const isSelected = selectedFeature === index;
            return (
              <div
                key={feat.id}
                onClick={() => setSelectedFeature(index)}
                className={`p-6 rounded-2xl cursor-pointer transition-all duration-200 border ${
                  isSelected
                    ? 'bg-gradient-to-b from-[#11182c] to-[#0c101d] border-cyan-500/50 shadow-xl shadow-cyan-950/30'
                    : 'bg-[#0c101c]/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                      isSelected
                        ? 'bg-gradient-to-br from-cyan-500 to-purple-600 text-white shadow-md'
                        : 'bg-slate-900 text-cyan-400 border border-slate-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60">
                    {feat.badge}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white mb-1.5">{feat.title}</h3>
                <p className="text-xs font-medium text-cyan-300 mb-3">{feat.tagline}</p>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">{feat.description}</p>

                <div className="space-y-2 pt-3 border-t border-slate-800/80">
                  {feat.benefits.slice(0, 2).map((b, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="truncate">{b}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Highlight Banner of Selected Feature */}
        <div className="mt-10 p-6 rounded-2xl bg-gradient-to-r from-cyan-950/30 via-slate-900/90 to-purple-950/30 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white shrink-0">
              <CurrentIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-cyan-400 font-semibold uppercase tracking-wider">
                Modul Terpilih: {current.title}
              </div>
              <div className="text-sm font-bold text-white mt-0.5">
                {current.tagline}
              </div>
            </div>
          </div>

          <a
            href="#preview-dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-slate-200 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 whitespace-nowrap"
          >
            <span>Buka di Simulator Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
          </a>
        </div>
      </div>
    </section>
  );
};
