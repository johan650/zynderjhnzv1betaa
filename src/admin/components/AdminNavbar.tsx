import React, { useState, useEffect } from 'react';
import { Shield, Clock, ExternalLink, LogOut, Activity, UserCheck, Menu } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';

interface AdminNavbarProps {
  onToggleSidebar?: () => void;
}

export const AdminNavbar: React.FC<AdminNavbarProps> = ({ onToggleSidebar }) => {
  const { admin, logout } = useAdminAuth();
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }) + ' WIB'
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 px-4 sm:px-6 bg-[#0a0f1d]/90 backdrop-blur-xl border-b border-slate-800/80 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Mobile Toggle & Branding */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="md:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
          aria-label="Toggle menu admin"
        >
          <Menu className="w-5 h-5 text-cyan-400" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-purple-600 p-0.5 shadow-md shadow-cyan-500/20 shrink-0">
            <div className="w-full h-full bg-[#070a13] rounded-[7px] flex items-center justify-center">
              <Shield className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="text-xs font-black tracking-wider uppercase bg-gradient-to-r from-cyan-400 via-sky-300 to-purple-400 bg-clip-text text-transparent">
              ZynderJhnzV1Beta
            </div>
            <div className="text-[10px] text-slate-400 font-mono tracking-tight flex items-center gap-1.5">
              <span>/ZIN ADMIN</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-slate-800 text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
          <Activity className="w-3.5 h-3.5" />
          <span>Server Aktif & Siap</span>
        </div>
      </div>

      {/* Right: Clock, User Badge, External Preview, Logout */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Real-time Clock */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-mono text-cyan-300">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>{currentTime || '00:00:00 WIB'}</span>
        </div>

        {/* Admin Badge */}
        <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-medium">
          <UserCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <span className="font-semibold truncate max-w-[80px] sm:max-w-none">{admin?.username || 'JhnzV1Beta'}</span>
          <span className="hidden sm:inline text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-200 uppercase font-mono font-bold">
            SUPER ADMIN
          </span>
        </div>

        {/* View Main Website */}
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors"
          title="Buka Website Pengguna"
        >
          <span>Website</span>
          <ExternalLink className="w-3 h-3 text-slate-400" />
        </a>

        {/* Logout Button */}
        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-colors cursor-pointer min-h-[40px]"
          title="Keluar dari Admin Panel"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Keluar</span>
        </button>
      </div>
    </header>
  );
};
