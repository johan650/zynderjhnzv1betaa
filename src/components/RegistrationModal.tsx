import React, { useState } from 'react';
import { X, CheckCircle2, ArrowRight, ShieldCheck, Sparkles, Send } from 'lucide-react';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [fullName, setFullName] = useState('');
  const [waNumber, setWaNumber] = useState('');
  const [category, setCategory] = useState('Jual Beli Akun (JB)');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fullName.trim()) {
      setErrorMessage('Harap isi nama lengkap atau nama toko Anda.');
      return;
    }

    if (!waNumber.trim() || waNumber.replace(/\D/g, '').length < 9) {
      setErrorMessage('Harap masukkan nomor WhatsApp yang valid (minimal 9 digit).');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
    }, 800);
  };

  const handleReset = () => {
    setIsSuccess(false);
    setFullName('');
    setWaNumber('');
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-[#0c101d] border border-cyan-500/30 p-6 sm:p-8 shadow-2xl shadow-cyan-950/40">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Tutup jendela pendaftaran"
        >
          <X className="w-5 h-5" />
        </button>

        {!isSuccess ? (
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Akses Cepat ZynderJhnzV1Beta</span>
            </div>

            <h3 id="modal-title" className="text-xl sm:text-2xl font-extrabold text-white">
              Mulai Promosi Lebih Cepat & Praktis
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-400">
              Isi data singkat untuk mengaktifkan akun demo dan mencoba modul Group Broadcast & Pushkontak.
            </p>

            {errorMessage && (
              <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nama Lengkap / Nama Bisnis *
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Rian GameStore JB"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nomor WhatsApp Aktif *
                </label>
                <input
                  type="tel"
                  placeholder="Contoh: 081234567890"
                  value={waNumber}
                  onChange={(e) => setWaNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Kategori Aktivitas Bisnis
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="Jual Beli Akun (JB)">Jual Beli Akun (JB)</option>
                  <option value="Reseller & Dropship Digital">Reseller & Dropship Digital</option>
                  <option value="Penyedia Jasa Digital (Joki / Desain / Web)">Penyedia Jasa Digital (Joki / Desain / Web)</option>
                  <option value="Pebisnis Online & UMKM">Pebisnis Online & UMKM</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 shadow-md shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Memproses Akses Akun...</span>
                  ) : (
                    <>
                      <span>Mulai Sekarang</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 pt-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Data aman, tanpa spam, privasi terjaga.</span>
              </div>
            </form>
          </div>
        ) : (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold text-white">Selamat Datang di ZynderJhnzV1Beta!</h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-sm mx-auto">
              Pendaftaran akses atas nama <strong className="text-cyan-400">{fullName}</strong> ({waNumber}) berhasil dikonfirmasi. Dashboard siap digunakan untuk simulasi promosi.
            </p>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-left text-xs space-y-2">
              <div className="text-slate-400">Status Akun: <span className="text-emerald-400 font-semibold">Aktif (Starter Trial)</span></div>
              <div className="text-slate-400">Kategori: <span className="text-white font-medium">{category}</span></div>
              <div className="text-slate-400">Nomor Terdaftar: <span className="text-cyan-300 font-mono">{waNumber}</span></div>
            </div>

            <button
              onClick={handleReset}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 transition-all cursor-pointer"
            >
              Lanjutkan Eksplorasi Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
