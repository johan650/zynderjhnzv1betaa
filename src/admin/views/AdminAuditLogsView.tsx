import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  Shield,
  Clock,
  User,
  Activity,
  RefreshCw,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { adminApi } from '../services/adminApi';
import { AuditLogRecord } from '../types';

interface AdminAuditLogsViewProps {
  onShowToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export const AdminAuditLogsView: React.FC<AdminAuditLogsViewProps> = ({ onShowToast }) => {
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      const res = await adminApi.getAuditLogs();
      setLogs(res.logs);
    } catch (err: any) {
      onShowToast('error', err.message || 'Gagal memuat catatan audit log.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLogs();
  };

  // Distinct action types for filter
  const actionTypes = ['ALL', ...Array.from(new Set(logs.map((l) => l.action)))];

  const filteredLogs = logs.filter((log) => {
    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      log.action.toLowerCase().includes(q) ||
      log.actor.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      (log.ip && log.ip.includes(q));

    return matchesAction && matchesQuery;
  });

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400 space-y-3">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        <span className="text-xs">Memuat riwayat audit log keamanan...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <History className="w-5 h-5 text-cyan-400" />
            <span>Audit Log & Riwayat Aktivitas Administrator</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Pencatatan immutable seluruh aktivitas autentikasi, persetujuan pembayaran, perubahan hak akses, dan konfigurasi sistem.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors self-start cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Segarkan Log</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-[#0a0f1d] border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari aksi, detail, username pelaksana, atau IP..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>

        {/* Action Select Dropdown */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            {actionTypes.map((action) => (
              <option key={action} value={action}>
                Filter Aksi: {action}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-3xl bg-[#0a0f1d] border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0e1424] text-slate-400 text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Waktu & Tanggal</th>
                <th className="py-3.5 px-4 font-semibold">Jenis Aksi</th>
                <th className="py-3.5 px-4 font-semibold">Pelaku (Actor)</th>
                <th className="py-3.5 px-4 font-semibold">Rincian Aktivitas</th>
                <th className="py-3.5 px-4 font-semibold">Alamat IP</th>
                <th className="py-3.5 px-4 font-semibold text-right">Data Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Tidak ada catatan audit log yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const hasDiff = Boolean(log.previousData || log.newData);

                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-slate-900/50 transition-colors">
                        {/* Timestamp */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-200">
                            {new Date(log.timestamp).toLocaleDateString('id-ID')}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {new Date(log.timestamp).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </div>
                        </td>

                        {/* Action Badge */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-slate-800 text-cyan-300 border border-slate-700">
                            {log.action}
                          </span>
                        </td>

                        {/* Actor */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                            <User className="w-3.5 h-3.5 text-purple-400" />
                            <span>{log.actor}</span>
                          </div>
                        </td>

                        {/* Details */}
                        <td className="py-3.5 px-4 text-slate-300 leading-relaxed max-w-md">
                          {log.details}
                        </td>

                        {/* IP */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 font-mono text-[10px]">
                          {log.ip || '-'}
                        </td>

                        {/* Expand Data Diff */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {hasDiff ? (
                            <button
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                              className="text-xs text-cyan-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                            >
                              <span>{isExpanded ? 'Sembunyikan' : 'Lihat Data'}</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          ) : (
                            <span className="text-slate-600 text-[10px]">-</span>
                          )}
                        </td>
                      </tr>

                      {/* Expandable row for diff payload */}
                      {isExpanded && hasDiff && (
                        <tr className="bg-slate-950/80">
                          <td colSpan={6} className="p-4 border-b border-slate-800">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                              {log.previousData && (
                                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                                  <div className="text-[10px] font-bold text-rose-400 uppercase mb-1">
                                    Data Sebelum (Previous)
                                  </div>
                                  <pre className="text-[11px] text-slate-400 overflow-x-auto whitespace-pre-wrap">
                                    {JSON.stringify(log.previousData, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.newData && (
                                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                                  <div className="text-[10px] font-bold text-emerald-400 uppercase mb-1">
                                    Data Sesudah (New)
                                  </div>
                                  <pre className="text-[11px] text-slate-300 overflow-x-auto whitespace-pre-wrap">
                                    {JSON.stringify(log.newData, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
