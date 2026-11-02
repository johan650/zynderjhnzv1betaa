import React, { useState } from 'react';
import {
  Users,
  Send,
  Radio,
  QrCode,
  History,
  Crown,
  CheckCircle2,
  Clock,
  Sparkles,
  Smartphone,
  CheckCheck,
  Play,
  RotateCw,
  Search,
  Filter,
  Layers,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { formatBroadcastMessage, calculateBroadcastSummary } from '../utils/broadcastEngine';

type ActiveTab =
  | 'group'
  | 'channel'
  | 'contact'
  | 'connection'
  | 'history'
  | 'membership';

export const DashboardPreview: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('group');

  // Interactive Simulator State
  const [sampleRecipientName, setSampleRecipientName] = useState('Budi Gamestore');
  const [sampleProduct, setSampleProduct] = useState('Akun MLBB Mythic Glory 120+ Skin');
  const [samplePrice, setSamplePrice] = useState('Rp 450.000');
  const [broadcastTemplate, setBroadcastTemplate] = useState(
    '🔥 PROMO SPESIAL JB!\n\nHalo kak {nama}! Ada stok fresh masuk nih:\n🎮 {produk}\n💰 Harga Promo: {harga}\n\n✅ 100% Monsep & Bergaransi\nHubungi admin sekarang sebelum kehabisan!'
  );
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [simulatedSentCount, setSimulatedSentCount] = useState(0);
  const [simulatedStatus, setSimulatedStatus] = useState<'idle' | 'running' | 'completed'>('idle');

  // Dynamic preview text
  const renderedMessage = formatBroadcastMessage(broadcastTemplate, {
    nama: sampleRecipientName,
    produk: sampleProduct,
    harga: samplePrice,
  });

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setSimulatedStatus('running');
    setSimulationProgress(0);
    setSimulatedSentCount(0);

    const interval = setInterval(() => {
      setSimulationProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsSimulating(false);
          setSimulatedStatus('completed');
          return 100;
        }
        const next = prev + 20;
        setSimulatedSentCount(Math.round((next / 100) * 85));
        return next;
      });
    }, 400);
  };

  return (
    <section id="preview-dashboard" className="py-20 bg-[#07090e] relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-transparent blur-[120px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-700/80 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Live Showcase</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Dashboard Modern <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">ZynderJhnzV1Beta</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-400">
            Lihat langsung bagaimana ZynderJhnzV1Beta menyederhanakan alur broadcast grup, saluran promosi, dan pushkontak dalam satu kendali terpusat.
          </p>
        </div>

        {/* Dashboard Shell Container */}
        <div className="rounded-2xl border border-slate-800 bg-[#0c101c]/90 backdrop-blur-xl shadow-2xl shadow-cyan-950/20 overflow-hidden">
          {/* Top Bar of Dashboard Preview */}
          <div className="px-5 py-4 border-b border-slate-800/80 bg-[#090d16]/95 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex space-x-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <div className="h-4 w-[1px] bg-slate-800 mx-1" />
              <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                <span className="font-bold text-white">ZynderJhnzV1Beta</span>
                <span className="text-slate-500">/</span>
                <span className="text-cyan-400">v1.0-beta.core</span>
              </div>
            </div>

            {/* Status Indicators */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>WhatsApp Terhubung</span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 text-slate-400">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-semibold text-slate-200">VIP Pro Member</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs for Dashboard Features */}
          <div className="px-4 py-2 border-b border-slate-800 bg-[#0a0e1a]/80 overflow-x-auto">
            <div className="flex items-center space-x-2 min-w-max">
              {[
                { id: 'group', label: 'Group Broadcast', icon: Users },
                { id: 'channel', label: 'Channel Broadcast', icon: Radio },
                { id: 'contact', label: 'Contact Broadcast', icon: Send },
                { id: 'connection', label: 'WhatsApp Connection', icon: QrCode },
                { id: 'history', label: 'Broadcast History', icon: History },
                { id: 'membership', label: 'VIP Membership', icon: Crown },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as ActiveTab)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content Display */}
          <div className="p-4 sm:p-6 lg:p-8 bg-gradient-to-b from-[#090d18] to-[#07090f]">
            {/* 1. GROUP BROADCAST TAB */}
            {activeTab === 'group' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Controls */}
                  <div className="lg:col-span-7 space-y-5">
                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                          Pilih Target Grup ({3} Grup Terpilih)
                        </span>
                        <span className="text-xs text-cyan-400 cursor-pointer hover:underline">
                          + Sync Grup WhatsApp
                        </span>
                      </div>
                      <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                        {[
                          { name: '🔥 JB AKUN MLBB & FF REGIONAL #1', members: 890, active: true },
                          { name: '⚡ RESELLER JASA DIGITAL ID', members: 640, active: true },
                          { name: '💎 JB SULTAN VALORANT & GENSHIN', members: 420, active: true },
                          { name: '🛒 KOMUNITAS TOP UP & VOUCHER', members: 980, active: false },
                        ].map((grp, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center justify-between p-2.5 rounded-lg border text-xs ${
                              grp.active
                                ? 'border-cyan-500/40 bg-cyan-950/20 text-slate-200'
                                : 'border-slate-800/60 bg-slate-900/40 text-slate-500'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={grp.active}
                                readOnly
                                className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                              />
                              <span className="font-medium">{grp.name}</span>
                            </div>
                            <span className="text-slate-400">{grp.members} Anggota</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Anti-Ban Interval Delay */}
                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          <span>Smart Anti-Ban Delay Protection</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Jeda dinamis acak antara 4 - 8 detik antar pengiriman pesan grup
                        </p>
                      </div>
                      <span className="px-2.5 py-1 text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md">
                        Aktif (4-8s)
                      </span>
                    </div>

                    {/* Template variables helpers */}
                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                      <label className="block text-xs font-semibold text-slate-300">
                        Template Pesan Broadcast Grup
                      </label>
                      <textarea
                        rows={4}
                        value={broadcastTemplate}
                        onChange={(e) => setBroadcastTemplate(e.target.value)}
                        className="w-full text-xs font-mono p-3 rounded-lg bg-[#07090e] border border-slate-700 text-slate-200 focus:border-cyan-500 focus:outline-none"
                      />
                      <div className="flex flex-wrap gap-2 text-[11px]">
                        <span className="text-slate-400 self-center">Variabel:</span>
                        {['{nama}', '{produk}', '{harga}'].map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 bg-slate-800 text-cyan-300 rounded border border-slate-700 font-mono"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Preview - WhatsApp Phone View */}
                  <div className="lg:col-span-5 flex flex-col items-center justify-center">
                    <div className="w-full max-w-sm rounded-[24px] border-[3px] border-slate-700 bg-[#0b101c] p-3 shadow-xl">
                      {/* Phone Speaker Notch */}
                      <div className="w-24 h-4 bg-slate-800 rounded-full mx-auto mb-3" />
                      
                      {/* WhatsApp Chat Header */}
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-cyan-600 flex items-center justify-center text-[10px] font-bold text-white">
                            JB
                          </div>
                          <div>
                            <div className="font-bold text-slate-100 text-xs truncate max-w-[150px]">
                              JB MLBB REGIONAL #1
                            </div>
                            <div className="text-[10px] text-emerald-400">Online · Bot Broadcast</div>
                          </div>
                        </div>
                        <Smartphone className="w-4 h-4 text-slate-500" />
                      </div>

                      {/* Chat Bubble Simulation */}
                      <div className="bg-[#054740]/40 border border-emerald-500/20 rounded-xl p-3 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed shadow-sm">
                        {renderedMessage}
                        <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-emerald-300/80">
                          <span>14:32</span>
                          <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
                        </div>
                      </div>

                      {/* Simulation Execution Button */}
                      <div className="mt-4 pt-3 border-t border-slate-800">
                        {simulatedStatus === 'running' ? (
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs text-slate-300 font-medium">
                              <span className="flex items-center gap-1.5">
                                <RotateCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                                Mengirim ke 3 grup...
                              </span>
                              <span className="font-mono text-cyan-400">{simulationProgress}%</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 transition-all duration-300"
                                style={{ width: `${simulationProgress}%` }}
                              />
                            </div>
                          </div>
                        ) : simulatedStatus === 'completed' ? (
                          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-center space-y-1">
                            <div className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Broadcast Berhasil Terkirim!
                            </div>
                            <button
                              onClick={() => setSimulatedStatus('idle')}
                              className="text-[11px] text-cyan-400 hover:underline cursor-pointer"
                            >
                              Reset Simulasi
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={handleRunSimulation}
                            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 shadow-md shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                          >
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>Uji Coba Kirim Broadcast</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. CHANNEL BROADCAST TAB */}
            {activeTab === 'channel' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-xs text-slate-400">Total Saluran Terhubung</span>
                    <div className="text-2xl font-bold text-white mt-1">4 Saluran</div>
                    <span className="text-[11px] text-emerald-400">Sinkronisasi otomatis</span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-xs text-slate-400">Jangkauan Subscriber</span>
                    <div className="text-2xl font-bold text-cyan-400 mt-1">12.480+</div>
                    <span className="text-[11px] text-slate-400">Pengikut aktif channel</span>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                    <span className="text-xs text-slate-400">Postingan Bulan Ini</span>
                    <div className="text-2xl font-bold text-purple-400 mt-1">184 Rilis</div>
                    <span className="text-[11px] text-slate-400">Katalog & diskon harian</span>
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <h3 className="text-sm font-bold text-white mb-3">
                    Saluran WhatsApp Terverifikasi (Channel Publish Engine)
                  </h3>
                  <div className="space-y-3">
                    {[
                      { name: 'Katalog Stock Akun Sultan Zynder', subs: '6.420 Subscribers', status: 'Aktif (Admin)', update: '12 menit lalu' },
                      { name: 'Flash Sale Reseller Voucher ID', subs: '3.890 Subscribers', status: 'Aktif (Admin)', update: '1 jam lalu' },
                      { name: 'Info Update & Promo JB Game Online', subs: '2.170 Subscribers', status: 'Aktif (Admin)', update: 'Kemarin' },
                    ].map((ch, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/40 border border-slate-700/50 text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 font-bold">
                            <Radio className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-100">{ch.name}</div>
                            <div className="text-slate-400 text-[11px]">{ch.subs}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {ch.status}
                          </span>
                          <div className="text-[10px] text-slate-500 mt-0.5">{ch.update}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 3. CONTACT BROADCAST TAB */}
            {activeTab === 'contact' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari kontak pushkontak / tag..."
                      className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Filter Tag:</span>
                    <span className="px-2.5 py-1 text-xs rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      Semua (3.420)
                    </span>
                    <span className="px-2.5 py-1 text-xs rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                      JB Akun
                    </span>
                    <span className="px-2.5 py-1 text-xs rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                      Reseller
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Nama Kontak</th>
                        <th className="py-3 px-4">Nomor WhatsApp</th>
                        <th className="py-3 px-4">Kategori Tag</th>
                        <th className="py-3 px-4">Status Izin Kontak</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                      {[
                        { name: 'Aldo Store JB', phone: '+62 812-4455-8901', tag: 'JB Akun', consent: 'Menyetujui Promosi' },
                        { name: 'Kurnia Diamond Reseller', phone: '+62 857-3341-9920', tag: 'Reseller', consent: 'Menyetujui Promosi' },
                        { name: 'Desta Digital Agency', phone: '+62 821-9988-1204', tag: 'Jasa Digital', consent: 'Menyetujui Promosi' },
                        { name: 'Rian Topup Store', phone: '+62 896-1122-3344', tag: 'Pebisnis Online', consent: 'Menyetujui Promosi' },
                      ].map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4 font-semibold text-white">{item.name}</td>
                          <td className="py-3 px-4 font-mono text-slate-400">{item.phone}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 text-[10px] rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-medium">
                              {item.tag}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {item.consent}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button className="px-2.5 py-1 text-[11px] rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              Kirim Pesan
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. WHATSAPP CONNECTION TAB */}
            {activeTab === 'connection' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="p-6 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">Status WhatsApp Engine</h3>
                    <span className="px-2.5 py-1 text-xs rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
                      Online & Terkoneksi
                    </span>
                  </div>
                  <div className="space-y-2 text-xs text-slate-300">
                    <div className="flex justify-between py-1.5 border-b border-slate-800">
                      <span className="text-slate-500">Nomor Aktif:</span>
                      <span className="font-mono font-medium text-slate-200">+62 895-3221-7788</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800">
                      <span className="text-slate-500">Device Platform:</span>
                      <span className="text-slate-200">WhatsApp Web / Node Socket</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800">
                      <span className="text-slate-500">Status Baterai HP:</span>
                      <span className="text-emerald-400 font-semibold">96% (Tercas)</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800">
                      <span className="text-slate-500">Uptime Sesi:</span>
                      <span className="font-mono text-cyan-400">14 hari, 6 jam nonstop</span>
                    </div>
                  </div>
                  <div className="pt-2 flex gap-3">
                    <button className="flex-1 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700">
                      Relog Sesi
                    </button>
                    <button className="flex-1 py-2 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Putuskan Koneksi
                    </button>
                  </div>
                </div>

                <div className="p-6 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col items-center text-center space-y-3">
                  <div className="p-3 bg-white rounded-xl shadow-lg shadow-cyan-500/10 inline-block">
                    <div className="w-36 h-36 border-2 border-slate-900 rounded-lg flex flex-col items-center justify-center p-2 bg-slate-900">
                      <QrCode className="w-28 h-28 text-cyan-400" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">QR Code Scan & Sync Multi-Device</h4>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                      Tautkan nomor WhatsApp Anda dalam 5 detik melalui fitur Perangkat Tertaut resmi.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 5. BROADCAST HISTORY TAB */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Riwayat Pengiriman Terbaru</span>
                  <span className="text-slate-500 font-mono">Total Terkirim: 48.910 Pesan</span>
                </div>
                <div className="space-y-2.5">
                  {[
                    { campaign: 'Promo Akun MLBB Weekend Sale', target: '3 Grup JB + 450 Kontak', success: '100% (453/453)', time: 'Hari ini, 13:45', status: 'Selesai' },
                    { campaign: 'Flash Restock Diamond Murah', target: 'Saluran Katalog + 2 Grup', success: '99.4% (320/322)', time: 'Kemarin, 20:10', status: 'Selesai' },
                    { campaign: 'Follow-up Pembeli Jasa Digital', target: '180 Kontak Prioritas', success: '100% (180/180)', time: '29 Okt 2026', status: 'Selesai' },
                  ].map((hist, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 gap-2 text-xs">
                      <div>
                        <div className="font-bold text-white text-xs">{hist.campaign}</div>
                        <div className="text-slate-400 text-[11px] mt-0.5">{hist.target}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-mono text-emerald-400 font-semibold">{hist.success}</div>
                          <div className="text-[10px] text-slate-500">{hist.time}</div>
                        </div>
                        <span className="px-2.5 py-1 text-[10px] font-semibold rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {hist.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. VIP MEMBERSHIP TAB */}
            {activeTab === 'membership' && (
              <div className="space-y-5">
                <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900/80 to-cyan-950/40 border border-purple-500/30">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Crown className="w-5 h-5 text-amber-400" />
                        <h3 className="text-lg font-extrabold text-white">Status: VIP Enterprise Plan</h3>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        Akses tanpa batas ke seluruh modul Grup, Saluran, Pushkontak, dan Multi-Device WhatsApp.
                      </p>
                    </div>
                    <span className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      Aktif s/d Nov 2027
                    </span>
                  </div>

                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
                    <div>
                      <span className="text-[11px] text-slate-400">Kuota Broadcast Harian</span>
                      <div className="text-xl font-bold font-mono text-cyan-400 mt-0.5">50.000 / Hari</div>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400">Slot Akun WhatsApp</span>
                      <div className="text-xl font-bold font-mono text-purple-400 mt-0.5">10 Nomor Sekaligus</div>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400">Dukungan Prioritas</span>
                      <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">24/7 VIP Dedicated</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
