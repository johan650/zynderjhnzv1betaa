import React from 'react';
import { LayoutDashboard, SlidersHorizontal, Activity, CreditCard, Sparkles, ArrowRight } from 'lucide-react';

export const KeunggulanSection: React.FC = () => {
  const advantages = [
    {
      number: '01',
      title: 'All-in-One Dashboard',
      description: 'Kelola berbagai kebutuhan broadcast dalam satu tempat.',
      detail: 'Integrasikan broadcast grup, pengiriman ke saluran WhatsApp, serta pushkontak pelanggan dalam satu antarmuka terpusat tanpa perlu berpindah-pindah aplikasi.',
      icon: LayoutDashboard,
      gradient: 'from-cyan-500/20 to-cyan-500/5',
      borderColor: 'border-cyan-500/30',
      accentColor: 'text-cyan-400',
    },
    {
      number: '02',
      title: 'Easy Management',
      description: 'Antarmuka sederhana dan mudah digunakan.',
      detail: 'Dirancang intuitif untuk siapa saja. Format pesan dengan variabel dinamis, upload kontak via file, dan atur jadwal broadcast hanya dalam hitungan klik.',
      icon: SlidersHorizontal,
      gradient: 'from-purple-500/20 to-purple-500/5',
      borderColor: 'border-purple-500/30',
      accentColor: 'text-purple-400',
    },
    {
      number: '03',
      title: 'Real-Time Monitoring',
      description: 'Pantau status koneksi dan aktivitas broadcast.',
      detail: 'Dapatkan laporan langsung status perangkat terhubung, log pengiriman pesan terkirim/gagal, dan analitik jangkauan promosi secara transparan.',
      icon: Activity,
      gradient: 'from-emerald-500/20 to-emerald-500/5',
      borderColor: 'border-emerald-500/30',
      accentColor: 'text-emerald-400',
    },
    {
      number: '04',
      title: 'Flexible Membership',
      description: 'Sistem berlangganan yang terjangkau untuk kebutuhan promosi.',
      detail: 'Pilihan paket fleksibel yang disesuaikan dengan skala bisnis—mulai dari pemula komunitas JB hingga volume tinggi untuk agensi dan reseller besar.',
      icon: CreditCard,
      gradient: 'from-amber-500/20 to-amber-500/5',
      borderColor: 'border-amber-500/30',
      accentColor: 'text-amber-400',
    },
  ];

  return (
    <section id="keunggulan" className="py-20 bg-[#07090e] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-3">
            <span>Keunggulan Platform</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Keunggulan Utama <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">ZynderJhnzV1Beta</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-400">
            Fondasi teknologi andal yang dirancang untuk mendukung kelancaran promosi dan akselerasi bisnis online Anda.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {advantages.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.number}
                className={`p-7 rounded-2xl bg-gradient-to-br ${item.gradient} bg-[#0c101c]/90 border ${item.borderColor} backdrop-blur-sm transition-all duration-300 hover:translate-y-[-2px] relative overflow-hidden group`}
              >
                <div className="flex items-start justify-between mb-5">
                  <div className={`w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center ${item.accentColor} shadow-inner`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="font-mono text-xl font-bold text-slate-600 group-hover:text-slate-400 transition-colors">
                    {item.number}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
                  {item.title}
                </h3>
                
                <p className="text-sm font-semibold text-slate-200 mb-3">
                  {item.description}
                </p>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {item.detail}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
