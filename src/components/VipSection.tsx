import React from 'react';
import { Crown, Check, Zap, Sparkles, ArrowRight, Lock } from 'lucide-react';

interface VipSectionProps {
  onOpenModal: () => void;
}

export const VipSection: React.FC<VipSectionProps> = ({ onOpenModal }) => {
  const plans = [
    {
      name: 'FREE Tier',
      subtitle: 'Akses publik dan tinjauan dashboard dasar',
      price: 'Rp 0',
      duration: 'selamanya',
      highlighted: false,
      features: [
        'Akses Landing Page & Informasi',
        'Login Akun Google resmi',
        'Tinjauan Dashboard dasar',
        'Melihat katalog harga VIP',
      ],
      lockedFeatures: [
        'Koneksi WhatsApp (Terkunci)',
        'Group Broadcast (Terkunci)',
        'Contact Pushkontak (Terkunci)',
        'Riwayat Broadcast (Terkunci)',
      ],
      buttonText: 'Mulai Gratis',
      buttonStyle: 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700',
    },
    {
      name: 'VIP Membership',
      subtitle: 'Membuka seluruh fitur broadcast & koneksi WhatsApp nyata',
      price: 'Rp 10.000',
      duration: '30 hari',
      highlighted: true,
      badge: 'Wajib Untuk Broadcast',
      features: [
        'Akses penuh WhatsApp Connection real-time',
        'Group Broadcast ke grup komunitas JB & Reseller',
        'Contact Pushkontak dengan impor CSV',
        'Smart Anti-Ban Interval dinamis (4-8 detik)',
        'Riwayat & verifikasi tanda terima pengiriman',
        'Validasi otorisasi server real-time',
        'Dukungan prioritas komunitas',
      ],
      lockedFeatures: [],
      buttonText: 'Aktivasi VIP (Rp10.000)',
      buttonStyle: 'bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white shadow-lg shadow-cyan-500/25',
    },
    {
      name: 'VVIP Exclusive',
      subtitle: 'Otorisasi khusus yang dikelola langsung via Admin Control',
      price: 'Khusus Admin',
      duration: 'akses prioritas',
      highlighted: false,
      features: [
        'Semua fitur VIP Membership',
        'Akses kontrol panel administrator',
        'Bypass kuota pengiriman volume tinggi',
        'Manajemen status otorisasi pengguna lain',
        'Audit log sistem menyeluruh',
        'Pengaturan provider gateway WhatsApp',
      ],
      lockedFeatures: [],
      buttonText: 'Hubungi Admin',
      buttonStyle: 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700',
    },
  ];

  return (
    <section id="membership" className="py-20 bg-[#07090e] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-semibold uppercase tracking-wider mb-4">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>VIP Access Control — Syarat Utama Broadcast</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Tarif Transparan <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">ZynderJhnzV1Beta</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-400">
            Hanya <strong>Rp10.000 untuk 30 hari</strong>. Seluruh modul WhatsApp Connection dan pengiriman pesan riil dijamin berjalan aman dan terorganisasi.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan, idx) => (
            <div
              key={idx}
              className={`rounded-2xl p-7 flex flex-col justify-between transition-all duration-300 relative ${
                plan.highlighted
                  ? 'bg-gradient-to-b from-[#131b32] to-[#0d1222] border-2 border-cyan-500/60 shadow-2xl shadow-cyan-950/40 lg:-translate-y-2'
                  : 'bg-[#0c101c]/80 border border-slate-800 hover:border-slate-700'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-md">
                  {plan.badge}
                </div>
              )}

              <div>
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{plan.subtitle}</p>

                <div className="mt-6 mb-6 pb-6 border-b border-slate-800">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold font-mono text-white tracking-tight">
                      {plan.price}
                    </span>
                    <span className="text-xs text-slate-400">/ {plan.duration}</span>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Fitur & Hak Akses:
                  </div>
                  {plan.features.map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-start gap-2.5 text-xs text-slate-300">
                      <div className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                      <span>{feat}</span>
                    </div>
                  ))}

                  {plan.lockedFeatures.map((locked, lIdx) => (
                    <div key={lIdx} className="flex items-start gap-2.5 text-xs text-slate-500">
                      <div className="w-4 h-4 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Lock className="w-2.5 h-2.5" />
                      </div>
                      <span className="line-through">{locked}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={onOpenModal}
                className={`w-full py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all ${plan.buttonStyle}`}
              >
                <span>{plan.buttonText}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
