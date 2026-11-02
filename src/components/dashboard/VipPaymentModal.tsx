import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Crown,
  CheckCircle2,
  QrCode,
  ShieldCheck,
  Loader2,
  Copy,
  Check,
  Upload,
  Clock,
  AlertTriangle,
  ArrowLeft,
  Send,
  Building2,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import { ApiClient } from '../../services/apiClient';

interface VipPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  resubmitTransactionId?: string | null;
  initialPendingPayment?: any | null;
}

type ManualStep = 'view_qris' | 'upload_proof' | 'status_verification';

export const VipPaymentModal: React.FC<VipPaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  resubmitTransactionId,
  initialPendingPayment,
}) => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'manual' | 'instant'>('manual');
  const [manualStep, setManualStep] = useState<ManualStep>('view_qris');
  const [paymentData, setPaymentData] = useState<{
    paymentId: string;
    amount: number;
    qrisPayload: string;
  } | null>(null);

  const [publicSettings, setPublicSettings] = useState<{
    vipPrice: number;
    vipDurationDays: number;
    qrisImageUrl: string;
    qrisManualActive: boolean;
    qiospayActive: boolean;
    adminWorkingHours: string;
    availableMethods: string[];
  }>({
    vipPrice: 10000,
    vipDurationDays: 30,
    qrisImageUrl: '',
    qrisManualActive: true,
    qiospayActive: false,
    adminWorkingHours: 'Senin - Minggu: 08:00 - 22:00 WIB',
    availableMethods: ['QRIS_MANUAL'],
  });

  const [submittedPayment, setSubmittedPayment] = useState<any>(initialPendingPayment || null);
  const [copied, setCopied] = useState(false);
  const [isVerifyingInstant, setIsVerifyingInstant] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form fields for proof upload
  const [senderName, setSenderName] = useState('');
  const [senderAccount, setSenderAccount] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptBase64, setReceiptBase64] = useState<string>('');
  const [receiptFileName, setReceiptFileName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize data on open
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setErrorMessage(null);

      // If resubmitting for an existing rejected transaction
      if (resubmitTransactionId) {
        setManualStep('upload_proof');
        setActiveTab('manual');
      } else if (initialPendingPayment) {
        setSubmittedPayment(initialPendingPayment);
        setManualStep('status_verification');
        setActiveTab('manual');
      } else {
        setManualStep('view_qris');
      }

      Promise.all([
        ApiClient.createPaymentOrder(),
        ApiClient.getPublicSettings().catch(() => null),
        ApiClient.getMyTransactions().catch(() => null),
      ])
        .then(([orderData, settingsData, myTxData]) => {
          setPaymentData(orderData);
          if (settingsData) {
            const qrisManualActive = settingsData.qrisManualActive !== false;
            const qiospayActive = Boolean(settingsData.qiospayActive);
            const availableMethods: string[] = [];
            if (qrisManualActive) availableMethods.push('QRIS_MANUAL');
            if (qiospayActive) availableMethods.push('QRIS_INSTANT');
            setPublicSettings({
              vipPrice: settingsData.vipPrice || 10000,
              vipDurationDays: settingsData.vipDurationDays || 30,
              qrisImageUrl: settingsData.qrisImageUrl || '',
              qrisManualActive,
              qiospayActive,
              adminWorkingHours: settingsData.adminWorkingHours || 'Senin - Minggu: 08:00 - 22:00 WIB',
              availableMethods,
            });
          }

          // If there is an active pending transaction already and not in resubmit mode
          if (!resubmitTransactionId && myTxData?.activePending) {
            setSubmittedPayment(myTxData.activePending);
            setManualStep('status_verification');
          }

          // Set default tab to first available method if current tab is not available
          if (
            manualStep !== 'status_verification' &&
            !resubmitTransactionId &&
            publicSettings.availableMethods.length > 0
          ) {
            const firstAvailable = publicSettings.availableMethods[0];
            const desiredTab = firstAvailable === 'QRIS_INSTANT' ? 'instant' : 'manual';
            if (activeTab !== desiredTab) {
              setActiveTab(desiredTab);
            }
          }
        })
        .catch((err) => {
          setErrorMessage(err.message || 'Gagal memuat instruksi pembayaran.');
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, resubmitTransactionId, initialPendingPayment]);

  if (!isOpen) return null;

  const handleCopyQris = () => {
    if (paymentData?.qrisPayload) {
      navigator.clipboard.writeText(paymentData.qrisPayload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validMimes.includes(file.type)) {
      setErrorMessage('Format bukti tidak valid. Hanya JPG, JPEG, PNG, dan WEBP yang diperbolehkan.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Ukuran gambar maksimal adalah 5MB.');
      return;
    }

    setErrorMessage(null);
    setReceiptFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      setReceiptBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmInstantPayment = async () => {
    if (!paymentData) return;
    setIsVerifyingInstant(true);
    setErrorMessage(null);

    try {
      await ApiClient.verifyPayment(paymentData.paymentId);
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Verifikasi pembayaran instan gagal.');
    } finally {
      setIsVerifyingInstant(false);
    }
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();

    // Strict validation: proof upload is mandatory
    if (!receiptBase64) {
      setErrorMessage('Bukti transfer wajib diunggah sebelum mengirim pengajuan pembayaran.');
      return;
    }

    if (!senderName.trim() || !senderAccount.trim()) {
      setErrorMessage('Nama pengirim dan nomor rekening/e-wallet pengirim wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (resubmitTransactionId) {
        // Resubmission of rejected payment
        const res = await ApiClient.resubmitManualPayment({
          paymentId: resubmitTransactionId,
          receiptUrl: receiptBase64,
          senderName: senderName.trim(),
          senderAccount: senderAccount.trim(),
          notes: notes.trim(),
        });

        setSubmittedPayment(res.payment);
        setManualStep('status_verification');
      } else {
        // Initial manual payment submission
        const res = await ApiClient.submitManualPayment({
          paymentId: paymentData?.paymentId,
          senderName: senderName.trim(),
          senderAccount: senderAccount.trim(),
          notes: notes.trim(),
          receiptUrl: receiptBase64,
          amount: publicSettings.vipPrice,
          durationDays: publicSettings.vipDurationDays,
          tier: 'VIP',
          method: 'QRIS_MANUAL',
        });

        setSubmittedPayment(res.payment);
        setManualStep('status_verification');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mengirim bukti pembayaran.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg rounded-3xl bg-[#0c101d] border border-cyan-500/30 p-5 sm:p-7 shadow-2xl shadow-cyan-950/60 text-slate-200 max-h-[94vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Tutup jendela pembayaran"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Title */}
        <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
          <Crown className="w-4 h-4" />
          <span>Sistem Pembayaran VIP — ZynderJhnzV1Beta</span>
        </div>

        <h3 className="text-xl font-extrabold text-white">
          {manualStep === 'status_verification'
            ? 'Status Pengajuan Pembayaran'
            : resubmitTransactionId
            ? 'Upload Ulang Bukti Transfer'
            : 'Aktivasi Akses VIP ZynderJhnzV1Beta'}
        </h3>
        <p className="mt-1 text-xs text-slate-400">
          {manualStep === 'status_verification'
            ? 'Proses verifikasi server dan antrean admin /ZIN'
            : `Paket VIP ${publicSettings.vipDurationDays} Hari — Nikmati modul WhatsApp Connection & Broadcast`}
        </p>

        {/* Tab switcher: Only shown when not in status_verification and not resubmitting */}
        {manualStep !== 'status_verification' && !resubmitTransactionId && publicSettings.availableMethods.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800">
            {publicSettings.qrisManualActive && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('manual');
                  setManualStep('view_qris');
                }}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'manual'
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                QRIS Manual (Admin ACC)
              </button>
            )}
            {publicSettings.qiospayActive && (
              <button
                type="button"
                onClick={() => setActiveTab('instant')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'instant'
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                QRIS Otomatis (Qiospay)
              </button>
            )}
          </div>
        )}

        {/* Payment unavailable state: both methods disabled */}
        {manualStep !== 'status_verification' && !resubmitTransactionId && publicSettings.availableMethods.length === 0 && (
          <div className="py-12 flex flex-col items-center justify-center text-xs text-slate-400 space-y-3 rounded-2xl bg-slate-900/50 border border-slate-800/50 p-6">
            <AlertTriangle className="w-8 h-8 text-amber-400 animate-pulse" />
            <span className="font-semibold text-slate-200">Pembayaran Tidak Tersedia</span>
            <span className="text-[11px] text-slate-400 text-center">
              Semua metode pembayaran sedang nonaktif oleh admin. Silakan coba lagi nanti atau hubungi customer service.
            </span>
          </div>
        )}

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-xs text-slate-400 space-y-3">
            <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
            <span>Memuat konfigurasi pembayaran...</span>
          </div>
        ) : errorMessage ? (
          <div className="my-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Terjadi Kesalahan</div>
              <div className="text-[11px] mt-0.5 opacity-90">{errorMessage}</div>
            </div>
          </div>
        ) : null}

        {/* MAIN BODY CONTENT */}
        {!loading && (
          <div className="mt-4 space-y-4">
            {/* Price Banner */}
            {manualStep !== 'status_verification' && (
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400">
                    Nominal Paket ({publicSettings.vipDurationDays} Hari):
                  </span>
                  <div className="text-xl font-extrabold font-mono text-cyan-400 mt-0.5">
                    Rp {publicSettings.vipPrice.toLocaleString('id-ID')}
                  </div>
                </div>
                <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  Role Saat Ini: FREE
                </span>
              </div>
            )}

            {/* TAB 1: QRIS MANUAL */}
            {activeTab === 'manual' && (
              <>
                {/* SUB-PHASE 1: VIEW QRIS */}
                {manualStep === 'view_qris' && (
                  <div className="space-y-4">
                    {/* Active QRIS Display from Admin Panel */}
                    <div className="p-4 bg-white rounded-2xl flex flex-col items-center text-center shadow-lg">
                      {publicSettings.qrisImageUrl ? (
                        <div className="max-w-[240px] max-h-[240px] flex items-center justify-center overflow-hidden rounded-xl border border-slate-200">
                          <img
                            src={publicSettings.qrisImageUrl}
                            alt="QRIS Aktif Admin"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="w-52 h-52 bg-slate-950 rounded-xl p-4 flex flex-col items-center justify-center text-slate-300">
                          <QrCode className="w-36 h-36 text-cyan-400" />
                          <span className="text-[10px] mt-1 text-slate-400">QRIS Admin Aktif</span>
                        </div>
                      )}

                      <div className="text-[12px] font-bold text-slate-900 mt-2">
                        QRIS RESMI ZYNDERJHNZV1BETA
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Scan via BCA, Mandiri, BRI, BNI, Dana, GoPay, OVO, ShopeePay & Semua Bank
                      </div>
                    </div>

                    {/* Step-by-step notice */}
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5 text-xs">
                      <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Instruksi Transfer Manual</span>
                      </div>
                      <ol className="list-decimal list-inside text-[11px] text-slate-400 space-y-1 pl-1">
                        <li>Scan QRIS di atas melalui aplikasi Mobile Banking atau E-Wallet Anda.</li>
                        <li>
                          Transfer nominal tepat{' '}
                          <strong className="text-cyan-400 font-mono">
                            Rp {publicSettings.vipPrice.toLocaleString('id-ID')}
                          </strong>
                          .
                        </li>
                        <li>Simpan screenshot / foto struk bukti pembayaran yang sah.</li>
                        <li>
                          Klik tombol <strong>"Saya Sudah Transfer"</strong> di bawah untuk mengunggah bukti.
                        </li>
                      </ol>
                    </div>

                    {/* Button: Saya Sudah Transfer */}
                    <button
                      type="button"
                      onClick={() => {
                        setManualStep('upload_proof');
                        setErrorMessage(null);
                      }}
                      className="w-full py-3.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                      <span>Saya Sudah Transfer</span>
                    </button>
                  </div>
                )}

                {/* SUB-PHASE 2: UPLOAD PROOF FORM (MANDATORY) */}
                {manualStep === 'upload_proof' && (
                  <form onSubmit={handleSubmitProof} className="space-y-3.5">
                    {!resubmitTransactionId && (
                      <button
                        type="button"
                        onClick={() => setManualStep('view_qris')}
                        className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-cyan-300 cursor-pointer mb-1 transition-colors"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Kembali ke Tampilan QRIS</span>
                      </button>
                    )}

                    <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 text-xs">
                      <div className="font-bold flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Formulir Pengajuan Bukti Transfer</span>
                      </div>
                      <p className="text-[11px] opacity-85 mt-0.5">
                        Bukti transfer <strong>wajib diunggah</strong> agar admin dapat memverifikasi pembayaran Anda di Admin Panel /ZIN.
                      </p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Nama Pengirim (Sesuai Rekening / Akun) <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        placeholder="Contoh: Budi Pratama"
                        required
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Bank / E-Wallet & Nomor Akun Pengirim <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={senderAccount}
                        onChange={(e) => setSenderAccount(e.target.value)}
                        placeholder="Contoh: BCA 8291029182 / GoPay 0812998877"
                        required
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                      />
                    </div>

                    {/* Proof Upload Component (MANDATORY) */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Foto / Screenshot Bukti Transfer <span className="text-rose-400">* (Wajib)</span>
                      </label>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageChange}
                        accept="image/jpeg,image/png,image/webp,image/jpg"
                        className="hidden"
                      />

                      {receiptBase64 ? (
                        <div className="relative rounded-xl border border-cyan-500/40 p-3 bg-slate-900 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={receiptBase64}
                              alt="Bukti Transfer"
                              className="w-14 h-14 object-cover rounded-lg border border-slate-700 shrink-0"
                            />
                            <div className="text-[11px] truncate">
                              <span className="font-semibold text-cyan-300 block truncate">
                                {receiptFileName || 'Struk Bukti Terlampir'}
                              </span>
                              <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                                <Check className="w-3 h-3" />
                                <span>Format valid & siap diverifikasi</span>
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-2.5 py-1.5 text-[11px] font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer shrink-0"
                          >
                            Ganti Foto
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full p-5 rounded-xl border-2 border-dashed border-slate-700 hover:border-cyan-500 bg-slate-900/60 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                        >
                          <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                            <Upload className="w-5 h-5" />
                          </div>
                          <div className="text-xs font-semibold text-slate-200">
                            Klik untuk Mengunggah Bukti Transfer
                          </div>
                          <span className="text-[10px] text-slate-500">
                            Hanya JPG, JPEG, PNG, WEBP (Maksimal 5MB)
                          </span>
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Catatan Tambahan (Opsional)
                      </label>
                      <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Contoh: Pembayaran paket 30 hari via QRIS"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || !receiptBase64}
                      className="w-full py-3.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 shadow-md shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Mengirim Pengajuan Pembayaran...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>
                            {resubmitTransactionId
                              ? 'Kirim Ulang Bukti Pembayaran'
                              : 'Kirim Pengajuan Pembayaran'}
                          </span>
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* SUB-PHASE 3: STATUS VERIFIKASI (EXACT TEXT & CRITERIA) */}
                {manualStep === 'status_verification' && (
                  <div className="space-y-4">
                    {/* Required Notice Box */}
                    <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto animate-pulse">
                        <Clock className="w-6 h-6" />
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-base font-bold text-white">
                          Memverifikasi pembayaran Anda
                        </h4>
                        <p className="text-xs text-amber-200/90 leading-relaxed font-medium">
                          Harap tunggu maksimal 1x24 jam pada jam kerja admin.
                        </p>
                        <p className="text-[11px] text-slate-300 leading-relaxed pt-1">
                          Jika pembayaran berhasil diverifikasi, akses VIP akan otomatis terbuka dan Anda akan menerima notifikasi.
                        </p>
                      </div>
                    </div>

                    {/* Operational Hours & Rules Card */}
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Jam Kerja Admin:</span>
                        </span>
                        <span className="font-semibold text-cyan-300 font-mono">
                          {publicSettings.adminWorkingHours}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Status Akun:</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                          FREE (Akses Terkunci Sementara)
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Status Pembayaran:</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          PENDING_VERIFICATION
                        </span>
                      </div>

                      {submittedPayment?.id && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">ID Transaksi:</span>
                          <span className="font-mono text-slate-300 text-[11px]">
                            {submittedPayment.id}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Waktu Pengajuan:</span>
                        <span className="font-mono text-slate-300 text-[11px]">
                          {submittedPayment?.submittedAt
                            ? new Date(submittedPayment.submittedAt).toLocaleString('id-ID')
                            : new Date().toLocaleString('id-ID')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Telegram Bot:</span>
                        <span className="text-emerald-400 text-[11px] font-medium flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Diteruskan ke Admin /ZIN</span>
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                      * Role pengguna tetap Free selama pembayaran belum disetujui oleh admin.
                      Akses fitur VIP akan langsung terbuka otomatis begitu admin menekan tombol ACC di Admin Panel.
                    </div>

                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 cursor-pointer transition-colors"
                    >
                      Kembali ke Dashboard
                    </button>
                  </div>
                )}
              </>
            )}

            {/* TAB 2: QRIS OTOMATIS (QIOSPAY) — DO NOT BREAK */}
            {activeTab === 'instant' && (
              <div className="space-y-4">
                <div className="p-4 bg-white rounded-2xl flex flex-col items-center text-center shadow-lg">
                  {paymentData?.qrisPayload ? (
                    <div className="w-48 h-48 bg-slate-950 rounded-xl p-2 flex flex-col items-center justify-center">
                      <QrCode className="w-40 h-40 text-cyan-400" />
                    </div>
                  ) : (
                    <div className="w-48 h-48 bg-slate-950 rounded-xl p-2 flex flex-col items-center justify-center">
                      <QrCode className="w-40 h-40 text-slate-600" />
                    </div>
                  )}

                  <div className="text-[11px] font-bold text-slate-800 mt-2">
                    GATEWAY QIOSPAY OTOMATIS
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Verifikasi instan otomatis melalui webhook server
                  </div>
                </div>

                {paymentData && (
                  <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span className="text-slate-400 font-mono text-[11px]">
                      Pesanan: {paymentData.paymentId}
                    </span>
                    <button
                      onClick={handleCopyQris}
                      className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Tersalin' : 'Salin String'}</span>
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleConfirmInstantPayment}
                  disabled={isVerifyingInstant}
                  className="w-full py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 shadow-md shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  {isVerifyingInstant ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Memverifikasi Webhook Qiospay...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Konfirmasi Pembayaran Qiospay (Rp {publicSettings.vipPrice.toLocaleString('id-ID')})</span>
                    </>
                  )}
                </button>
              </div>
            )}

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Verifikasi terenkripsi aman & tercatat di Firestore</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
