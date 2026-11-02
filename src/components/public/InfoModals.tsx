import React from 'react';
import { X, Shield, FileText, HelpCircle, Mail, MessageSquare } from 'lucide-react';

interface InfoModalProps {
  type: 'terms' | 'privacy' | 'faq' | 'contact' | null;
  onClose: () => void;
}

export const InfoModals: React.FC<InfoModalProps> = ({ type, onClose }) => {
  if (!type) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-[#0c101d] border border-cyan-500/30 p-6 sm:p-8 shadow-2xl shadow-cyan-950/40 text-slate-300 text-xs sm:text-sm">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Tutup jendela informasi"
        >
          <X className="w-5 h-5" />
        </button>

        {type === 'terms' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-wider text-xs">
              <FileText className="w-4 h-4" />
              <span>Ketentuan Layanan</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white">
              Terms of Service — ZynderJhnzV1Beta
            </h2>
            <div className="space-y-3 leading-relaxed text-slate-400 text-xs">
              <p>
                Selamat datang di <strong>ZynderJhnzV1Beta</strong>. Dengan mengakses dan menggunakan platform kami, Anda setuju untuk mematuhi syarat dan ketentuan berikut:
              </p>
              <h4 className="font-bold text-slate-200 text-sm pt-2">1. Penggunaan Etis WhatsApp</h4>
              <p>
                Platform ZynderJhnzV1Beta ditujukan sebagai sarana manajemen broadcast komunikasi bisnis, komunitas jual beli akun, reseller, dan promosi digital yang telah memiliki izin penerima (opt-in). Pengguna dilarang keras menggunakan platform untuk spamming ilegal, penipuan, phishing, atau konten berbahaya.
              </p>
              <h4 className="font-bold text-slate-200 text-sm pt-2">2. Akun & Keamanan</h4>
              <p>
                Pengguna bertanggung jawab penuh atas nomor WhatsApp yang dihubungkan melalui fitur perangkat tertaut dan kerahasiaan akun Google yang digunakan untuk masuk.
              </p>
              <h4 className="font-bold text-slate-200 text-sm pt-2">3. Batasan Kuota & Keanggotaan</h4>
              <p>
                Setiap paket keanggotaan (FREE, Starter, Pro, VIP) memiliki batasan volume pengiriman harian dan fitur sesuai tingkatan yang aktif.
              </p>
            </div>
          </div>
        )}

        {type === 'privacy' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-purple-400 font-bold uppercase tracking-wider text-xs">
              <Shield className="w-4 h-4" />
              <span>Privasi Pengguna</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white">
              Kebijakan Privasi — ZynderJhnzV1Beta
            </h2>
            <div className="space-y-3 leading-relaxed text-slate-400 text-xs">
              <p>
                Privasi Anda adalah prioritas kami. Dokumen ini menjelaskan bagaimana ZynderJhnzV1Beta mengelola data Anda:
              </p>
              <h4 className="font-bold text-slate-200 text-sm pt-2">1. Data Yang Kami Kumpulkan</h4>
              <p>
                Kami hanya menyimpan identitas profil dasar dari autentikasi Google (nama, alamat email, foto profil, dan UID Firebase) serta catatan aktivitas penggunaan untuk keperluan keamanan dan analitik riwayat broadcast Anda.
              </p>
              <h4 className="font-bold text-slate-200 text-sm pt-2">2. Perlindungan Data Sensitif</h4>
              <p>
                Kami tidak pernah menyimpan kata sandi, token otorisasi pribadi, atau pesan percakapan rahasia WhatsApp ke dalam log publik. Seluruh data pengguna diisolasi secara ketat menggunakan Firebase Security Rules.
              </p>
              <h4 className="font-bold text-slate-200 text-sm pt-2">3. Hak Akses & Penghapusan</h4>
              <p>
                Anda berhak memperbarui data profil Anda atau meminta penghapusan akun beserta riwayat aktivitas kapan saja melalui tim dukungan kami.
              </p>
            </div>
          </div>
        )}

        {type === 'faq' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-wider text-xs">
              <HelpCircle className="w-4 h-4" />
              <span>Tanya Jawab</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white">
              Pertanyaan yang Sering Diajukan (FAQ)
            </h2>
            <div className="space-y-3 pt-2">
              {[
                {
                  q: 'Bagaimana cara menghubungkan WhatsApp ke ZynderJhnzV1Beta?',
                  a: 'Setelah login melalui Google, buka menu WhatsApp Connection di dashboard Anda. Cukup scan QR code yang muncul menggunakan WhatsApp di ponsel Anda via menu Perangkat Tertaut (Linked Devices).',
                },
                {
                  q: 'Apakah akun saya aman dari pemblokiran (banned)?',
                  a: 'ZynderJhnzV1Beta dilengkapi teknologi Smart Anti-Ban Delay yang memberikan jeda acak (4–10 detik) antar pengiriman pesan, mensimulasikan perilaku pengetikan alami manusia untuk meminimalkan risiko deteksi spam.',
                },
                {
                  q: 'Apakah bisa digunakan untuk banyak nomor WhatsApp?',
                  a: 'Ya, pengguna paket Pro dan VIP dapat menghubungkan beberapa nomor WhatsApp sekaligus (multi-device) untuk membagi beban pengiriman.',
                },
                {
                  q: 'Apakah ada biaya untuk mencoba?',
                  a: 'Pengguna baru otomatis mendapatkan status akun FREE untuk mengeksplorasi dashboard dan mencoba pengiriman pesan dasar.',
                },
              ].map((faq, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="font-bold text-slate-100 text-xs sm:text-sm">{faq.q}</div>
                  <div className="text-slate-400 text-xs mt-1.5 leading-relaxed">{faq.a}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {type === 'contact' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider text-xs">
              <Mail className="w-4 h-4" />
              <span>Hubungi Kami</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white">
              Kontak Dukungan ZynderJhnzV1Beta
            </h2>
            <p className="text-slate-400 text-xs">
              Punya pertanyaan seputar integrasi, upgrade paket VIP, atau bantuan teknis? Tim kami siap membantu.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="text-cyan-400 font-bold flex items-center gap-2 text-xs">
                  <MessageSquare className="w-4 h-4" />
                  <span>WhatsApp Official Support</span>
                </div>
                <p className="text-xs text-slate-300 font-mono">+62 895-3221-7788</p>
                <p className="text-[11px] text-slate-500">Respon cepat setiap hari 08.00 - 22.00 WIB</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="text-purple-400 font-bold flex items-center gap-2 text-xs">
                  <Mail className="w-4 h-4" />
                  <span>Email Bantuan</span>
                </div>
                <p className="text-xs text-slate-300 font-mono">support@zynderjhnz.id</p>
                <p className="text-[11px] text-slate-500">Untuk pertanyaan kemitraan & lisensi bisnis</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-800 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
