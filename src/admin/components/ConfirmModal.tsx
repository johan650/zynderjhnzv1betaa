import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, X, Loader2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'primary' | 'danger' | 'success';
  requireInput?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
  onConfirm: (inputValue?: string) => Promise<void> | void;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  description,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  type = 'primary',
  requireInput = false,
  inputLabel,
  inputPlaceholder,
  onConfirm,
  onClose,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (requireInput && !inputValue.trim()) {
      setError('Harap isi bidang input ini terlebih dahulu.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await onConfirm(inputValue);
      setInputValue('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat memproses.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDanger = type === 'danger';
  const isSuccess = type === 'success';

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-[#0c1222] border border-slate-700 p-6 shadow-2xl text-slate-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4">
          <div
            className={`p-3 rounded-xl shrink-0 ${
              isDanger
                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                : isSuccess
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
            }`}
          >
            {isDanger ? (
              <AlertTriangle className="w-6 h-6" />
            ) : isSuccess ? (
              <CheckCircle2 className="w-6 h-6" />
            ) : (
              <AlertTriangle className="w-6 h-6" />
            )}
          </div>

          <div className="flex-1 pr-4">
            <h3 className="text-base font-bold text-white">{title}</h3>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">{description}</p>
          </div>
        </div>

        {requireInput && (
          <div className="mt-4">
            {inputLabel && <label className="block text-xs font-semibold text-slate-300 mb-1.5">{inputLabel}</label>}
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={inputPlaceholder || 'Masukkan keterangan atau alasan...'}
              rows={3}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
            />
          </div>
        )}

        {error && (
          <div className="mt-3 p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg transition-all disabled:opacity-50 ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30'
                : isSuccess
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
                : 'bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white shadow-cyan-900/30'
            }`}
          >
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
