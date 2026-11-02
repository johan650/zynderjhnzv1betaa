import React, { useState } from 'react';
import { Radio, Menu, X, ArrowRight, LayoutDashboard, LogIn, Sparkles, Shield, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  onOpenLogin: () => void;
  onOpenFaq: () => void;
  onOpenContact: () => void;
  onGoToDashboard: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenLogin,
  onOpenFaq,
  onOpenContact,
  onGoToDashboard,
}) => {
  const { user, signOutUser } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Tentang', href: '#tentang' },
    { label: 'Keunggulan', href: '#keunggulan' },
    { label: 'Fitur', href: '#fitur' },
    { label: 'Pricing VIP', href: '#membership' },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#070a13]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-18 gap-4">
            {/* Brand Logo & Wordmark */}
            <a
              href="/"
              className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-white whitespace-nowrap shrink-0 group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 via-sky-400 to-purple-600 p-[1px] flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all">
                <div className="w-full h-full bg-[#0a0f1d] rounded-[11px] flex items-center justify-center">
                  <Radio className="w-4 h-4 text-cyan-400" />
                </div>
              </div>
              <span className="font-black tracking-tight text-white flex items-center">
                Zynder<span className="text-cyan-400">Jhnz</span>
                <span className="text-purple-400 text-[10px] font-mono font-bold px-1.5 py-0.5 ml-1.5 rounded-md bg-purple-500/10 border border-purple-500/30">
                  V1Beta
                </span>
              </span>
            </a>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="hover:text-cyan-400 transition-colors whitespace-nowrap py-1 relative after:absolute after:bottom-0 after:left-0 after:w-0 hover:after:w-full after:h-[2px] after:bg-cyan-400 after:transition-all"
                >
                  {link.label}
                </a>
              ))}
              <button
                onClick={onOpenFaq}
                className="hover:text-cyan-400 transition-colors whitespace-nowrap py-1 cursor-pointer"
              >
                FAQ
              </button>
              <button
                onClick={onOpenContact}
                className="hover:text-cyan-400 transition-colors whitespace-nowrap py-1 cursor-pointer"
              >
                Kontak CS
              </button>
            </nav>

            {/* Primary Action Button */}
            <div className="hidden md:flex items-center gap-3 shrink-0">
              {user ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={onGoToDashboard}
                    className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] text-xs font-bold uppercase tracking-wider text-slate-950 bg-gradient-to-r from-cyan-400 to-sky-300 rounded-xl hover:from-cyan-300 hover:to-sky-200 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/35 transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-[0.98]"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Buka Dashboard</span>
                  </button>
                  <button
                    onClick={signOutUser}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] text-xs font-bold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0"
                    title="Keluar dari akun"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={onOpenLogin}
                  className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] text-xs font-bold uppercase tracking-wider text-slate-950 bg-gradient-to-r from-cyan-400 to-sky-300 rounded-xl hover:from-cyan-300 hover:to-sky-200 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/35 transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-[0.98]"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Mulai Sekarang</span>
                </button>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <div className="flex md:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-300 hover:text-white rounded-xl bg-slate-900/80 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                aria-label="Buka menu navigasi"
              >
                <Menu className="w-5 h-5 text-cyan-400" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Off-Canvas Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer container */}
          <div className="relative w-full max-w-xs bg-[#0a0f1d] border-l border-slate-800 p-6 flex flex-col justify-between shadow-2xl z-10 overflow-y-auto animate-in slide-in-from-right duration-200">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-5 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Radio className="w-4 h-4" />
                  </div>
                  <span className="font-black text-sm tracking-tight text-white">
                    Zynder<span className="text-cyan-400">Jhnz</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Tutup menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="mt-6 flex flex-col space-y-1">
                {navLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center px-4 py-3 rounded-xl text-sm font-semibold text-slate-300 hover:text-cyan-300 hover:bg-slate-900/80 transition-colors min-h-[44px]"
                  >
                    {link.label}
                  </a>
                ))}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenFaq();
                  }}
                  className="flex items-center text-left px-4 py-3 rounded-xl text-sm font-semibold text-slate-300 hover:text-cyan-300 hover:bg-slate-900/80 transition-colors min-h-[44px] cursor-pointer"
                >
                  FAQ & Bantuan
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenContact();
                  }}
                  className="flex items-center text-left px-4 py-3 rounded-xl text-sm font-semibold text-slate-300 hover:text-cyan-300 hover:bg-slate-900/80 transition-colors min-h-[44px] cursor-pointer"
                >
                  Kontak Layanan CS
                </button>
              </nav>
            </div>

            {/* Drawer Footer Actions */}
            <div className="pt-6 border-t border-slate-800 space-y-3">
              {user ? (
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onGoToDashboard();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3.5 min-h-[44px] text-xs font-bold uppercase tracking-wider text-slate-950 bg-gradient-to-r from-cyan-400 to-sky-300 rounded-xl shadow-lg shadow-cyan-500/20 active:scale-[0.98]"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Buka Dashboard</span>
                  </button>
                  <button
                    onClick={async () => {
                      setMobileMenuOpen(false);
                      await signOutUser();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] text-xs font-bold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout dari Akun</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenLogin();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3.5 min-h-[44px] text-xs font-bold uppercase tracking-wider text-slate-950 bg-gradient-to-r from-cyan-400 to-sky-300 rounded-xl shadow-lg shadow-cyan-500/20 active:scale-[0.98]"
                >
                  <span>Mulai Sekarang</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              <div className="text-center">
                <a
                  href="/ZIN"
                  className="text-[11px] font-mono text-slate-500 hover:text-cyan-400 transition-colors"
                >
                  Portal Administrator /ZIN
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
