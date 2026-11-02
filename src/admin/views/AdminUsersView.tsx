import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Crown,
  Shield,
  ShieldAlert,
  Clock,
  PlusCircle,
  MinusCircle,
  RefreshCw,
  Loader2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { adminApi } from '../services/adminApi';
import { UserManagementRecord } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';

interface AdminUsersViewProps {
  onShowToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export const AdminUsersView: React.FC<AdminUsersViewProps> = ({ onShowToast }) => {
  const [users, setUsers] = useState<UserManagementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'FREE' | 'VIP' | 'VVIP' | 'EXPIRED'>('ALL');

  // Action Modals State
  const [roleModalUser, setRoleModalUser] = useState<UserManagementRecord | null>(null);
  const [targetRole, setTargetRole] = useState<'FREE' | 'VIP' | 'VVIP'>('VIP');
  const [targetDays, setTargetDays] = useState(30);

  const [extendModalUser, setExtendModalUser] = useState<UserManagementRecord | null>(null);
  const [extendDays, setExtendDays] = useState(30);

  const fetchUsers = async () => {
    try {
      const res = await adminApi.getUsers();
      setUsers(res.users);
    } catch (err: any) {
      onShowToast('error', err.message || 'Gagal memuat daftar pengguna.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchUsers();
  };

  const handleApplyRoleChange = async () => {
    if (!roleModalUser) return;
    try {
      await adminApi.updateUserRole(roleModalUser.uid, targetRole, targetDays);
      onShowToast(
        'success',
        `Role pengguna "${roleModalUser.displayName}" berhasil diubah menjadi ${targetRole}.`,
        'Role Diperbarui'
      );
      setRoleModalUser(null);
      fetchUsers();
    } catch (err: any) {
      onShowToast('error', err.message || 'Gagal mengubah role pengguna.');
    }
  };

  const handleApplyExtend = async () => {
    if (!extendModalUser) return;
    try {
      await adminApi.extendUserVip(extendModalUser.uid, extendDays);
      onShowToast(
        'success',
        `Masa aktif VIP pengguna "${extendModalUser.displayName}" berhasil diperpanjang +${extendDays} hari.`,
        'Masa Aktif Ditambahkan'
      );
      setExtendModalUser(null);
      fetchUsers();
    } catch (err: any) {
      onShowToast('error', err.message || 'Gagal memperpanjang masa aktif.');
    }
  };

  const handleResetWaSession = async (user: UserManagementRecord) => {
    try {
      await adminApi.resetUserWaSession(user.uid);
      onShowToast('info', `Sesi WhatsApp pengguna ${user.displayName} telah direset.`, 'Sesi Direset');
    } catch (err: any) {
      onShowToast('error', err.message || 'Gagal mereset sesi WhatsApp.');
    }
  };

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchesRole =
      roleFilter === 'ALL' ||
      (roleFilter === 'EXPIRED' ? u.status === 'EXPIRED' : u.role === roleFilter);

    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      u.displayName.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      u.uid.toLowerCase().includes(query);

    return matchesRole && matchesSearch;
  });

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400 space-y-3">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
        <span className="text-xs">Memuat direktori data pengguna...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            <span>Manajemen Pengguna & Hak Akses Role</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Kelola profil pengguna, pemberian akses VIP / VVIP instan, perpanjangan durasi, dan reset sesi gateway.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors self-start cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Segarkan</span>
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
            placeholder="Cari nama, email, atau UID pengguna..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>

        {/* Role Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {(['ALL', 'VIP', 'VVIP', 'FREE', 'EXPIRED'] as const).map((r) => {
            const isActive = roleFilter === r;
            return (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {r === 'ALL' ? `Semua (${users.length})` : r}
              </button>
            );
          })}
        </div>
      </div>

      {/* Users Container: Mobile Cards (block lg:hidden) & Desktop Table (hidden lg:block) */}

      {/* Mobile Card Layout */}
      <div className="block lg:hidden space-y-3.5">
        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-slate-500 rounded-2xl bg-[#0a0f1d] border border-slate-800 text-xs">
            Tidak ada pengguna yang sesuai dengan filter pencarian.
          </div>
        ) : (
          filteredUsers.map((u) => {
            const isVip = u.role === 'VIP';
            const isVvip = u.role === 'VVIP';

            return (
              <div
                key={`mobile-user-${u.uid}`}
                className="p-4 rounded-2xl bg-[#0a0f1d] border border-slate-800/90 shadow-lg space-y-3"
              >
                {/* Header: User avatar, name, and role badge */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-800/60 pb-3">
                  <div className="flex items-center gap-3">
                    {u.photoURL ? (
                      <img
                        src={u.photoURL}
                        alt={u.displayName}
                        className="w-10 h-10 rounded-full border border-cyan-500/40 object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-cyan-400 text-xs shrink-0">
                        {u.displayName?.slice(0, 2).toUpperCase() || 'US'}
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-white text-sm truncate max-w-[170px]">{u.displayName}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[170px]">{u.email}</div>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold inline-flex items-center gap-1 ${
                      isVvip
                        ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                        : isVip
                        ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {isVvip && <Sparkles className="w-3 h-3 text-purple-400" />}
                    {isVip && <Crown className="w-3 h-3 text-amber-400" />}
                    <span>{u.role}</span>
                  </span>
                </div>

                {/* Account Details */}
                <div className="grid grid-cols-2 gap-2 text-xs p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Status Masa Aktif:</span>
                    <span
                      className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.status === 'ACTIVE'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : u.status === 'EXPIRED'
                          ? 'bg-rose-500/15 text-rose-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {u.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Masa Berlaku VIP:</span>
                    {u.vipExpiresAt ? (
                      <div className="font-mono text-[11px] text-slate-200 mt-0.5">
                        {new Date(u.vipExpiresAt).toLocaleDateString('id-ID')}{' '}
                        {u.remainingDays !== undefined && u.remainingDays > 0 ? (
                          <span className="text-cyan-400">({u.remainingDays}h)</span>
                        ) : (
                          <span className="text-rose-400">(Expired)</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-500 text-[11px]">-</span>
                    )}
                  </div>
                </div>

                {/* UID monospace badge */}
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>UID:</span>
                  <span className="font-mono text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 truncate max-w-[200px]">
                    {u.uid}
                  </span>
                </div>

                {/* Mobile Touch Action Buttons (Min 44px height) */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      setRoleModalUser(u);
                      setTargetRole(isVip ? 'FREE' : 'VIP');
                      setTargetDays(30);
                    }}
                    className="flex-1 py-2.5 px-3 min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Ubah Role</span>
                  </button>

                  <button
                    onClick={() => {
                      setExtendModalUser(u);
                      setExtendDays(30);
                    }}
                    className="flex-1 py-2.5 px-3 min-h-[44px] rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>+30 Hari</span>
                  </button>

                  <button
                    onClick={() => handleResetWaSession(u)}
                    className="p-2.5 min-h-[44px] min-w-[44px] rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer flex items-center justify-center"
                    title="Reset Sesi WhatsApp"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block rounded-3xl bg-[#0a0f1d] border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0e1424] text-slate-400 text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Pengguna</th>
                <th className="py-3.5 px-4 font-semibold">UID Akun</th>
                <th className="py-3.5 px-4 font-semibold">Role & Akses</th>
                <th className="py-3.5 px-4 font-semibold">Status Masa Aktif</th>
                <th className="py-3.5 px-4 font-semibold">Kadaluwarsa VIP</th>
                <th className="py-3.5 px-4 font-semibold">Tanggal Daftar</th>
                <th className="py-3.5 px-4 font-semibold text-right">Aksi Manajemen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Tidak ada pengguna yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isVip = u.role === 'VIP';
                  const isVvip = u.role === 'VVIP';
                  const isFree = u.role === 'FREE';

                  return (
                    <tr key={u.uid} className="hover:bg-slate-900/50 transition-colors">
                      {/* Avatar & Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {u.photoURL ? (
                            <img
                              src={u.photoURL}
                              alt={u.displayName}
                              className="w-8 h-8 rounded-full border border-slate-700 object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-cyan-400 text-xs">
                              {u.displayName?.slice(0, 2).toUpperCase() || 'US'}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-200">{u.displayName}</div>
                            <div className="text-[10px] text-slate-400">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* UID */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-[10px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {u.uid}
                        </span>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold inline-flex items-center gap-1 ${
                            isVvip
                              ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                              : isVip
                              ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {isVvip && <Sparkles className="w-3 h-3 text-purple-400" />}
                          {isVip && <Crown className="w-3 h-3 text-amber-400" />}
                          <span>{u.role}</span>
                        </span>
                      </td>

                      {/* Membership Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            u.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : u.status === 'EXPIRED'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>

                      {/* Expiry */}
                      <td className="py-3.5 px-4 text-[11px] text-slate-300 font-mono">
                        {u.vipExpiresAt ? (
                          <div>
                            <div>{new Date(u.vipExpiresAt).toLocaleDateString('id-ID')}</div>
                            {u.remainingDays !== undefined && u.remainingDays > 0 ? (
                              <div className="text-[10px] text-cyan-400 font-sans">
                                (Sisa {u.remainingDays} hari)
                              </div>
                            ) : (
                              <div className="text-[10px] text-rose-400 font-sans">Expired</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      {/* Join Date */}
                      <td className="py-3.5 px-4 text-[10px] text-slate-400">
                        {new Date(u.createdAt).toLocaleDateString('id-ID')}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Role change button */}
                          <button
                            onClick={() => {
                              setRoleModalUser(u);
                              setTargetRole(isVip ? 'FREE' : 'VIP');
                              setTargetDays(30);
                            }}
                            className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[10px] font-bold transition-colors cursor-pointer"
                            title="Ubah Role Pengguna"
                          >
                            Ubah Role
                          </button>

                          {/* Extend VIP button */}
                          <button
                            onClick={() => {
                              setExtendModalUser(u);
                              setExtendDays(30);
                            }}
                            className="px-2 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold transition-colors cursor-pointer"
                            title="Tambah Masa Aktif VIP"
                          >
                            +30 Hari
                          </button>

                          {/* Reset Session button */}
                          <button
                            onClick={() => handleResetWaSession(u)}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-[10px] transition-colors cursor-pointer"
                            title="Reset Sesi WhatsApp Pengguna"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Change Modal */}
      {roleModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-[#0c1222] border border-cyan-500/30 p-6 shadow-2xl text-slate-200">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span>Ubah Hak Akses Role Pengguna</span>
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Pengguna: <strong className="text-white">{roleModalUser.displayName}</strong> ({roleModalUser.email})
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Pilih Role Baru</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['FREE', 'VIP', 'VVIP'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setTargetRole(r)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        targetRole === r
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {targetRole !== 'FREE' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Durasi Masa Aktif (Hari)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={targetDays}
                      onChange={(e) => setTargetDays(Number(e.target.value) || 30)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setTargetDays(30)}
                      className="px-2.5 py-2 text-xs rounded-xl bg-slate-800 text-slate-300 hover:text-white whitespace-nowrap cursor-pointer"
                    >
                      30 Hari
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetDays(365)}
                      className="px-2.5 py-2 text-xs rounded-xl bg-slate-800 text-slate-300 hover:text-white whitespace-nowrap cursor-pointer"
                    >
                      1 Tahun
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRoleModalUser(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApplyRoleChange}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white shadow-lg cursor-pointer"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extend VIP Modal */}
      {extendModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-[#0c1222] border border-cyan-500/30 p-6 shadow-2xl text-slate-200">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span>Perpanjang Masa Aktif VIP</span>
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Pengguna: <strong className="text-white">{extendModalUser.displayName}</strong>
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tambahan Durasi Hari
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[7, 14, 30, 90].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setExtendDays(d)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        extendDays === d
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      +{d} Hari
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={extendDays}
                  onChange={(e) => setExtendDays(Number(e.target.value) || 1)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setExtendModalUser(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApplyExtend}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg cursor-pointer"
              >
                Tambahkan Hari
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
