import React, { useState, useEffect } from 'react';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import { AdminNavbar } from './components/AdminNavbar';
import { AdminSidebar } from './components/AdminSidebar';
import { ToastContainer, ToastMessage } from './components/Toast';
import { ReceiptModal } from './components/ReceiptModal';
import { AdminTab, PaymentTransaction } from './types';
import { AdminLoginView } from './views/AdminLoginView';
import { AdminDashboardView } from './views/AdminDashboardView';
import { AdminPaymentsView } from './views/AdminPaymentsView';
import { AdminUsersView } from './views/AdminUsersView';
import { AdminTelegramView } from './views/AdminTelegramView';
import { AdminSettingsView } from './views/AdminSettingsView';
import { AdminAuditLogsView } from './views/AdminAuditLogsView';
import { adminApi } from './services/adminApi';
import { Loader2 } from 'lucide-react';

function AdminMainContent() {
  const { admin, loading } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState<number>(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState<PaymentTransaction | null>(null);

  // Sync tab with URL path if applicable (/ZIN/payments, /ZIN/users, etc.)
  useEffect(() => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('/payments')) setActiveTab('payments');
    else if (path.includes('/users')) setActiveTab('users');
    else if (path.includes('/telegram')) setActiveTab('telegram');
    else if (path.includes('/settings')) setActiveTab('settings');
    else if (path.includes('/logs')) setActiveTab('logs');
    else setActiveTab('dashboard');
  }, []);

  const handleSelectTab = (tab: AdminTab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
    window.history.pushState({}, '', `/ZIN/${tab}`);
  };

  const handleShowToast = (type: 'success' | 'error' | 'info', message: string, title?: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Poll or fetch pending payments count
  useEffect(() => {
    if (admin) {
      adminApi
        .getStats()
        .then((s) => setPendingPaymentsCount(s.pendingPaymentsCount))
        .catch(() => {});
    }
  }, [admin, activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070a13] flex flex-col items-center justify-center text-slate-400 space-y-4">
        <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
        <span className="text-xs font-mono tracking-wider">Memeriksa Sesi Administrator /ZIN...</span>
      </div>
    );
  }

  // If not logged in, render the secure Login View
  if (!admin) {
    return (
      <>
        <AdminLoginView />
        <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#070a13] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Topbar */}
      <AdminNavbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

      {/* Main Layout: Sidebar + Viewport */}
      <div className="flex-1 flex overflow-hidden">
        <AdminSidebar
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          pendingPaymentsCount={pendingPaymentsCount}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#070a13] relative">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <AdminDashboardView
                onNavigateTab={handleSelectTab}
                onOpenReceipt={(payment) => setSelectedReceiptPayment(payment)}
              />
            )}
            {activeTab === 'payments' && (
              <AdminPaymentsView
                onOpenReceipt={(payment) => setSelectedReceiptPayment(payment)}
                onShowToast={handleShowToast}
              />
            )}
            {activeTab === 'users' && (
              <AdminUsersView onShowToast={handleShowToast} />
            )}
            {activeTab === 'telegram' && (
              <AdminTelegramView onShowToast={handleShowToast} />
            )}
            {activeTab === 'settings' && (
              <AdminSettingsView onShowToast={handleShowToast} />
            )}
            {activeTab === 'logs' && (
              <AdminAuditLogsView onShowToast={handleShowToast} />
            )}
          </div>
        </main>
      </div>

      {/* Global Image Zoom Modal */}
      <ReceiptModal
        payment={selectedReceiptPayment}
        onClose={() => setSelectedReceiptPayment(null)}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}

export default function AdminApp() {
  return (
    <AdminAuthProvider>
      <AdminMainContent />
    </AdminAuthProvider>
  );
}
