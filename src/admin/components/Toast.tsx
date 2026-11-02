import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title?: string;
  message: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl border backdrop-blur-xl shadow-2xl flex items-start gap-3 transition-all animate-in slide-in-from-bottom-3 duration-200 ${
              isSuccess
                ? 'bg-[#061e1b]/95 border-emerald-500/40 text-emerald-200'
                : isError
                ? 'bg-[#240b12]/95 border-rose-500/40 text-rose-200'
                : 'bg-[#0f172a]/95 border-cyan-500/40 text-cyan-200'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {isError && <AlertCircle className="w-5 h-5 text-rose-400" />}
              {!isSuccess && !isError && <Info className="w-5 h-5 text-cyan-400" />}
            </div>

            <div className="flex-1 text-xs">
              {toast.title && <div className="font-bold mb-0.5">{toast.title}</div>}
              <div className="opacity-90 leading-relaxed">{toast.message}</div>
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              className="shrink-0 p-1 rounded-md opacity-70 hover:opacity-100 hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
