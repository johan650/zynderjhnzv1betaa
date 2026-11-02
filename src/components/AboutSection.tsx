import React from 'react';
import { Target, CheckCircle2, TrendingUp, Users, ShieldAlert, Sparkles, Layers } from 'lucide-react';

export const AboutSection: React.FC = () => {
  return (
    <section id="tentang" className="py-20 bg-[#090d17] border-y border-slate-800/80 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Brand Story & Mission */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
              <span>Tentang Platform</span>
            </div>
            
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Kenalan dengan <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">ZynderJhnzV1Beta</span>
            </h2>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              ZynderJhnzV1Beta hadir sebagai platform pendukung aktivitas promosi digital, khususnya bagi komunitas JB, reseller, dan pelaku bisnis online.
            </p>

            <p className="text-base text-slate-400 leading-relaxed">
              Dengan berbagai fitur pengelolaan broadcast dan kontak, pengguna dapat mengelola aktivitas komunikasi bisnis secara lebih praktis dari satu tempat.
            </p>

            {/* Target Segments */}
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {[
                { title: 'Komunitas Jual Beli (JB) Akun', desc: 'Promosikan stok akun game, media sosial, dan aset digital dengan format rapi ke puluhan grup tanpa repot.' },
                { title: 'Reseller & Dropshipper', desc: 'Sebarkan katalog produk, diskon berkala, dan penawaran flash sale ke basis pelanggan setia secara simultan.' },
                { title: 'Penyedia Jasa Digital', desc: 'Jangkau klien potensial untuk layanan desain, joki, top-up, voucher, dan konsultasi secara instan.' },
                { title: 'Pebisnis Online & UMKM', desc: 'Kelola database prospek pushkontak tersusun rapi dengan izin dan dokumentasi riwayat transparan.' },
              ].map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span>{item.title}</span>
                  </div>
                  <p className="text-[12px] text-slate-400 mt-1.5 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Comparative Operational Flow (Old Way vs ZynderJhnzV1Beta) */}
          <div className="lg:col-span-6 space-y-4">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900/95 to-[#0e1424] border border-slate-800 relative shadow-xl">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4">
                Mengapa Pelaku Bisnis Beralih ke ZynderJhnzV1Beta?
              </h3>

              <div className="space-y-4">
                {/* Comparison Item 1 */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
                  <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                    <span className="text-rose-400">Cara Konvensional / Manual:</span>
                    <span className="text-slate-500">Rawan Human Error</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Copy-paste pesan satu per satu, nomor WhatsApp berisiko diblokir karena pengiriman terlalu cepat, kontak berceceran di berbagai grup tanpa pencatatan.
                  </p>
                </div>

                {/* Comparison Item 2 */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 to-purple-950/40 border border-cyan-500/30">
                  <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                    <span className="text-cyan-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      Solusi ZynderJhnzV1Beta:
                    </span>
                    <span className="text-emerald-400 text-[11px] font-mono">100% Terorganisasi</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Broadcast tersinkronisasi dalam 1 klik dengan jeda pintar (smart interval), segmentasi kontak otomatis, riwayat pengiriman transparan, dan koneksi multi-device stabil.
                  </p>
                </div>
              </div>

              {/* Verified Trust Markers */}
              <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Privasi & Izin Kontak Terjamin
                </span>
                <span className="font-mono text-cyan-400">v1.0-Beta Ready</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
