import React from 'react';
import {
  LayoutDashboard,
  CreditCard,
  Users,
  Send,
  Sliders,
  History,
  ShieldCheck,
  X,
} from 'lucide-react';
import { AdminTab } from '../types';

interface AdminSidebarProps {
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  pendingPaymentsCount?: number;
  isOpen?: boolean;
  onClose?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onSelectTab,
  pendingPaymentsCount = 0,
  isOpen = false,
  onClose,
}) => {
  const navItems: { id: AdminTab; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard Utama', icon: LayoutDashboard },
    {
      id: 'payments',
      label: 'Manajemen Pembayaran',
      icon: CreditCard,
      badge: pendingPaymentsCount,
    },
    { id: 'users', label: 'Manajemen Pengguna', icon: Users },
    { id: 'telegram', label: 'Telegram Bot Notif', icon: Send },
    { id: 'settings', label: 'QRIS & Pengaturan Web', icon: Sliders },
    { id: 'logs', label: 'Audit Log & Riwayat', icon: History },
  ];

  const handleItemClick = (id: AdminTab) => {
    onSelectTab(id);
    if (onClose) {
      onClose();
    }
  };

  const navContent = (
    <div className="flex flex-col h-full justify-between">
      {/* Navigation Links */}
      <div className="p-4 space-y-1.5 flex-1 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Menu Administrasi /ZIN
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer group min-h-[44px] ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/15 via-purple-500/15 to-transparent text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && item.badge > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info Box */}
      <div className="p-4 border-t border-slate-800/60">
        <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80">
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Zona Terproteksi</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Direktori <code>/ZIN</code> diisolasi secara ketat dengan hash Argon2id/bcrypt dan session terverifikasi server.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex w-64 bg-[#080d1a] border-r border-slate-800/80 flex-col shrink-0 min-h-[calc(100vh-4rem)]">
        {navContent}
      </aside>

      {/* Mobile Drawer (visible when isOpen) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer sheet */}
          <div className="relative w-72 max-w-[85vw] bg-[#080d1a] border-r border-slate-800 flex flex-col z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>Panel Navigasi /ZIN</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                aria-label="Tutup navigasi"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {navContent}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
