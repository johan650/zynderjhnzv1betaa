import React from 'react';
import { ArrowRight, Sparkles, ShieldCheck, Zap } from 'lucide-react';

interface CtaSectionProps {
  onOpenModal: () => void;
}

export const CtaSection: React.FC<CtaSectionProps> = ({ onOpenModal }) => {
  return (
    <section className="py-20 bg-gradient-to-b from-[#090d18] to-[#07090e] relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-r from-cyan-500/20 to-purple-600/20 blur-[130px] pointer-events-none rounded-full" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="p-8 sm:p-12 md:p-16 rounded-3xl bg-gradient-to-br from-[#0e1426]/90 via-[#0a0e1c]/90 to-[#12182c]/90 border border-cyan-500/30 backdrop-blur-xl shadow-2xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ZynderJhnzV1Beta Digital Ecosystem</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight text-balance">
            Siap Membuat Promosi Lebih Praktis?
          </h2>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed text-balance">
            Mulai kelola aktivitas broadcast dan promosi bisnis digital melalui ZynderJhnzV1Beta.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onOpenModal}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-bold text-white bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 rounded-xl shadow-lg shadow-cyan-500/30 transition-all cursor-pointer"
            >
              <span>Mulai Sekarang</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#preview-dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 text-sm font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-700 transition-all cursor-pointer"
            >
              <span>Coba Demo Interaktif</span>
            </a>
          </div>

          <div className="pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Sistem Anti-Ban Terintegrasi
            </span>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-cyan-400" />
              Setup Cepat & Mudah
            </span>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Format Otomatis Pesan JB & Reseller
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
