import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
  Loader2,
  AlertCircle,
  Clock,
  ArrowUpDown,
  Download,
} from 'lucide-react';
import { adminApi } from '../services/adminApi';
import { PaymentTransaction } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';

interface AdminPaymentsViewProps {
  onOpenReceipt: (payment: PaymentTransaction) => void;
  onShowToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export const AdminPaymentsView: React.FC<AdminPaymentsViewProps> = ({
  onOpenReceipt,
  onShowToast,
}) => {
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED'>('ALL');

  // Modals state
  const [selectedPaymentForApprove, setSelectedPaymentForApprove] = useState<PaymentTransaction | null>(null);
  const [selectedPaymentForReject, setSelectedPaymentForReject] = useState<PaymentTransaction | null>(null);
  const [retryingTelegramId, setRetryingTelegramId] = useState<string | null>(null);

  const fetchPayments = async () => {
    try {
      const res = await adminApi.getPayments();
      setPayments(res.payments);
    } catch (err: any) {
      onShowToast('error', err.message || 'Gagal memuat transaksi pembayaran.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPayments();
  };

  const handleConfirmApprove = async () => {
    if (!selectedPaymentForApprove) return;
    try {
      const res = await adminApi.approvePayment(selectedPaymentForApprove.id);
      onShowToast('success', res.message, 'Pembayaran Di-ACC');
      fetchPayments();
    } catch (err: any) {
      onShowToast('error', err.message || 'Gagal menyetujui pembayaran.');
    }
  };

  const handleConfirmReject = async (reason?: string) => {
    if (!selectedPaymentForReject) return;
    try {
      const res = await adminApi.rejectPayment(selectedPaymentForReject.id, reason || '');
      onShowToast('info', res.message, 'Pembayaran Ditolak');
      fetchPayments();
    } catch (err: any) {
      onShowToast('error', err.message || 'Gagal menolak pembayaran.');
    }
  };

  const handleRetryTelegram = async (paymentId: string) => {
    setRetryingTelegramId(paymentId);
    try {
      const res = await adminApi.retryTelegram(paymentId);
      onShowToast('success', res.message, 'Notifikasi Telegram Dikirim Ulang');
      fetchPayments();
    } catch (err: any) {
      onShowToast('error', err.message || 'Gagal mengirim ulang ke Telegram.');
    } finally {
      setRetryingTelegramId(null);
    }
  };

  // Filtered payments
  const filteredPayments = payments.filter((p) => {
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'PENDING_VERIFICATION'
        ? p.status === 'PENDING_VERIFICATION' || p.status === 'PENDING'
        : p.status === statusFilter);

    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      p.id.toLowerCase().includes(query) ||
      p.userName.toLowerCase().includes(query) ||
      p.userEmail.toLowerCase().includes(query) ||
      p.userId.toLowerCase().includes(query) ||
      (p.senderName && p.senderName.toLowerCase().includes(query));

    return matchesStatus && matchesSearch;
  });

  const pendingCount = payments.filter(
    (p) => p.status === 'PENDING_VERIFICATION' || p.status === 'PENDING'
  ).length;

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400 space-y-3">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        <span className="text-xs">Memuat data transaksi pembayaran...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-cyan-400" />
            <span>Manajemen Pembayaran & Bukti Transfer</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Verifikasi transfer bank, transaksi QRIS manual, keputusan ACC / Reject, dan aktivasi membership VIP.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-[#0a0f1d] border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari ID transaksi, nama pengguna, email, atau UID..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {(['ALL', 'PENDING_VERIFICATION', 'APPROVED', 'REJECTED'] as const).map((status) => {
            const isActive = statusFilter === status;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {status === 'ALL' && `Semua (${payments.length})`}
                {status === 'PENDING_VERIFICATION' && `Menunggu Verifikasi (${pendingCount})`}
                {status === 'APPROVED' && `Disetujui (ACC)`}
                {status === 'REJECTED' && `Ditolak`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Transactions Container: Mobile Cards (block lg:hidden) & Desktop Table (hidden lg:block) */}
      
      {/* Mobile Card Layout */}
      <div className="block lg:hidden space-y-3.5">
        {filteredPayments.length === 0 ? (
          <div className="p-8 text-center text-slate-500 rounded-2xl bg-[#0a0f1d] border border-slate-800 text-xs">
            Tidak ada transaksi pembayaran yang cocok dengan filter.
          </div>
        ) : (
          filteredPayments.map((p) => {
            const isApproved = p.status === 'APPROVED';
            const isPending = p.status === 'PENDING_VERIFICATION' || p.status === 'PENDING';
            const isRejected = p.status === 'REJECTED';

            return (
              <div
                key={`mobile-${p.id}`}
                className="p-4 rounded-2xl bg-[#0a0f1d] border border-slate-800/90 shadow-lg space-y-3"
              >
                {/* Header: ID, Status Badge & Date */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-800/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-cyan-400 text-xs">{p.id}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(p.submittedAt || p.createdAt).toLocaleDateString('id-ID')}
                    </span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                      isApproved
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : isPending
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {isApproved && <CheckCircle2 className="w-3 h-3" />}
                    {isPending && <Clock className="w-3 h-3" />}
                    {isRejected && <XCircle className="w-3 h-3" />}
                    <span>{p.status}</span>
                  </span>
                </div>

                {/* User & Package Details */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-[11px] text-slate-400">Pengguna:</div>
                    <div className="font-bold text-white truncate">{p.userName}</div>
                    <div className="text-[10px] text-slate-400 truncate">{p.userEmail}</div>
                    <div className="text-[9px] font-mono text-slate-500 truncate max-w-[130px]">{p.userId}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Paket & Durasi:</div>
                    <div className="font-bold text-cyan-300">{p.package || p.tier} ({p.durationDays} Hari)</div>
                    <div className="text-sm font-extrabold font-mono text-emerald-400">
                      Rp {p.amount.toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>

                {/* Method & Sender info */}
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 text-[11px] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Metode:</span>
                    <span className="font-mono text-slate-200 font-semibold">{p.method}</span>
                  </div>
                  {p.senderName && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Atas Nama:</span>
                      <span className="text-slate-200 font-semibold truncate max-w-[150px]">{p.senderName}</span>
                    </div>
                  )}
                  {p.senderAccount && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Rekening / E-Wallet:</span>
                      <span className="font-mono text-slate-300">{p.senderAccount}</span>
                    </div>
                  )}
                  {p.proofHistory && p.proofHistory.length > 0 && (
                    <div className="text-[10px] text-purple-300 pt-1 border-t border-slate-800 flex items-center gap-1">
                      <span>Riwayat Re-Upload Bukti:</span>
                      <strong className="font-mono">{p.proofHistory.length} kali</strong>
                    </div>
                  )}
                  {isRejected && p.rejectionReason && (
                    <div className="text-[10px] text-rose-400 pt-1 border-t border-slate-800">
                      Alasan Ditolak: {p.rejectionReason}
                    </div>
                  )}
                  {p.telegramNotificationStatus === 'FAILED' && (
                    <div className="text-[10px] text-amber-400 pt-1 border-t border-slate-800 flex items-center justify-between">
                      <span>Notif Telegram: Gagal terkirim</span>
                      <button
                        onClick={() => handleRetryTelegram(p.id)}
                        disabled={retryingTelegramId === p.id}
                        className="text-cyan-400 hover:underline cursor-pointer"
                      >
                        {retryingTelegramId === p.id ? 'Mengirim...' : 'Kirim Ulang'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Actions Bar */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  {p.receiptUrl || p.proofUrl ? (
                    <button
                      onClick={() => onOpenReceipt(p)}
                      className="flex-1 py-2.5 px-3 min-h-[44px] rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Lihat Bukti Foto</span>
                    </button>
                  ) : (
                    <div className="text-[11px] text-slate-500 italic py-2">Tanpa screenshot</div>
                  )}

                  {isPending && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setSelectedPaymentForApprove(p)}
                        className="py-2.5 px-4 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/30 transition-all cursor-pointer"
                        title="ACC Pembayaran & Buka Akses VIP"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>ACC</span>
                      </button>
                      <button
                        onClick={() => setSelectedPaymentForReject(p)}
                        className="py-2.5 px-3 min-h-[44px] rounded-xl bg-rose-600/80 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
                        title="Tolak Pembayaran"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block rounded-3xl bg-[#0a0f1d] border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0e1424] text-slate-400 text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">ID Transaksi</th>
                <th className="py-3.5 px-4 font-semibold">Pengguna / UID</th>
                <th className="py-3.5 px-4 font-semibold">Paket & Durasi</th>
                <th className="py-3.5 px-4 font-semibold">Jumlah (Rp)</th>
                <th className="py-3.5 px-4 font-semibold">Metode & Pengirim</th>
                <th className="py-3.5 px-4 font-semibold">Bukti Transfer</th>
                <th className="py-3.5 px-4 font-semibold">Waktu Pengajuan</th>
                <th className="py-3.5 px-4 font-semibold">Status Verifikasi</th>
                <th className="py-3.5 px-4 font-semibold text-right">Keputusan Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    Tidak ada transaksi pembayaran yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  const isApproved = p.status === 'APPROVED';
                  const isPending = p.status === 'PENDING_VERIFICATION' || p.status === 'PENDING';
                  const isRejected = p.status === 'REJECTED';

                  return (
                    <tr key={p.id} className="hover:bg-slate-900/50 transition-colors">
                      {/* ID */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-cyan-400 text-[11px]">{p.id}</div>
                      </td>

                      {/* User */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-200">{p.userName}</div>
                        <div className="text-[10px] text-slate-400">{p.userEmail}</div>
                        <div className="font-mono text-[9px] text-slate-500 truncate max-w-[130px]">{p.userId}</div>
                      </td>

                      {/* Package */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{p.package || p.tier}</div>
                        <div className="text-[10px] text-slate-400">{p.durationDays} Hari Aktif</div>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4">
                        <div className="font-black font-mono text-emerald-400 text-sm">
                          Rp {p.amount.toLocaleString('id-ID')}
                        </div>
                      </td>

                      {/* Method & Sender */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">
                          {p.method}
                        </span>
                        {p.senderName && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            a.n. <strong className="text-slate-200">{p.senderName}</strong>
                          </div>
                        )}
                        {p.senderAccount && (
                          <div className="text-[9px] text-slate-500 font-mono">{p.senderAccount}</div>
                        )}
                      </td>

                      {/* Receipt Thumbnail */}
                      <td className="py-3.5 px-4">
                        {p.receiptUrl || p.proofUrl ? (
                          <div className="flex flex-col gap-1 items-start">
                            <button
                              onClick={() => onOpenReceipt(p)}
                              className="group flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 transition-all cursor-pointer"
                              title="Klik untuk melihat bukti transfer lengkap"
                            >
                              <Eye className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                              <span className="text-[10px] font-semibold">Lihat Bukti</span>
                            </button>
                            {p.proofHistory && p.proofHistory.length > 0 && (
                              <span className="text-[9px] font-semibold text-purple-300 bg-purple-500/10 px-1.5 py-0.2 rounded border border-purple-500/20">
                                Re-upload ({p.proofHistory.length}x)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">Tanpa screenshot</span>
                        )}
                      </td>

                      {/* Time */}
                      <td className="py-3.5 px-4 text-slate-400 text-[10px] whitespace-nowrap">
                        <div>{new Date(p.submittedAt || p.createdAt).toLocaleDateString('id-ID')}</div>
                        <div className="text-slate-500 font-mono">
                          {new Date(p.submittedAt || p.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            isApproved
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : isPending
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {isApproved && <CheckCircle2 className="w-3 h-3" />}
                          {isPending && <Clock className="w-3 h-3" />}
                          {isRejected && <XCircle className="w-3 h-3" />}
                          <span>{p.status}</span>
                        </span>
                        {isApproved && p.approvedBy && (
                          <div className="text-[9px] text-slate-500 mt-0.5">Oleh: {p.approvedBy}</div>
                        )}
                        {isRejected && p.rejectionReason && (
                          <div className="text-[9px] text-rose-400/90 mt-0.5 max-w-[140px] truncate" title={p.rejectionReason}>
                            Alasan: {p.rejectionReason}
                          </div>
                        )}
                        {p.telegramNotificationStatus === 'FAILED' && (
                          <div className="mt-1">
                            <button
                              onClick={() => handleRetryTelegram(p.id)}
                              disabled={retryingTelegramId === p.id}
                              className="text-[9px] text-amber-400 hover:underline cursor-pointer"
                            >
                              {retryingTelegramId === p.id ? 'Mengirim...' : 'Retry Telegram'}
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedPaymentForApprove(p)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                              title="ACC Pembayaran & Buka Akses VIP"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>ACC</span>
                            </button>
                            <button
                              onClick={() => setSelectedPaymentForReject(p)}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                              title="Tolak Pembayaran (Wajib Alasan)"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500 font-mono">Selesai</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm Approve Modal */}
      <ConfirmModal
        isOpen={Boolean(selectedPaymentForApprove)}
        title="ACC Pembayaran VIP?"
        description={`Apakah Anda yakin ingin menyetujui (ACC) transaksi ${selectedPaymentForApprove?.id} untuk pengguna "${selectedPaymentForApprove?.userName}" (${selectedPaymentForApprove?.userEmail}) sebesar Rp ${selectedPaymentForApprove?.amount.toLocaleString('id-ID')}? Akses VIP pengguna akan langsung terbuka selama ${selectedPaymentForApprove?.durationDays} hari dan audit log akan dicatat.`}
        confirmText="Ya, ACC Pembayaran"
        type="success"
        onConfirm={handleConfirmApprove}
        onClose={() => setSelectedPaymentForApprove(null)}
      />

      {/* Confirm Reject Modal */}
      <ConfirmModal
        isOpen={Boolean(selectedPaymentForReject)}
        title="Tolak Pembayaran (Reject)?"
        description={`Anda akan menolak pengajuan pembayaran ${selectedPaymentForReject?.id} untuk pengguna "${selectedPaymentForReject?.userName}". Pengguna akan melihat alasan ini dan dapat mengunggah ulang bukti transfer baru.`}
        confirmText="Tolak Pembayaran"
        type="danger"
        requireInput={true}
        inputLabel="Alasan Penolakan (Wajib Diisi)"
        inputPlaceholder="Contoh: Bukti transfer buram / nominal tidak sesuai / dana belum masuk rekening..."
        onConfirm={handleConfirmReject}
        onClose={() => setSelectedPaymentForReject(null)}
      />
    </div>
  );
};
