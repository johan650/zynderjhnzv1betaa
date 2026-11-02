import React from 'react';
import { ArrowRight, Sparkles, Send, ShieldCheck, Users, Zap, CheckCircle2 } from 'lucide-react';

interface HeroSectionProps {
  onOpenModal: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenModal }) => {
  return (
    <section className="relative pt-10 pb-16 lg:pt-20 lg:pb-28 overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-cyan-500/15 via-purple-600/10 to-transparent blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-40 right-[-10%] w-[400px] h-[400px] bg-cyan-500/10 blur-[130px] pointer-events-none -z-10 rounded-full" />
      <div className="absolute top-60 left-[-10%] w-[400px] h-[400px] bg-purple-600/10 blur-[130px] pointer-events-none -z-10 rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          {/* Eyebrow - Anti-AI Slop zero-pill design */}
          <div className="mb-6 inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-cyan-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>WhatsApp Broadcast & Digital Promotion Platform</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.15] text-balance">
            Satu Platform, <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-purple-400">
              Jangkau Lebih Banyak Pelanggan.
            </span>
          </h1>

          {/* Deskripsi */}
          <p className="mt-5 text-base sm:text-lg lg:text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto text-balance font-normal">
            Permudah aktivitas promosi jual beli dan bisnis digital melalui sistem broadcast WhatsApp yang terorganisasi, cepat, dan aman dalam satu dashboard.
          </p>

          {/* Call to Actions - Minimum 44px touch targets on mobile */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 w-full sm:w-auto">
            <button
              onClick={onOpenModal}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 min-h-[48px] text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-950 bg-gradient-to-r from-cyan-400 via-sky-300 to-cyan-300 rounded-xl hover:from-cyan-300 hover:to-sky-200 shadow-xl shadow-cyan-500/25 transition-all duration-200 cursor-pointer active:scale-[0.98]"
            >
              <span>Mulai Sekarang</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#fitur"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 min-h-[48px] text-xs sm:text-sm font-semibold text-slate-200 bg-slate-900/90 hover:bg-slate-800 rounded-xl border border-slate-700/80 hover:border-slate-600 transition-all cursor-pointer active:scale-[0.98]"
            >
              <span>Jelajahi Fitur</span>
            </a>
          </div>

          {/* Quick Platform Metrics & Value Signals - Responsive grid */}
          <div className="mt-12 pt-8 border-t border-slate-800/80 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 text-left">
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/60">
              <div className="text-xl sm:text-2xl font-black font-mono text-cyan-400">99.8%</div>
              <div className="text-[11px] sm:text-xs text-slate-400 mt-1 font-medium">Tingkat Pengiriman Sukses</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/60">
              <div className="text-xl sm:text-2xl font-black font-mono text-purple-400">45.000+</div>
              <div className="text-[11px] sm:text-xs text-slate-400 mt-1 font-medium">Kontak Terkelola</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/60">
              <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400">3 - 10 Detik</div>
              <div className="text-[11px] sm:text-xs text-slate-400 mt-1 font-medium">Smart Anti-Ban Delay</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/60">
              <div className="text-xl sm:text-2xl font-black font-mono text-amber-400">1 Dashboard</div>
              <div className="text-[11px] sm:text-xs text-slate-400 mt-1 font-medium">Grup, Channel & DM</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
