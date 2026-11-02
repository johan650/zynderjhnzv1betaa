import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  UserCheck,
  Send,
  Clock,
  Play,
  Pause,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Search,
  Filter,
  ShieldCheck,
  Image as ImageIcon,
  Trash2,
  History,
  Sparkles,
  Info,
  Check,
  Square,
  CheckSquare,
  Ban,
  MessageSquare,
  X,
} from 'lucide-react';
import { ApiClient } from '../../services/apiClient';
import { GroupMember, GroupMemberBroadcastJob } from '../../services/whatsapp/types';
import { formatBroadcastMessage } from '../../utils/broadcastEngine';
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';

interface GroupMemberDmBroadcastViewProps {
  user: any;
  userProfile: any;
  isVipActive: boolean;
  waStatus: any;
  availableGroups: any[];
  onOpenPaymentModal: () => void;
  logActivity: (activityType: string, description: string, status?: 'FAILED' | 'SUCCESS') => Promise<void>;
  renderVipLockedGate: (featureName: string) => React.ReactNode;
}

export const GroupMemberDmBroadcastView: React.FC<GroupMemberDmBroadcastViewProps> = ({
  user,
  userProfile,
  isVipActive,
  waStatus,
  availableGroups,
  onOpenPaymentModal,
  logActivity,
  renderVipLockedGate,
}) => {
  // Active step / sub-tab: 'broadcast' | 'history'
  const [activeTab, setActiveTab] = useState<'broadcast' | 'history'>('broadcast');

  // Step 1: Selected Group & Members
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [memberFetchError, setMemberFetchError] = useState<string | null>(null);

  // Step 2: Member Selection & Consent Management
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [consentFilter, setConsentFilter] = useState<'ALL' | 'CONSENTED' | 'NO_CONSENT' | 'OPT_OUT'>('ALL');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [optOutPhoneList, setOptOutPhoneList] = useState<string[]>([]);

  // Step 3: Message & Media Configuration
  const [messageText, setMessageText] = useState(
    'Halo kak {nama}! Kami dari komunitas {grup} ingin menginfokan penawaran & restock eksklusif untuk Anda hari ini. Balas STOP bila tidak berkenan menerima pesan.'
  );
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);

  // Step 4: Dispatch Settings
  const [delaySeconds, setDelaySeconds] = useState<number>(5);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Step 5: Live Execution & Monitoring State
  const [activeJob, setActiveJob] = useState<GroupMemberBroadcastJob | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const statusPollingRef = useRef<NodeJS.Timeout | null>(null);

  // Broadcast History (from Firestore & Server)
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Auto-select first group if available
  useEffect(() => {
    if (!selectedGroupId && availableGroups.length > 0) {
      handleSelectGroup(availableGroups[0].id);
    }
  }, [availableGroups]);

  // Load existing opt-outs from Firestore
  useEffect(() => {
    if (!user) return;
    const fetchOptOuts = async () => {
      try {
        const q = query(collection(db, 'opt_out_contacts'), where('uid', '==', user.uid), limit(200));
        const snap = await getDocs(q);
        const phones: string[] = [];
        snap.forEach((d) => {
          const data = d.data();
          if (data.phone) phones.push(data.phone.replace(/\D/g, ''));
        });
        setOptOutPhoneList(phones);
      } catch (e) {
        console.warn('Could not load opt-outs:', e);
      }
    };
    fetchOptOuts();
  }, [user]);

  // Fetch group members when group changes
  const handleSelectGroup = async (groupId: string) => {
    setSelectedGroupId(groupId);
    setMemberFetchError(null);
    setLoadingMembers(true);
    setMembers([]);
    setSelectedMemberIds([]);

    try {
      const res = await ApiClient.getGroupMembers(groupId);
      if (res && Array.isArray(res.members)) {
        // Tag opt-outs against optOutPhoneList
        const updated = res.members.map((m: GroupMember) => {
          const cleanPhone = m.phone.replace(/\D/g, '');
          const isOptOut = optOutPhoneList.includes(cleanPhone);
          return {
            ...m,
            optedOut: isOptOut,
            consentApproved: !isOptOut && !m.isUserSelf, // consent default active for valid other members
          };
        });
        setMembers(updated);

        // Preselect members who have consent approved and are not self
        const selectable = updated
          .filter((m: GroupMember) => m.consentApproved && !m.optedOut && !m.isUserSelf)
          .map((m: GroupMember) => m.id);
        setSelectedMemberIds(selectable);
      } else {
        setMembers([]);
      }
    } catch (err: any) {
      setMemberFetchError(err.message || 'Gagal mengambil data anggota grup dari WhatsApp.');
    } finally {
      setLoadingMembers(false);
    }
  };

  // Image upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran file maksimal adalah 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setMediaUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Toggle consent for a member
  const handleToggleConsent = (memberId: string) => {
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id === memberId) {
          const nextConsent = !m.consentApproved;
          if (!nextConsent) {
            setSelectedMemberIds((sel) => sel.filter((id) => id !== memberId));
          }
          return { ...m, consentApproved: nextConsent };
        }
        return m;
      })
    );
  };

  // Toggle opt-out for a member
  const handleToggleOptOut = async (member: GroupMember) => {
    const nextOptOut = !member.optedOut;
    setMembers((prev) =>
      prev.map((m) => (m.id === member.id ? { ...m, optedOut: nextOptOut, consentApproved: !nextOptOut } : m))
    );

    if (nextOptOut) {
      setSelectedMemberIds((sel) => sel.filter((id) => id !== member.id));
      setOptOutPhoneList((prev) => [...prev, member.phone]);

      try {
        await addDoc(collection(db, 'opt_out_contacts'), {
          uid: user?.uid,
          phone: member.phone,
          name: member.formattedPhone || member.phone,
          timestamp: serverTimestamp(),
          reason: 'Group Member Opt-Out',
        });
      } catch (e) {}
    } else {
      setOptOutPhoneList((prev) => prev.filter((p) => p !== member.phone));
    }
  };

  // Bulk consent actions
  const handleApproveAllConsent = () => {
    setMembers((prev) =>
      prev.map((m) => (!m.optedOut && !m.isUserSelf ? { ...m, consentApproved: true } : m))
    );
    const validIds = members
      .filter((m) => !m.optedOut && !m.isUserSelf)
      .map((m) => m.id);
    setSelectedMemberIds(validIds);
  };

  const handleSelectAllConsented = () => {
    const consentedIds = members
      .filter((m) => m.consentApproved && !m.optedOut && !m.isUserSelf)
      .map((m) => m.id);
    setSelectedMemberIds(consentedIds);
  };

  const handleDeselectAll = () => {
    setSelectedMemberIds([]);
  };

  const handleToggleMemberSelect = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  // Filtered members list
  const filteredMembers = members.filter((m) => {
    const queryMatch =
      m.phone.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
      m.formattedPhone.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
      m.id.toLowerCase().includes(memberSearchQuery.toLowerCase());

    if (!queryMatch) return false;

    if (consentFilter === 'CONSENTED') return m.consentApproved && !m.optedOut;
    if (consentFilter === 'NO_CONSENT') return !m.consentApproved && !m.optedOut;
    if (consentFilter === 'OPT_OUT') return m.optedOut;
    return true;
  });

  // Eligible count
  const eligibleMembers = members.filter(
    (m) => m.consentApproved && !m.optedOut && !m.isUserSelf && selectedMemberIds.includes(m.id)
  );

  // Polling for active broadcast status
  useEffect(() => {
    if (!isBroadcasting) {
      if (statusPollingRef.current) {
        clearInterval(statusPollingRef.current);
        statusPollingRef.current = null;
      }
      return;
    }

    const pollStatus = async () => {
      try {
        const res = await ApiClient.getGroupMemberDmBroadcastStatus();
        if (res && res.job) {
          setActiveJob(res.job);
          if (res.job.status === 'COMPLETED' || res.job.status === 'STOPPED' || res.job.status === 'FAILED') {
            setIsBroadcasting(false);
            if (statusPollingRef.current) {
              clearInterval(statusPollingRef.current);
              statusPollingRef.current = null;
            }

            // Save to Firestore
            try {
              await addDoc(collection(db, 'group_member_broadcasts'), {
                userId: user?.uid,
                groupId: res.job.groupId,
                groupName: res.job.groupName,
                eligibleRecipientIds: res.job.logs.map((l: any) => l.phone),
                consentStatus: 'VERIFIED_CONSENT',
                message: res.job.message,
                mediaUrl: res.job.mediaUrl || null,
                deliveryStatus: res.job.status,
                totalEligible: res.job.total,
                successCount: res.job.successCount,
                failedCount: res.job.failedCount,
                timestamp: serverTimestamp(),
                completedAt: res.job.completedAt || new Date().toISOString(),
              });
            } catch (fsErr) {
              console.warn('Could not save group_member_broadcast to Firestore:', fsErr);
            }

            await logActivity(
              'Group Member DM Broadcast Finished',
              `Selesai mengirim DM ke anggota grup "${res.job.groupName}": ${res.job.successCount} berhasil, ${res.job.failedCount} gagal dari ${res.job.total} anggota.`,
              res.job.successCount > 0 ? 'SUCCESS' : 'FAILED'
            );
          }
        }
      } catch (err) {
        console.warn('Error polling broadcast status:', err);
      }
    };

    pollStatus();
    statusPollingRef.current = setInterval(pollStatus, 2000);

    return () => {
      if (statusPollingRef.current) {
        clearInterval(statusPollingRef.current);
        statusPollingRef.current = null;
      }
    };
  }, [isBroadcasting]);

  // Start Broadcast Execution
  const handleStartBroadcast = async () => {
    setShowConfirmModal(false);

    if (eligibleMembers.length === 0) {
      alert('Tidak ada anggota grup terpilih yang memiliki status persetujuan aktif.');
      return;
    }

    if (!messageText.trim()) {
      alert('Teks pesan broadcast tidak boleh kosong.');
      return;
    }

    const currentGroup = availableGroups.find((g) => g.id === selectedGroupId);
    setActionLoading(true);

    try {
      const payload = {
        groupId: selectedGroupId,
        groupName: currentGroup?.name || 'Grup WhatsApp',
        recipients: eligibleMembers.map((m) => ({
          id: m.id,
          phone: m.phone,
          formattedPhone: m.formattedPhone,
          consentApproved: true,
          optedOut: false,
        })),
        message: messageText,
        mediaUrl: mediaUrl || null,
        delaySeconds: Math.max(3, delaySeconds),
        optOutNumbers: optOutPhoneList,
      };

      const res = await ApiClient.startGroupMemberDmBroadcast(payload);
      if (res && res.job) {
        setActiveJob(res.job);
        setIsBroadcasting(true);

        await logActivity(
          'Group Member DM Broadcast Started',
          `Memulai broadcast DM pribadi ke ${payload.recipients.length} anggota di grup "${payload.groupName}" dengan jeda ${payload.delaySeconds}s.`,
          'SUCCESS'
        );
      }
    } catch (err: any) {
      alert(`Gagal memulai broadcast: ${err.message || 'Terjadi kesalahan pada backend'}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Pause Broadcast
  const handlePauseBroadcast = async () => {
    setActionLoading(true);
    try {
      await ApiClient.pauseGroupMemberDmBroadcast();
      if (activeJob) {
        setActiveJob({ ...activeJob, status: 'PAUSED' });
      }
    } catch (err: any) {
      alert(err.message || 'Gagal menjeda broadcast');
    } finally {
      setActionLoading(false);
    }
  };

  // Resume Broadcast
  const handleResumeBroadcast = async () => {
    setActionLoading(true);
    try {
      await ApiClient.resumeGroupMemberDmBroadcast();
      if (activeJob) {
        setActiveJob({ ...activeJob, status: 'RUNNING' });
      }
    } catch (err: any) {
      alert(err.message || 'Gagal melanjutkan broadcast');
    } finally {
      setActionLoading(false);
    }
  };

  // Stop Broadcast
  const handleStopBroadcast = async () => {
    if (!window.confirm('Apakah Anda yakin ingin menghentikan proses broadcast ini sekarang?')) {
      return;
    }
    setActionLoading(true);
    try {
      await ApiClient.stopGroupMemberDmBroadcast();
      if (activeJob) {
        setActiveJob({ ...activeJob, status: 'STOPPED' });
      }
      setIsBroadcasting(false);
    } catch (err: any) {
      alert(err.message || 'Gagal menghentikan broadcast');
    } finally {
      setActionLoading(false);
    }
  };

  // Load History
  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const q = query(
        collection(db, 'group_member_broadcasts'),
        where('userId', '==', user?.uid),
        orderBy('timestamp', 'desc'),
        limit(20)
      );
      const snap = await getDocs(q);
      const items: any[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      setHistoryList(items);
    } catch (e) {
      // Fallback to server memory history
      try {
        const res = await ApiClient.getGroupMemberDmBroadcastHistory();
        if (res && res.history) {
          setHistoryList(res.history);
        }
      } catch {}
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  if (!isVipActive) {
    return renderVipLockedGate('Group Member DM Broadcast') as React.ReactElement;
  }

  const selectedGroup = availableGroups.find((g) => g.id === selectedGroupId);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0c1428] via-[#0f172a] to-[#1e1338] border border-cyan-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-1.5">
              <UserCheck className="w-4 h-4" />
              <span>Modul Promosi 1-on-1 Resmi (VIP & VVIP)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white">
              Group Member DM Broadcast
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Kirimkan pesan promosi secara langsung dan pribadi (1-on-1 DM) ke anggota grup WhatsApp yang telah memberikan persetujuan (Consent & Opt-In), dengan kontrol jeda anti-blokir dan integrasi socket Baileys riil.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <button
              onClick={() => setActiveTab('broadcast')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                activeTab === 'broadcast'
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Buat Broadcast DM</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                activeTab === 'history'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Riwayat DM ({historyList.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* WhatsApp Connection Warning if disconnected */}
      {waStatus?.status !== 'CONNECTED' && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-200 leading-relaxed">
            <strong className="text-white block font-semibold mb-0.5">WhatsApp Anda Belum Terhubung:</strong>
            Untuk mengirim pesan DM 1-on-1 ke anggota grup, Anda harus menautkan perangkat di menu <strong>WhatsApp Connection</strong> terlebih dahulu.
          </div>
        </div>
      )}

      {/* ACTIVE BROADCAST MONITORING PANEL (Real-time progress, Pause, Resume, Stop) */}
      {activeJob && (isBroadcasting || activeJob.status === 'RUNNING' || activeJob.status === 'PAUSED') && (
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-[#11192e] to-[#0c1222] border-2 border-cyan-500/50 shadow-2xl space-y-5 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    activeJob.status === 'PAUSED' ? 'bg-amber-400' : 'bg-emerald-400'
                  }`} />
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${
                    activeJob.status === 'PAUSED' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`} />
                </span>
                <span className="text-sm font-extrabold text-white">
                  {activeJob.status === 'PAUSED' ? 'Broadcast Dijeda (Paused)' : 'Broadcast Sedang Berjalan...'}
                </span>
                <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  {activeJob.groupName}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Sedang memproses penerima: <strong className="text-cyan-300 font-mono">{activeJob.currentRecipient || 'Memulai...'}</strong>
              </p>
            </div>

            {/* Real-time Control Buttons */}
            <div className="flex items-center gap-2">
              {activeJob.status === 'RUNNING' ? (
                <button
                  onClick={handlePauseBroadcast}
                  disabled={actionLoading}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Jeda broadcast sementara"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>Jeda</span>
                </button>
              ) : (
                <button
                  onClick={handleResumeBroadcast}
                  disabled={actionLoading}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Lanjutkan broadcast"
                >
                  <Play className="w-3.5 h-3.5 fill-emerald-300" />
                  <span>Lanjutkan</span>
                </button>
              )}

              <button
                onClick={handleStopBroadcast}
                disabled={actionLoading}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="Hentikan broadcast secara permanen"
              >
                <Square className="w-3.5 h-3.5 fill-rose-300" />
                <span>Hentikan</span>
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-300">
                Progres: {activeJob.processed} dari {activeJob.total} Anggota
              </span>
              <span className="text-cyan-400 font-mono font-bold">
                {Math.round((activeJob.processed / Math.max(1, activeJob.total)) * 100)}%
              </span>
            </div>
            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-700">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.round((activeJob.processed / Math.max(1, activeJob.total)) * 100))}%`,
                }}
              />
            </div>
          </div>

          {/* Stats Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Total Target</span>
              <div className="text-lg font-mono font-bold text-white mt-0.5">{activeJob.total}</div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
              <span className="text-[10px] text-emerald-400 font-semibold uppercase">Berhasil Terkirim</span>
              <div className="text-lg font-mono font-bold text-emerald-300 mt-0.5">{activeJob.successCount}</div>
            </div>
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
              <span className="text-[10px] text-rose-400 font-semibold uppercase">Gagal</span>
              <div className="text-lg font-mono font-bold text-rose-300 mt-0.5">{activeJob.failedCount}</div>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
              <span className="text-[10px] text-amber-400 font-semibold uppercase">Dilewati / Opt-Out</span>
              <div className="text-lg font-mono font-bold text-amber-300 mt-0.5">{activeJob.skippedCount}</div>
            </div>
          </div>

          {/* Live Delivery Log Stream */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-300">Log Pengiriman Real-time:</span>
            <div className="max-h-40 overflow-y-auto rounded-xl bg-slate-950/90 border border-slate-800 p-2.5 space-y-1.5 font-mono text-[11px]">
              {activeJob.logs.length === 0 ? (
                <div className="text-slate-500 text-center py-2">Menyiapkan antrean pesan...</div>
              ) : (
                activeJob.logs.map((log, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1 px-2 rounded bg-slate-900/60 border border-slate-800/60">
                    <div className="flex items-center gap-2 truncate">
                      {log.status === 'SUCCESS' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      )}
                      <span className="text-white font-semibold truncate">{log.target}</span>
                      <span className="text-slate-500 text-[10px]">({log.phone})</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                          log.status === 'SUCCESS'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {log.status === 'SUCCESS' ? 'DELIVERED' : log.error || 'FAILED'}
                      </span>
                      <span className="text-slate-500 text-[9px]">{log.timestamp}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MAIN VIEW: BROADCAST WORKFLOW */}
      {activeTab === 'broadcast' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: GROUP & MEMBER SELECTION (7 Cols) */}
          <div className="lg:col-span-7 space-y-5">
            {/* 1. Pilih Grup Sumber */}
            <div className="p-5 rounded-2xl bg-[#0c101d] border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-xs font-bold">
                    1
                  </div>
                  <h3 className="text-sm font-bold text-white">Pilih Grup Sumber Penerima</h3>
                </div>
                <span className="text-[11px] text-slate-400">
                  {availableGroups.length} Grup Terhubung
                </span>
              </div>

              {availableGroups.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400 space-y-1">
                  <div>Belum ada grup yang terbaca dari WhatsApp Anda.</div>
                  <div className="text-[11px] text-slate-500">Pastikan nomor WhatsApp Anda sudah bergabung ke minimal 1 grup.</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {availableGroups.map((group) => {
                    const isSelected = selectedGroupId === group.id;
                    return (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => handleSelectGroup(group.id)}
                        className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500/10 border-cyan-500 text-white shadow-md shadow-cyan-500/10'
                            : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        {group.pictureUrl ? (
                          <img
                            src={group.pictureUrl}
                            alt={group.name}
                            className="w-10 h-10 rounded-full object-cover border border-slate-700 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 shrink-0 font-bold text-xs">
                            {group.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold truncate text-white">{group.name}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                            <Users className="w-3 h-3 text-cyan-400" />
                            <span>{group.memberCount} Anggota</span>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Daftar Anggota Grup & Manajemen Persetujuan (Consent) */}
            <div className="p-5 rounded-2xl bg-[#0c101d] border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-xs font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Daftar Anggota & Status Persetujuan (Consent)
                    </h3>
                    <div className="text-[11px] text-slate-400">
                      Grup: <strong className="text-cyan-300">{selectedGroup?.name || 'Belum dipilih'}</strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleApproveAllConsent}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 cursor-pointer"
                    title="Setujui persetujuan untuk seluruh anggota yang bukan opt-out"
                  >
                    Setujui Semua (Opt-In)
                  </button>
                  <button
                    onClick={handleSelectAllConsented}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-semibold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 cursor-pointer"
                  >
                    Pilih Semua ({members.filter((m) => m.consentApproved && !m.optedOut && !m.isUserSelf).length})
                  </button>
                  <button
                    onClick={handleDeselectAll}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              </div>

              {/* Notice Kepatuhan & Persetujuan */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-cyan-500/20 flex items-start gap-2.5 text-[11px] text-slate-300 leading-relaxed">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Protokol Kepatuhan Anti-Spam:</strong> Pesan broadcast DM 1-on-1 hanya dikirimkan kepada anggota yang telah memiliki status <strong>Persetujuan (Consent Approved)</strong> dan tidak berada dalam daftar <strong>Opt-Out</strong>.
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    placeholder="Cari nomor atau peran anggota..."
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  {(
                    [
                      { id: 'ALL', label: 'Semua' },
                      { id: 'CONSENTED', label: 'Menyetujui' },
                      { id: 'NO_CONSENT', label: 'Belum Izin' },
                      { id: 'OPT_OUT', label: 'Opt-Out' },
                    ] as const
                  ).map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setConsentFilter(filter.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer whitespace-nowrap transition-colors ${
                        consentFilter === filter.id
                          ? 'bg-cyan-500 text-white'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Members Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/80">
                {loadingMembers ? (
                  <div className="py-10 text-center space-y-2">
                    <RotateCw className="w-6 h-6 text-cyan-400 animate-spin mx-auto" />
                    <div className="text-xs text-slate-400">Mengambil daftar anggota dari WhatsApp...</div>
                  </div>
                ) : memberFetchError ? (
                  <div className="py-8 px-4 text-center space-y-2">
                    <AlertCircle className="w-6 h-6 text-rose-400 mx-auto" />
                    <div className="text-xs text-rose-300 font-semibold">{memberFetchError}</div>
                    <button
                      onClick={() => handleSelectGroup(selectedGroupId)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 cursor-pointer"
                    >
                      Coba Muat Ulang
                    </button>
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    Tidak ada anggota yang cocok dengan pencarian / filter ini.
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/80">
                    {filteredMembers.map((member) => {
                      const isSelected = selectedMemberIds.includes(member.id);
                      const isSelectable = member.consentApproved && !member.optedOut && !member.isUserSelf;

                      return (
                        <div
                          key={member.id}
                          className={`p-3 flex items-center justify-between gap-3 text-xs transition-colors ${
                            member.optedOut
                              ? 'bg-rose-500/5 opacity-70'
                              : isSelected
                              ? 'bg-cyan-500/5'
                              : 'hover:bg-slate-900/50'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={!isSelectable}
                              onChange={() => handleToggleMemberSelect(member.id)}
                              className="accent-cyan-500 rounded cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-white truncate">
                                  {member.formattedPhone}
                                </span>
                                {member.isUserSelf && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                    Anda (Self)
                                  </span>
                                )}
                                {member.role !== 'member' && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30">
                                    {member.role.toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
                                JID: {member.id}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Consent Badge */}
                            {member.optedOut ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                                <Ban className="w-3 h-3" />
                                <span>Opt-Out</span>
                              </span>
                            ) : member.consentApproved ? (
                              <button
                                type="button"
                                onClick={() => handleToggleConsent(member.id)}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 cursor-pointer flex items-center gap-1"
                                title="Klik untuk mengubah status persetujuan"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Menyetujui</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleConsent(member.id)}
                                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700 cursor-pointer"
                                title="Klik untuk memberi tanda persetujuan"
                              >
                                Belum Disetujui
                              </button>
                            )}

                            {/* Opt-out toggle */}
                            <button
                              type="button"
                              onClick={() => handleToggleOptOut(member)}
                              className={`p-1.5 rounded-lg border text-[10px] cursor-pointer transition-colors ${
                                member.optedOut
                                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20'
                                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-rose-400'
                              }`}
                              title={member.optedOut ? 'Batalkan opt-out' : 'Tandai anggota ini sebagai Opt-Out'}
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: MESSAGE CONFIGURATION & DISPATCH (5 Cols) */}
          <div className="lg:col-span-5 space-y-5">
            {/* 3. Konfigurasi Pesan & Media */}
            <div className="p-5 rounded-2xl bg-[#0c101d] border border-slate-800 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-xs font-bold">
                  3
                </div>
                <h3 className="text-sm font-bold text-white">Konfigurasi Pesan & Media</h3>
              </div>

              {/* Message Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Isi Pesan Promosi 1-on-1:
                </label>
                <textarea
                  rows={4}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Ketik pesan promosi..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 leading-relaxed"
                />

                {/* Token Chips */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-400">Token:</span>
                  {['{nama}', '{nomor}', '{grup}'].map((token) => (
                    <button
                      key={token}
                      type="button"
                      onClick={() => setMessageText((prev) => `${prev} ${token}`)}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 cursor-pointer"
                    >
                      + {token}
                    </button>
                  ))}
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Lampiran Gambar (Opsional — Gambar + Caption)
                </label>
                {mediaUrl ? (
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={mediaUrl}
                        alt="Preview"
                        className="w-12 h-12 rounded-lg object-cover border border-slate-700 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">Gambar Siap Dikirim</div>
                        <div className="text-[10px] text-emerald-400 mt-0.5">Format: Gambar + Caption</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMediaUrl(null)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 cursor-pointer"
                      title="Hapus gambar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-700 hover:border-cyan-500/50 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors bg-slate-900/40">
                    <ImageIcon className="w-5 h-5 text-slate-400" />
                    <div className="text-xs text-slate-300 font-medium">Unggah Gambar Promosi</div>
                    <div className="text-[10px] text-slate-500">Mendukung JPG, PNG, WebP (Maks 5MB)</div>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                )}
              </div>

              {/* 4. Pengaturan Pengiriman */}
              <div className="pt-2 border-t border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Jeda Pengiriman Antar Anggota</span>
                  </label>
                  <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
                    {delaySeconds} Detik
                  </span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={30}
                  step={1}
                  value={delaySeconds}
                  onChange={(e) => setDelaySeconds(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Min 3 Detik</span>
                  <span className="text-cyan-400 font-medium">Default Rekomendasi: 5 Detik</span>
                  <span>Maks 30 Detik</span>
                </div>
              </div>

              {/* Summary & Start Button */}
              <div className="pt-2 space-y-3">
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-300">
                    <span>Anggota Terpilih & Menyetujui:</span>
                    <strong className="text-white font-mono">{eligibleMembers.length} Kontak</strong>
                  </div>
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>Estimasi Waktu Pengiriman:</span>
                    <span className="font-mono text-cyan-300">
                      ~{Math.ceil((eligibleMembers.length * delaySeconds) / 60)} Menit
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowConfirmModal(true)}
                  disabled={
                    eligibleMembers.length === 0 ||
                    !messageText.trim() ||
                    waStatus?.status !== 'CONNECTED' ||
                    isBroadcasting
                  }
                  className="w-full py-3.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Mulai Broadcast ke {eligibleMembers.length} Anggota</span>
                </button>
              </div>
            </div>

            {/* Live Message Preview (Mockup WhatsApp Chat) */}
            <div className="p-5 rounded-2xl bg-[#0c101d] border border-slate-800 space-y-3">
              <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Preview Pesan WhatsApp (1-on-1):</span>
                <span className="text-[10px] text-slate-500">Mockup WhatsApp Web</span>
              </div>

              <div className="p-4 rounded-xl bg-[#0b141a] border border-slate-800 shadow-inner">
                <div className="max-w-[340px] ml-auto rounded-lg bg-[#005c4b] text-white p-2.5 shadow text-xs space-y-2">
                  {mediaUrl && (
                    <img
                      src={mediaUrl}
                      alt="Attachment"
                      className="w-full max-h-48 object-cover rounded-md"
                    />
                  )}
                  <div className="whitespace-pre-wrap leading-relaxed text-[11px] font-sans">
                    {formatBroadcastMessage(messageText, {
                      nama: eligibleMembers[0]?.formattedPhone || 'Member Komunitas',
                      nomor: eligibleMembers[0]?.phone || '628123456789',
                      grup: selectedGroup?.name || 'Grup WhatsApp',
                    })}
                  </div>
                  <div className="flex items-center justify-end gap-1 text-[9px] text-[#8696a0]">
                    <span>
                      {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <Check className="w-3 h-3 text-[#53bdeb] stroke-[3]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* HISTORY TAB */
        <div className="p-6 rounded-2xl bg-[#0c101d] border border-slate-800 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Riwayat Group Member DM Broadcast</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Catatan pengiriman pesan promosi 1-on-1 ke anggota grup WhatsApp yang tersimpan di Firebase.
              </p>
            </div>
            <button
              onClick={loadHistory}
              disabled={loadingHistory}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
              <span>Segarkan</span>
            </button>
          </div>

          {loadingHistory ? (
            <div className="py-10 text-center text-xs text-slate-500">Memuat riwayat broadcast...</div>
          ) : historyList.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              Belum ada riwayat broadcast DM anggota grup yang tercatat.
            </div>
          ) : (
            <div className="space-y-3">
              {historyList.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>Grup Sumber: {item.groupName}</span>
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                          {item.deliveryStatus || 'COMPLETED'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                        ID: {item.id || item.jobId} • {item.timestamp?.seconds ? new Date(item.timestamp.seconds * 1000).toLocaleString('id-ID') : item.timestamp || item.startedAt}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="text-emerald-400 font-bold">{item.successCount} Berhasil</span>
                      <span className="text-rose-400 font-bold">{item.failedCount} Gagal</span>
                      <span className="text-slate-400">Total: {item.totalEligible || item.total}</span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-300 bg-slate-950 p-3 rounded-lg font-sans whitespace-pre-wrap leading-relaxed">
                    {item.message}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0f1422] border border-slate-800 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Send className="w-5 h-5 text-cyan-400" />
                <span>Konfirmasi Group Member DM Broadcast</span>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Grup Sumber:</span>
                  <strong className="text-white">{selectedGroup?.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Penerima Memenuhi Syarat:</span>
                  <strong className="text-cyan-400 font-mono">{eligibleMembers.length} Anggota (Consented)</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Jeda Antar Pesan:</span>
                  <strong className="text-white font-mono">{delaySeconds} Detik</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Lampiran Media:</span>
                  <strong className="text-white">{mediaUrl ? 'Ya (Gambar + Caption)' : 'Teks Saja'}</strong>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-200 leading-relaxed">
                <strong className="text-white block font-semibold mb-0.5">Jaminan Kepatuhan:</strong>
                Pesan hanya akan dikirimkan secara pribadi ke nomor yang telah menyetujui promosi. Anggota yang opt-out atau belum izin akan otomatis dilewati.
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleStartBroadcast}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 shadow-md cursor-pointer"
              >
                Ya, Mulai Pengiriman Riil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
