import React, { useState, useEffect } from 'react';
import {
  Users,
  CreditCard,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Send,
  Sliders,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { adminApi } from '../services/adminApi';
import { AdminStats, PaymentTransaction, AuditLogRecord, AdminTab } from '../types';

interface AdminDashboardViewProps {
  onNavigateTab: (tab: AdminTab) => void;
  onOpenReceipt: (payment: PaymentTransaction) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  onNavigateTab,
  onOpenReceipt,
}) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentPayments, setRecentPayments] = useState<PaymentTransaction[]>([]);
  const [recentLogs, setRecentLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [statsData, paymentsData, logsData] = await Promise.all([
        adminApi.getStats(),
        adminApi.getPayments(),
        adminApi.getAuditLogs(),
      ]);
      setStats(statsData);
      setRecentPayments(paymentsData.payments.slice(0, 5));
      setRecentLogs(logsData.logs.slice(0, 6));
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400 space-y-3">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        <span className="text-xs">Memuat metrik analitik dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-[#0c1222] via-[#0d162d] to-[#120f26] border border-cyan-500/25 shadow-xl shadow-cyan-950/20">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Pusat Kontrol Administratif</span>
          </div>
          <h2 className="text-2xl font-black text-white">Ringkasan Sistem & Statistik</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Pantau pertumbuhan pengguna, antrean verifikasi pembayaran, integrasi Telegram bot, dan pendapatan membership real-time.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>

          {stats && stats.pendingPaymentsCount > 0 && (
            <button
              onClick={() => onNavigateTab('payments')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all cursor-pointer animate-bounce"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>{stats.pendingPaymentsCount} Pembayaran Menunggu</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="p-5 rounded-2xl bg-[#0a0f1d] border border-slate-800 hover:border-cyan-500/40 transition-all shadow-md group">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium">Total Pengguna</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono">{stats?.totalUsers || 0}</div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>VIP: <strong className="text-cyan-400 font-mono">{stats?.vipUsers || 0}</strong></span>
            <span>VVIP: <strong className="text-purple-400 font-mono">{stats?.vvipUsers || 0}</strong></span>
            <span>Free: <strong className="text-slate-400 font-mono">{stats?.freeUsers || 0}</strong></span>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="p-5 rounded-2xl bg-[#0a0f1d] border border-slate-800 hover:border-emerald-500/40 transition-all shadow-md group">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium">Total Pendapatan</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            Rp {(stats?.totalRevenueIdr || 0).toLocaleString('id-ID')}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Dari {stats?.approvedPaymentsCount || 0} transaksi berhasil</span>
          </div>
        </div>

        {/* Pending Payments */}
        <div className="p-5 rounded-2xl bg-[#0a0f1d] border border-slate-800 hover:border-amber-500/40 transition-all shadow-md group">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium">Menunggu Verifikasi</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">
            {stats?.pendingPaymentsCount || 0}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Perlu konfirmasi manual</span>
            <button
              onClick={() => onNavigateTab('payments')}
              className="text-amber-400 hover:underline font-semibold cursor-pointer"
            >
              Lihat Antrean &rarr;
            </button>
          </div>
        </div>

        {/* Total Transactions */}
        <div className="p-5 rounded-2xl bg-[#0a0f1d] border border-slate-800 hover:border-purple-500/40 transition-all shadow-md group">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium">Total Transaksi</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {stats?.totalTransactionsCount || 0}
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Disetujui: <strong className="text-emerald-400">{stats?.approvedPaymentsCount || 0}</strong></span>
            <span>Ditolak: <strong className="text-rose-400">{stats?.rejectedPaymentsCount || 0}</strong></span>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => onNavigateTab('payments')}
          className="p-4 rounded-2xl bg-[#0a0f1d] border border-slate-800 hover:border-cyan-500/40 text-left transition-all group cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors">
                Manajemen Pembayaran
              </div>
              <div className="text-[11px] text-slate-400">Verifikasi bukti transfer & QRIS</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
        </button>

        <button
          onClick={() => onNavigateTab('telegram')}
          className="p-4 rounded-2xl bg-[#0a0f1d] border border-slate-800 hover:border-purple-500/40 text-left transition-all group cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-purple-400 transition-colors">
                Telegram Bot Integration
              </div>
              <div className="text-[11px] text-slate-400">Notifikasi & tombol approve Telegram</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
        </button>

        <button
          onClick={() => onNavigateTab('settings')}
          className="p-4 rounded-2xl bg-[#0a0f1d] border border-slate-800 hover:border-emerald-500/40 text-left transition-all group cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                QRIS & Pengaturan Web
              </div>
              <div className="text-[11px] text-slate-400">Ganti QRIS, harga, & kontak resmi</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
        </button>
      </div>

      {/* Two Column Layout: Recent Payments + Live Activity Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Payments Table (2 Cols) */}
        <div className="lg:col-span-2 rounded-3xl bg-[#0a0f1d] border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-cyan-400" />
                <span>Transaksi Pembayaran Terbaru</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Daftar transaksi masuk terakhir pada sistem.</p>
            </div>
            <button
              onClick={() => onNavigateTab('payments')}
              className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
            >
              <span>Lihat Semua</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                  <th className="pb-3 font-semibold">ID / User</th>
                  <th className="pb-3 font-semibold">Paket / Jumlah</th>
                  <th className="pb-3 font-semibold">Metode</th>
                  <th className="pb-3 font-semibold">Bukti</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentPayments.map((p) => {
                  const isApproved = p.status === 'APPROVED';
                  const isPending = p.status === 'PENDING';

                  return (
                    <tr key={p.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3">
                        <div className="font-mono text-cyan-400 text-[11px]">{p.id}</div>
                        <div className="font-medium text-slate-200">{p.userName}</div>
                      </td>
                      <td className="py-3">
                        <div className="font-bold text-white">Rp {p.amount.toLocaleString('id-ID')}</div>
                        <div className="text-[10px] text-slate-400">{p.tier} ({p.durationDays}h)</div>
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">
                          {p.method}
                        </span>
                      </td>
                      <td className="py-3">
                        {p.receiptUrl ? (
                          <button
                            onClick={() => onOpenReceipt(p)}
                            className="px-2 py-1 rounded-md text-[10px] bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-colors cursor-pointer"
                          >
                            Lihat Foto
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500">-</span>
                        )}
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isApproved
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : isPending
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => onNavigateTab('payments')}
                          className="text-xs text-slate-400 hover:text-cyan-400 font-medium cursor-pointer"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Log Stream (1 Col) */}
        <div className="rounded-3xl bg-[#0a0f1d] border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              <span>Aktivitas Audit</span>
            </h3>
            <button
              onClick={() => onNavigateTab('logs')}
              className="text-xs text-purple-400 hover:underline cursor-pointer"
            >
              Semua Log
            </button>
          </div>

          <div className="space-y-3">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs space-y-1"
              >
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-mono font-bold text-cyan-400">{log.action}</span>
                  <span className="text-slate-500">
                    {new Date(log.timestamp).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed line-clamp-2">
                  {log.details}
                </p>
                <div className="text-[10px] text-slate-500">Oleh: {log.actor}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
