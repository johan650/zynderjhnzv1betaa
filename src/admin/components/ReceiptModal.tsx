import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { PaymentTransaction } from '../types';

interface ReceiptModalProps {
  payment: PaymentTransaction | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ payment, onClose }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!payment) return null;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  const hasReceipt = Boolean(payment.receiptUrl);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-3xl rounded-2xl bg-[#0a0f1d] border border-cyan-500/30 overflow-hidden shadow-2xl shadow-cyan-950/70 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 bg-[#0d1424] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shrink-0">
              <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 truncate">
                <span>Bukti Pembayaran</span>
                <span className="font-mono text-cyan-400 text-xs">#{payment.id}</span>
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate max-w-[200px] sm:max-w-none">
                {payment.senderName || payment.userName} • Rp {payment.amount.toLocaleString('id-ID')} ({payment.method})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            {hasReceipt && (
              <>
                <button
                  onClick={handleZoomIn}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer"
                  title="Perbesar"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={handleZoomOut}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer"
                  title="Perkecil"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={handleRotate}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer"
                  title="Putar 90 Derajat"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                {payment.receiptUrl?.startsWith('data:') ? (
                  <a
                    href={payment.receiptUrl}
                    download={`receipt-${payment.id}.jpg`}
                    className="p-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
                    title="Unduh Gambar"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                ) : (
                  <a
                    href={payment.receiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
                    title="Buka di Tab Baru"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center ml-1 cursor-pointer"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 flex flex-col items-center justify-center bg-[#070a13] min-h-[280px] sm:min-h-[350px]">
          {hasReceipt ? (
            <div className="relative overflow-hidden flex items-center justify-center max-w-full max-h-full">
              <img
                src={payment.receiptUrl}
                alt={`Bukti transfer ${payment.id}`}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s ease-out',
                }}
                className="max-h-[55vh] max-w-full object-contain rounded-lg shadow-2xl border border-slate-700 select-none cursor-grab active:cursor-grabbing"
              />
            </div>
          ) : (
            <div className="text-center p-6 text-slate-500 space-y-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600">
                <ImageIcon className="w-7 h-7" />
              </div>
              <p className="text-xs sm:text-sm font-semibold text-slate-400">Tidak ada lampiran screenshot bukti transfer.</p>
              <p className="text-[11px] text-slate-600 max-w-xs">
                Transaksi dilakukan via {payment.method} atau konfirmasi instan server.
              </p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 sm:px-6 py-3 bg-[#0d1424] border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
          <div className="flex flex-wrap items-center gap-3">
            <span>Rekening: <strong className="text-slate-200">{payment.senderAccount || '-'}</strong></span>
            <span>Catatan: <span className="text-slate-300">{payment.notes || 'Tidak ada'}</span></span>
          </div>
          {hasReceipt && (
            <button
              onClick={handleReset}
              className="text-[11px] text-cyan-400 hover:underline cursor-pointer ml-auto"
            >
              Reset Zoom ({Math.round(zoom * 100)}%)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
