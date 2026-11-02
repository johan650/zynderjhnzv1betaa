import React from 'react';
import { Radio } from 'lucide-react';

interface FooterProps {
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
  onOpenFaq?: () => void;
  onOpenContact?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenTerms,
  onOpenPrivacy,
  onOpenFaq,
  onOpenContact,
}) => {
  return (
    <footer className="border-t border-slate-800/80 bg-[#06080d] text-slate-400 py-12 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 p-[1px] flex items-center justify-center">
              <div className="w-full h-full bg-[#0b0f19] rounded-[7px] flex items-center justify-center">
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
              </div>
            </div>
            <span className="font-bold text-white text-base tracking-tight">
              Zynder<span className="text-cyan-400">Jhnz</span><span className="text-purple-400 text-[10px] px-1 py-0.2 ml-1 rounded bg-purple-500/10 border border-purple-500/30">V1Beta</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-slate-300">
            <a href="#tentang" className="hover:text-cyan-400 transition-colors">Tentang</a>
            <a href="#keunggulan" className="hover:text-cyan-400 transition-colors">Keunggulan</a>
            <a href="#fitur" className="hover:text-cyan-400 transition-colors">Fitur</a>
            <a href="#membership" className="hover:text-cyan-400 transition-colors">Pricing</a>
            <button onClick={onOpenFaq} className="hover:text-cyan-400 transition-colors cursor-pointer">
              FAQ
            </button>
            <button onClick={onOpenContact} className="hover:text-cyan-400 transition-colors cursor-pointer">
              Contact
            </button>
            <button onClick={onOpenTerms} className="hover:text-cyan-400 transition-colors cursor-pointer">
              Terms of Service
            </button>
            <button onClick={onOpenPrivacy} className="hover:text-cyan-400 transition-colors cursor-pointer">
              Privacy Policy
            </button>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} ZynderJhnzV1Beta. Seluruh hak cipta dilindungi undang-undang.</p>
          <p className="text-center sm:text-right max-w-md">
            Platform pengelola WhatsApp Broadcast & Digital Promotion terproteksi Firebase Authentication.
          </p>
        </div>
      </div>
    </footer>
  );
};
