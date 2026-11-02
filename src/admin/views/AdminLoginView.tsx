import React, { useState } from 'react';
import { Shield, Lock, User, Eye, EyeOff, Loader2, AlertCircle, KeyRound } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';

export const AdminLoginView: React.FC = () => {
  const { login } = useAdminAuth();
  const [username, setUsername] = useState('JhnzV1Beta');
  const [password, setPassword] = useState('JhnzV1Beta');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage('Username dan password wajib diisi.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      await login(username.trim(), password);
    } catch (err: any) {
      setErrorMessage(err.message || 'Login gagal. Periksa kembali kredensial Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070a13] text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background glow accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Login Card */}
      <div className="relative w-full max-w-md rounded-3xl bg-[#0c1222]/90 border border-cyan-500/30 p-8 shadow-2xl shadow-cyan-950/60 backdrop-blur-xl">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 via-sky-400 to-purple-600 p-0.5 shadow-lg shadow-cyan-500/30 mb-4">
            <div className="w-full h-full bg-[#070a13] rounded-[14px] flex items-center justify-center">
              <Shield className="w-8 h-8 text-cyan-400" />
            </div>
          </div>

          <h1 className="text-xl font-black uppercase tracking-wider text-white">
            ZynderJhnzV1Beta
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
              PORTAL ADMIN ROOT /ZIN
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-400 max-w-xs">
            Akses kontrol administratif backend terproteksi. Silakan masuk menggunakan kredensial resmi.
          </p>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="mt-6 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Username Admin
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username admin..."
                required
                className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-slate-900/90 border border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-slate-100 placeholder-slate-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Kata Sandi Admin
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi..."
                required
                className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl bg-slate-900/90 border border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-slate-100 placeholder-slate-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi Kredensial...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Masuk ke Admin Panel</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Security Note */}
        <div className="mt-6 pt-5 border-t border-slate-800 text-center text-[11px] text-slate-500">
          Autentikasi diverifikasi secara aman oleh server via hash Argon2id/bcrypt dengan pembatasan percobaan login (Rate Limiting).
        </div>
      </div>

      {/* Footer Back link */}
      <div className="mt-8 text-center text-xs text-slate-500">
        <a href="/" className="hover:text-cyan-400 transition-colors">
          &larr; Kembali ke Beranda ZynderJhnzV1Beta
        </a>
      </div>
    </div>
  );
};
