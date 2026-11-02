import React, { useState } from 'react';
import { X, Radio, AlertCircle, ShieldCheck, Loader2, Copy, Check, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPrivacy?: () => void;
  onOpenTerms?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onOpenPrivacy,
  onOpenTerms,
}) => {
  const { signInWithGoogle, signInWithDemoAccount, authError, clearAuthError } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isUnauthorizedDomain, setIsUnauthorizedDomain] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  if (!isOpen) return null;

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';

  const handleCopyDomain = () => {
    if (currentHostname) {
      navigator.clipboard.writeText(currentHostname);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2000);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setLocalError(null);
    setIsUnauthorizedDomain(false);
    clearAuthError();

    try {
      await signInWithGoogle();
      onClose();
    } catch (err: any) {
      console.warn('[LoginModal] Sign-in note:', err?.code || err?.message);
      let errMsg = 'Gagal melakukan otentikasi dengan Google.';
      if (err.code === 'auth/popup-closed-by-user') {
        errMsg = 'Proses login dibatalkan karena jendela login ditutup.';
      } else if (err.code === 'auth/popup-blocked') {
        errMsg = 'Popup login Google diblokir browser. Harap izinkan popup pada peramban Anda.';
      } else if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain')) {
        setIsUnauthorizedDomain(true);
        errMsg = `Domain "${currentHostname}" belum terdaftar di Authorized Domains Firebase Authentication.`;
      } else if (err.code === 'auth/redirect-uri-mismatch' || err.message?.includes('redirect_uri_mismatch')) {
        errMsg = 'Redirect URI mismatch pada Google OAuth Client ID. Pastikan redirect URI handler terdaftar di GCP Console.';
      } else if (err.message) {
        errMsg = err.message;
      }
      setLocalError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const errorMessage = localError || authError;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-[#0c101d] border border-cyan-500/30 p-6 sm:p-8 shadow-2xl shadow-cyan-950/50">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          aria-label="Tutup dialog login"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo and Brand */}
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-600 p-[1px] flex items-center justify-center shadow-lg shadow-cyan-500/25 mb-4">
            <div className="w-full h-full bg-[#0b0f19] rounded-[15px] flex items-center justify-center">
              <Radio className="w-6 h-6 text-cyan-400" />
            </div>
          </div>

          <div className="text-xs font-bold tracking-tight text-slate-300">
            Zynder<span className="text-cyan-400">Jhnz</span><span className="text-purple-400 text-[10px] px-1 py-0.2 ml-1 rounded bg-purple-500/10 border border-purple-500/30">V1Beta</span>
          </div>

          <h3 id="login-title" className="text-xl sm:text-2xl font-extrabold text-white mt-3 tracking-tight">
            Selamat Datang di ZynderJhnzV1Beta
          </h3>

          <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed max-w-xs">
            Masuk menggunakan akun Google untuk mengakses dashboard dan mulai mengelola aktivitas promosi digital Anda.
          </p>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mt-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2 text-xs text-rose-300">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-tight">{errorMessage}</div>
            </div>

            {isUnauthorizedDomain && (
              <div className="mt-2 p-3 rounded-lg bg-slate-900 border border-rose-500/20 text-slate-300 space-y-2">
                <div className="text-[10px] text-slate-400 leading-tight">
                  Tambahkan domain ke <strong>Firebase Console → Authentication → Settings → Authorized domains</strong>:
                </div>

                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="flex items-center justify-between gap-2 bg-slate-950 px-2.5 py-1.5 rounded border border-slate-800 text-cyan-300">
                    <span className="truncate">login.jhnzdev.my.id</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('login.jhnzdev.my.id');
                        setCopiedDomain(true);
                        setTimeout(() => setCopiedDomain(false), 2000);
                      }}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 cursor-pointer font-sans shrink-0"
                    >
                      Salin Domain
                    </button>
                  </div>

                  {currentHostname && currentHostname !== 'login.jhnzdev.my.id' && (
                    <div className="flex items-center justify-between gap-2 bg-slate-950 px-2.5 py-1.5 rounded border border-slate-800 text-purple-300">
                      <span className="truncate">{currentHostname}</span>
                      <button
                        type="button"
                        onClick={handleCopyDomain}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 cursor-pointer font-sans shrink-0"
                      >
                        {copiedDomain ? 'Tersalin' : 'Salin Domain'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Ingin coba dashboard sekarang?</span>
                  <button
                    type="button"
                    onClick={async () => {
                      await signInWithDemoAccount('user');
                      onClose();
                    }}
                    className="text-cyan-400 hover:text-cyan-300 font-semibold underline cursor-pointer"
                  >
                    Masuk Mode Preview
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Google Sign-In Action */}
        <div className="mt-6 space-y-4">
          <button
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-slate-900 bg-white hover:bg-slate-100 shadow-lg shadow-slate-900/40 flex items-center justify-center gap-3 cursor-pointer transition-all active:scale-[0.99] disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 text-slate-900 animate-spin" />
                <span>Menghubungkan ke Google...</span>
              </>
            ) : (
              <>
                {/* Official Google 'G' Icon */}
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Autentikasi terenkripsi resmi Firebase</span>
          </div>
        </div>

        {/* Footer with terms & privacy notice */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-center text-[11px] text-slate-500">
          Dengan melanjutkan, Anda menyetujui{' '}
          <button
            onClick={() => {
              onClose();
              if (onOpenTerms) onOpenTerms();
            }}
            className="text-cyan-400 hover:underline cursor-pointer"
          >
            Syarat Ketentuan
          </button>{' '}
          dan{' '}
          <button
            onClick={() => {
              onClose();
              if (onOpenPrivacy) onOpenPrivacy();
            }}
            className="text-cyan-400 hover:underline cursor-pointer"
          >
            Kebijakan Privasi
          </button>{' '}
          ZynderJhnzV1Beta.
        </div>
      </div>
    </div>
  );
};
