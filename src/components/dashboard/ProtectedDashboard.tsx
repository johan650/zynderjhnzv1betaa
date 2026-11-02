import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  QrCode,
  Users,
  Radio,
  Send,
  History,
  Crown,
  Settings,
  LogOut,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  ShieldCheck,
  RotateCw,
  Search,
  Filter,
  Sparkles,
  Lock,
  ChevronRight,
  Clock,
  Activity,
  Play,
  Save,
  AlertTriangle,
  Upload,
  Info,
  ShieldAlert,
  Copy,
  Check,
  RefreshCw,
  Image as ImageIcon,
  Trash2,
  UserPlus,
  Ban,
  CheckSquare,
  Square,
  Pause,
  X,
  UserCheck,
  Menu,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, limit, onSnapshot, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { formatBroadcastMessage } from '../../utils/broadcastEngine';
import { ApiClient, MembershipResponse } from '../../services/apiClient';
import { VipPaymentModal } from './VipPaymentModal';
import { GroupMemberDmBroadcastView } from './GroupMemberDmBroadcastView';

type DashboardView =
  | 'overview'
  | 'connection'
  | 'group'
  | 'group-dm'
  | 'channel'
  | 'contact'
  | 'history'
  | 'membership'
  | 'settings'
  | 'admin';

interface ActivityItem {
  id: string;
  activityType: string;
  description: string;
  timestamp: any;
  status: string;
}

export const ProtectedDashboard: React.FC<{ onReturnToLanding: () => void }> = ({
  onReturnToLanding,
}) => {
  const { user, userProfile, signOutUser, logActivity, updateProfileDetails } = useAuth();
  const [currentView, setCurrentView] = useState<DashboardView>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  // Server-authoritative Membership State
  const [membership, setMembership] = useState<MembershipResponse | null>(null);
  const [loadingMembership, setLoadingMembership] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Manual QRIS payment transactions state
  const [userTransactions, setUserTransactions] = useState<any[]>([]);
  const [activePendingPayment, setActivePendingPayment] = useState<any | null>(null);
  const [approvedNotification, setApprovedNotification] = useState<any | null>(null);
  const [rejectedNotification, setRejectedNotification] = useState<any | null>(null);
  const [adminWorkingHours, setAdminWorkingHours] = useState<string>('Senin - Minggu: 08:00 - 22:00 WIB');
  const [resubmitTargetId, setResubmitTargetId] = useState<string | null>(null);
  const [isAcknowledging, setIsAcknowledging] = useState(false);

  // Real WhatsApp Connection State
  const [waStatus, setWaStatus] = useState<any>(null);
  const [loadingWaStatus, setLoadingWaStatus] = useState(false);
  const [pairingInputPhone, setPairingInputPhone] = useState('081234567890');
  const [connectionMessage, setConnectionMessage] = useState<string | null>(null);
  const [connectionMode, setConnectionMode] = useState<'qr' | 'pairing'>('qr');
  const [copiedPairingCode, setCopiedPairingCode] = useState(false);

  // Group Broadcast Real State
  const [availableGroups, setAvailableGroups] = useState<Array<{ id: string; name: string; memberCount: number; pictureUrl?: string | null; isAdmin?: boolean }>>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [groupMessageText, setGroupMessageText] = useState(
    '🔥 PROMO RESMI ZYNDERJHNZV1BETA\n\nHalo rekan-rekan! Stok akun dan layanan digital terverifikasi telah tersedia. Silakan hubungi admin sekarang.'
  );
  const [groupMediaUrl, setGroupMediaUrl] = useState<string | null>(null);
  const [groupDelaySeconds, setGroupDelaySeconds] = useState(5);
  const [isGroupBroadcasting, setIsGroupBroadcasting] = useState(false);
  const [groupProgress, setGroupProgress] = useState<{
    currentIdx: number;
    total: number;
    successCount: number;
    failedCount: number;
    currentTargetName: string;
    isStopping: boolean;
    isDone: boolean;
    startedAt: string;
    logs: Array<{ id: string; target: string; status: 'SUCCESS' | 'FAILED'; messageId?: string; error?: string; time: string }>;
  } | null>(null);
  const [showGroupConfirmModal, setShowGroupConfirmModal] = useState(false);
  const groupAbortRef = useRef(false);

  // Contact Broadcast Real State
  const [contactList, setContactList] = useState<Array<{
    id: string;
    name: string;
    phone: string;
    tag: string;
    consentApproved: boolean;
    optedOut?: boolean;
  }>>([
    { id: 'c1', name: 'Aldo Akun JB', phone: '081234567890', tag: 'JB Akun', consentApproved: true, optedOut: false },
    { id: 'c2', name: 'Kurnia Reseller', phone: '085712345678', tag: 'Reseller', consentApproved: true, optedOut: false },
    { id: 'c3', name: 'Desta Digital', phone: '082199887766', tag: 'Jasa Digital', consentApproved: true, optedOut: false },
    { id: 'c4', name: 'Rian Topup Store', phone: '089611223344', tag: 'Pebisnis Online', consentApproved: true, optedOut: false },
    { id: 'c5', name: 'Budi (Opt-Out Sample)', phone: '081999887711', tag: 'JB Akun', consentApproved: false, optedOut: true },
  ]);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>(['c1', 'c2', 'c3', 'c4']);
  const [contactMessageText, setContactMessageText] = useState('Halo kak {nama}! Penawaran khusus dan restock fresh untuk Anda hari ini.');
  const [contactMediaUrl, setContactMediaUrl] = useState<string | null>(null);
  const [contactDelaySeconds, setContactDelaySeconds] = useState(5);
  const [isContactBroadcasting, setIsContactBroadcasting] = useState(false);
  const [contactProgress, setContactProgress] = useState<{
    currentIdx: number;
    total: number;
    successCount: number;
    failedCount: number;
    skippedCount: number;
    currentTargetName: string;
    isStopping: boolean;
    isDone: boolean;
    startedAt: string;
    logs: Array<{ phone: string; name: string; status: 'SUCCESS' | 'FAILED' | 'OPTED_OUT'; messageId?: string; error?: string; time: string }>;
  } | null>(null);
  const [showContactConfirmModal, setShowContactConfirmModal] = useState(false);
  const contactAbortRef = useRef(false);

  // Contact Filter & Modal State
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [contactTagFilter, setContactTagFilter] = useState('ALL');
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactTag, setNewContactTag] = useState('JB Akun');
  const [newContactConsent, setNewContactConsent] = useState(true);

  // Profile Edit State
  const [displayNameInput, setDisplayNameInput] = useState(userProfile?.displayName || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  // Admin Control State
  const [adminTargetUid, setAdminTargetUid] = useState('');
  const [adminTier, setAdminTier] = useState('VIP');
  const [adminDays, setAdminDays] = useState(30);
  const [adminActionMessage, setAdminActionMessage] = useState<string | null>(null);

  const isAdmin =
    user?.email === 'sumiyatun993@gmail.com' ||
    user?.email === 'jhnz.co.id@gmail.com' ||
    userProfile?.role === 'admin';

  // Check VIP Access Status
  const isVipActive = Boolean(membership?.isVipActive) || isAdmin;

  // Refresh server-authoritative membership status
  const refreshMembership = async () => {
    if (!user) return;
    try {
      const data = await ApiClient.getMembershipStatus();
      setMembership(data);
    } catch (err) {
      console.error('Failed to load membership:', err);
    } finally {
      setLoadingMembership(false);
    }
  };

  // Refresh user transactions & check approval/rejection statuses
  const refreshMyTransactions = async () => {
    if (!user) return;
    try {
      const [txData, settingsData] = await Promise.all([
        ApiClient.getMyTransactions(),
        ApiClient.getPublicSettings().catch(() => null),
      ]);

      if (settingsData?.adminWorkingHours) {
        setAdminWorkingHours(settingsData.adminWorkingHours);
      }

      const payments = txData.payments || [];
      setUserTransactions(payments);
      setActivePendingPayment(txData.activePending || null);

      // Check if there is an unacknowledged APPROVED payment
      const approved = payments.find(
        (p: any) => p.status === 'APPROVED' && !p.acknowledgedAt
      );
      if (approved) {
        setApprovedNotification(approved);
      } else {
        setApprovedNotification(null);
      }

      // Check if latest transaction is REJECTED
      const latest = payments[0];
      if (latest && latest.status === 'REJECTED') {
        setRejectedNotification(latest);
      } else {
        setRejectedNotification(null);
      }
    } catch (err) {
      console.warn('Could not refresh user transactions:', err);
    }
  };

  const handleAcknowledgeApproval = async () => {
    setIsAcknowledging(true);
    try {
      await ApiClient.acknowledgeApproval(approvedNotification?.id || undefined);
      setApprovedNotification(null);
      await refreshMembership();
      await refreshWaStatus();
      await refreshMyTransactions();
      setCurrentView('overview');
    } catch (err: any) {
      alert(err.message || 'Gagal mengonfirmasi aktivasi VIP.');
    } finally {
      setIsAcknowledging(false);
    }
  };

  // Refresh WhatsApp connection status from provider
  const refreshWaStatus = async () => {
    if (!user || !isVipActive) return;
    setLoadingWaStatus(true);
    try {
      const res = await ApiClient.getWhatsAppStatus();
      setWaStatus(res.status);
    } catch (err: any) {
      setWaStatus({ status: 'DISCONNECTED', lastError: err.message });
    } finally {
      setLoadingWaStatus(false);
    }
  };

  // Refresh available groups from connected WhatsApp session
  const refreshGroups = async () => {
    if (!user || !isVipActive) return;
    try {
      const res = await ApiClient.getWhatsAppGroups();
      const groups = res.groups || [];
      setAvailableGroups(groups);
      setSelectedGroupIds(groups.map((g: any) => g.id));
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    }
  };

  // Initialize data on mount & start transaction polling
  useEffect(() => {
    refreshMembership();
    refreshMyTransactions();

    // Poll payment status every 6 seconds to capture admin approval/rejection in real-time
    const interval = setInterval(() => {
      refreshMyTransactions();
    }, 6000);

    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (isVipActive) {
      refreshWaStatus();
      refreshGroups();
    }
  }, [isVipActive]);

  // Real-time WhatsApp Server-Sent Events (SSE) listener & Firestore sync
  useEffect(() => {
    if (!user || !isVipActive) return;

    let cleanup: (() => void) | undefined;
    let isMounted = true;

    ApiClient.subscribeWhatsAppEvents(
      async (incomingState) => {
        if (!isMounted) return;
        setWaStatus(incomingState);

        if (incomingState.status === 'CONNECTED') {
          refreshGroups();
        }

        // Sync authoritative backend state to Firestore as per requirement 9
        try {
          await setDoc(
            doc(db, 'whatsapp_connections', user.uid),
            {
              uid: user.uid,
              connectionId: `wa-conn-${user.uid}`,
              connectionStatus: incomingState.status,
              phoneNumber: incomingState.phoneNumber || null,
              pushName: incomingState.pushName || null,
              lastConnectedAt: incomingState.connectedAt || null,
              lastHeartbeatAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              lastErrorCode: incomingState.lastError || null,
            },
            { merge: true }
          );
        } catch (fsErr) {
          console.warn('Could not sync connection state to Firestore:', fsErr);
        }
      },
      (err) => {
        console.warn('[SSE] EventSource connection retry...', err);
      }
    ).then((unsub) => {
      if (isMounted) cleanup = unsub;
      else if (unsub) unsub();
    });

    return () => {
      isMounted = false;
      if (cleanup) cleanup();
    };
  }, [user, isVipActive]);

  // Firestore real-time listener for user activities
  useEffect(() => {
    if (!user) return;

    try {
      const q = query(
        collection(db, 'user_activity'),
        where('uid', '==', user.uid),
        limit(20)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const items: ActivityItem[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            items.push({
              id: doc.id,
              activityType: data.activityType || 'Aktivitas',
              description: data.description || '',
              timestamp: data.timestamp,
              status: data.status || 'SUCCESS',
            });
          });
          items.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
          setActivities(items);
          setLoadingActivities(false);
        },
        (error) => {
          console.error('Error fetching activities:', error);
          setLoadingActivities(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error(err);
      setLoadingActivities(false);
    }
  }, [user]);

  // Handle WhatsApp Connect Action
  const handleConnectWa = async () => {
    setLoadingWaStatus(true);
    setConnectionMessage(null);
    try {
      const res = await ApiClient.connectWhatsApp('gateway');
      setWaStatus(res.session);
      await logActivity('WhatsApp Pairing Requested', 'Inisiasi kode QR pairing perangkat WhatsApp', 'SUCCESS');
    } catch (err: any) {
      setConnectionMessage('Gagal inisiasi koneksi: ' + err.message);
    } finally {
      setLoadingWaStatus(false);
    }
  };

  // Handle WhatsApp Request Pairing Action
  const handleConfirmPairing = async () => {
    if (!pairingInputPhone.trim()) return;
    setLoadingWaStatus(true);
    setConnectionMessage(null);
    try {
      const res = await ApiClient.requestPairingCode(pairingInputPhone.trim());
      setWaStatus((prev: any) => ({
        ...(prev || {}),
        status: 'PAIRING_REQUIRED',
        pairingCode: res.pairingCode,
        phoneNumber: pairingInputPhone.trim(),
      }));
      await logActivity('WhatsApp Pairing Requested', `Kode pairing perangkat ${pairingInputPhone} berhasil diminta`, 'SUCCESS');
      setConnectionMessage('Kode pairing 8-digit berhasil diterima dari WhatsApp! Masukkan kode pada aplikasi WhatsApp HP Anda.');
    } catch (err: any) {
      setConnectionMessage('Gagal meminta kode pairing: ' + err.message);
    } finally {
      setLoadingWaStatus(false);
    }
  };

  const handleCopyPairingCode = () => {
    if (waStatus?.pairingCode) {
      navigator.clipboard.writeText(waStatus.pairingCode.replace('-', ''));
      setCopiedPairingCode(true);
      setTimeout(() => setCopiedPairingCode(false), 2000);
    }
  };

  // Handle WhatsApp Disconnect Action
  const handleDisconnectWa = async () => {
    setLoadingWaStatus(true);
    try {
      await ApiClient.disconnectWhatsApp();
      setWaStatus({ status: 'DISCONNECTED' });
      await logActivity('WhatsApp Disconnected', 'Sesi koneksi WhatsApp diputuskan oleh pengguna', 'SUCCESS');
    } catch (err: any) {
      setConnectionMessage('Gagal memutuskan koneksi: ' + err.message);
    } finally {
      setLoadingWaStatus(false);
    }
  };

  // Handle WhatsApp Reset Action (Clear corrupted session keys)
  const handleResetWa = async () => {
    if (!confirm('Apakah Anda yakin ingin mereset sesi WhatsApp? Seluruh kunci enkripsi lama akan dibersihkan agar Anda dapat memuat QR atau Pairing Code baru yang bersih.')) {
      return;
    }
    setLoadingWaStatus(true);
    try {
      await ApiClient.resetWhatsAppSession();
      setWaStatus({ status: 'DISCONNECTED' });
      setConnectionMessage('Sesi WhatsApp berhasil direset. Silakan muat QR atau Pairing Code baru.');
      await logActivity('WhatsApp Session Reset', 'Sesi WhatsApp direset untuk membersihkan kunci enkripsi', 'SUCCESS');
    } catch (err: any) {
      setConnectionMessage('Gagal mereset sesi: ' + err.message);
    } finally {
      setLoadingWaStatus(false);
    }
  };

  // --- GROUP BROADCAST QUEUE & HANDLERS ---
  const handleSelectAllGroups = () => {
    setSelectedGroupIds(availableGroups.map((g) => g.id));
  };

  const handleDeselectAllGroups = () => {
    setSelectedGroupIds([]);
  };

  const handleToggleGroup = (id: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(id) ? prev.filter((gId) => gId !== id) : [...prev, id]
    );
  };

  const handleGroupImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran gambar maksimal adalah 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setGroupMediaUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleStartGroupBroadcast = async () => {
    if (selectedGroupIds.length === 0) {
      alert('Pilih minimal satu grup WhatsApp untuk memulai broadcast.');
      return;
    }
    if (!groupMessageText.trim()) {
      alert('Teks materi broadcast grup tidak boleh kosong.');
      return;
    }
    if (waStatus?.status !== 'CONNECTED') {
      alert('WhatsApp belum terhubung. Harap hubungkan WhatsApp terlebih dahulu.');
      return;
    }
    if (!isVipActive) {
      alert('Fitur Group Broadcast memerlukan membership VIP aktif.');
      return;
    }

    setShowGroupConfirmModal(false);
    setIsGroupBroadcasting(true);
    groupAbortRef.current = false;

    const total = selectedGroupIds.length;
    const progressState = {
      currentIdx: 0,
      total,
      successCount: 0,
      failedCount: 0,
      currentTargetName: '',
      isStopping: false,
      isDone: false,
      startedAt: new Date().toLocaleTimeString('id-ID'),
      logs: [] as Array<{ id: string; target: string; status: 'SUCCESS' | 'FAILED'; messageId?: string; error?: string; time: string }>,
    };
    setGroupProgress({ ...progressState });

    for (let i = 0; i < total; i++) {
      if (groupAbortRef.current) {
        progressState.isStopping = true;
        setGroupProgress({ ...progressState });
        break;
      }

      const groupId = selectedGroupIds[i];
      const grp = availableGroups.find((g) => g.id === groupId);
      const groupName = grp?.name || groupId;

      progressState.currentIdx = i + 1;
      progressState.currentTargetName = groupName;
      setGroupProgress({ ...progressState });

      const formatted = formatBroadcastMessage(groupMessageText, {
        nama: groupName,
        grup: groupName,
        waktu: new Date().toLocaleTimeString('id-ID'),
      });

      try {
        const result = await ApiClient.sendGroupBroadcast(groupId, formatted, groupMediaUrl || undefined);
        progressState.successCount++;
        progressState.logs.unshift({
          id: `log-grp-${Date.now()}-${i}`,
          target: groupName,
          status: 'SUCCESS',
          messageId: result.messageId,
          time: new Date().toLocaleTimeString('id-ID'),
        });

        // Record delivery receipt to Firestore broadcast_history
        try {
          await addDoc(collection(db, 'broadcast_history'), {
            uid: user?.uid,
            target: 'GROUP',
            recipient: groupName,
            recipientId: groupId,
            message: formatted,
            hasMedia: Boolean(groupMediaUrl),
            status: 'ACCEPTED',
            messageId: result.messageId,
            timestamp: serverTimestamp(),
          });
        } catch (e) {
          console.warn('Could not record broadcast receipt to Firestore:', e);
        }
      } catch (err: any) {
        progressState.failedCount++;
        progressState.logs.unshift({
          id: `log-grp-${Date.now()}-${i}`,
          target: groupName,
          status: 'FAILED',
          error: err.message || 'Gagal mengirim',
          time: new Date().toLocaleTimeString('id-ID'),
        });

        try {
          await addDoc(collection(db, 'broadcast_history'), {
            uid: user?.uid,
            target: 'GROUP',
            recipient: groupName,
            recipientId: groupId,
            message: formatted,
            hasMedia: Boolean(groupMediaUrl),
            status: 'FAILED',
            error: err.message || 'Gagal mengirim',
            timestamp: serverTimestamp(),
          });
        } catch (e) {}
      }

      setGroupProgress({ ...progressState });

      // Staggered interval delay between group broadcasts
      if (!groupAbortRef.current && i < total - 1) {
        const delayMs = Math.max(3, groupDelaySeconds) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    progressState.isDone = true;
    progressState.isStopping = false;
    setGroupProgress({ ...progressState });
    setIsGroupBroadcasting(false);

    await logActivity(
      'Group Broadcast Completed',
      `Broadcast grup selesai: ${progressState.successCount} berhasil, ${progressState.failedCount} gagal dari ${total} grup`,
      progressState.successCount > 0 ? 'SUCCESS' : 'FAILED'
    );
  };

  const handleStopGroupBroadcast = () => {
    groupAbortRef.current = true;
    setGroupProgress((prev) => (prev ? { ...prev, isStopping: true } : null));
  };

  // --- CONTACT BROADCAST QUEUE & HANDLERS ---
  const handleSelectAllContacts = () => {
    const selectable = contactList
      .filter((c) => !c.optedOut && c.consentApproved)
      .map((c) => c.id);
    setSelectedContactIds(selectable);
  };

  const handleDeselectAllContacts = () => {
    setSelectedContactIds([]);
  };

  const handleToggleContact = (id: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(id) ? prev.filter((cId) => cId !== id) : [...prev, id]
    );
  };

  const handleDeleteContact = (id: string) => {
    setContactList((prev) => prev.filter((c) => c.id !== id));
    setSelectedContactIds((prev) => prev.filter((cId) => cId !== id));
  };

  const handleToggleOptOut = (id: string) => {
    setContactList((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const updatedOptOut = !c.optedOut;
          if (updatedOptOut) {
            setSelectedContactIds((s) => s.filter((sId) => sId !== id));
          }
          return { ...c, optedOut: updatedOptOut };
        }
        return c;
      })
    );
  };

  const handleContactImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran gambar maksimal adalah 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setContactMediaUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAddManualContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactPhone.trim()) {
      alert('Nama dan Nomor WhatsApp wajib diisi.');
      return;
    }
    const newId = `c-${Date.now()}`;
    const newEntry = {
      id: newId,
      name: newContactName.trim(),
      phone: newContactPhone.trim(),
      tag: newContactTag,
      consentApproved: newContactConsent,
      optedOut: false,
    };
    setContactList((prev) => [newEntry, ...prev]);
    if (newContactConsent) {
      setSelectedContactIds((prev) => [...prev, newId]);
    }
    setNewContactName('');
    setNewContactPhone('');
    setIsAddContactModalOpen(false);
  };

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const newContacts: any[] = [];
      const newIds: string[] = [];

      lines.forEach((line, idx) => {
        const parts = line.split(',');
        if (parts.length >= 2 && parts[1].trim().length >= 10) {
          const id = `csv-${Date.now()}-${idx}`;
          const phone = parts[1].trim();
          newContacts.push({
            id,
            name: parts[0].trim() || 'Pelanggan Baru',
            phone,
            tag: parts[2]?.trim() || 'Impor CSV',
            consentApproved: true,
            optedOut: false,
          });
          newIds.push(id);
        }
      });

      if (newContacts.length > 0) {
        setContactList((prev) => [...prev, ...newContacts]);
        setSelectedContactIds((prev) => [...prev, ...newIds]);
        alert(`Berhasil mengimpor ${newContacts.length} kontak dari file CSV.`);
      }
    };
    reader.readAsText(file);
  };

  const handleStartContactBroadcast = async () => {
    const targets = contactList.filter((c) => selectedContactIds.includes(c.id));

    if (targets.length === 0) {
      alert('Pilih minimal satu kontak penerima untuk memulai broadcast.');
      return;
    }
    if (!contactMessageText.trim()) {
      alert('Teks materi broadcast kontak tidak boleh kosong.');
      return;
    }
    if (waStatus?.status !== 'CONNECTED') {
      alert('WhatsApp belum terhubung. Harap hubungkan WhatsApp terlebih dahulu.');
      return;
    }
    if (!isVipActive) {
      alert('Fitur Contact Broadcast memerlukan membership VIP aktif.');
      return;
    }

    setShowContactConfirmModal(false);
    setIsContactBroadcasting(true);
    contactAbortRef.current = false;

    const total = targets.length;
    const progressState = {
      currentIdx: 0,
      total,
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
      currentTargetName: '',
      isStopping: false,
      isDone: false,
      startedAt: new Date().toLocaleTimeString('id-ID'),
      logs: [] as Array<{ phone: string; name: string; status: 'SUCCESS' | 'FAILED' | 'OPTED_OUT'; messageId?: string; error?: string; time: string }>,
    };
    setContactProgress({ ...progressState });

    for (let i = 0; i < total; i++) {
      if (contactAbortRef.current) {
        progressState.isStopping = true;
        setContactProgress({ ...progressState });
        break;
      }

      const contact = targets[i];
      progressState.currentIdx = i + 1;
      progressState.currentTargetName = `${contact.name} (${contact.phone})`;
      setContactProgress({ ...progressState });

      // Exclude contacts with opt-out or lack of consent
      if (contact.optedOut || !contact.consentApproved) {
        progressState.skippedCount++;
        progressState.logs.unshift({
          phone: contact.phone,
          name: contact.name,
          status: 'OPTED_OUT',
          error: contact.optedOut ? 'Kontak terdaftar Opt-out (Menolak Promosi)' : 'Belum memberikan persetujuan promosi',
          time: new Date().toLocaleTimeString('id-ID'),
        });
        setContactProgress({ ...progressState });
        continue;
      }

      const formatted = formatBroadcastMessage(contactMessageText, {
        nama: contact.name,
        produk: 'Akun & Layanan Digital',
        waktu: new Date().toLocaleTimeString('id-ID'),
      });

      try {
        const result = await ApiClient.sendContactBroadcast(contact.phone, formatted, contactMediaUrl || undefined);
        progressState.successCount++;
        progressState.logs.unshift({
          phone: contact.phone,
          name: contact.name,
          status: 'SUCCESS',
          messageId: result.messageId,
          time: new Date().toLocaleTimeString('id-ID'),
        });

        try {
          await addDoc(collection(db, 'broadcast_history'), {
            uid: user?.uid,
            target: 'CONTACT',
            recipient: contact.name,
            recipientPhone: contact.phone,
            message: formatted,
            hasMedia: Boolean(contactMediaUrl),
            status: 'ACCEPTED',
            messageId: result.messageId,
            timestamp: serverTimestamp(),
          });
        } catch (e) {}
      } catch (err: any) {
        progressState.failedCount++;
        progressState.logs.unshift({
          phone: contact.phone,
          name: contact.name,
          status: 'FAILED',
          error: err.message || 'Gagal mengirim',
          time: new Date().toLocaleTimeString('id-ID'),
        });

        try {
          await addDoc(collection(db, 'broadcast_history'), {
            uid: user?.uid,
            target: 'CONTACT',
            recipient: contact.name,
            recipientPhone: contact.phone,
            message: formatted,
            hasMedia: Boolean(contactMediaUrl),
            status: 'FAILED',
            error: err.message || 'Gagal mengirim',
            timestamp: serverTimestamp(),
          });
        } catch (e) {}
      }

      setContactProgress({ ...progressState });

      if (!contactAbortRef.current && i < total - 1) {
        const delayMs = Math.max(3, contactDelaySeconds) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    progressState.isDone = true;
    progressState.isStopping = false;
    setContactProgress({ ...progressState });
    setIsContactBroadcasting(false);

    await logActivity(
      'Contact Broadcast Completed',
      `Broadcast kontak selesai: ${progressState.successCount} berhasil, ${progressState.failedCount} gagal, ${progressState.skippedCount} dilewati dari ${total} target`,
      progressState.successCount > 0 ? 'SUCCESS' : 'FAILED'
    );
  };

  const handleStopContactBroadcast = () => {
    contactAbortRef.current = true;
    setContactProgress((prev) => (prev ? { ...prev, isStopping: true } : null));
  };

  // Handle Admin VIP Grant
  const handleAdminGrantVip = async () => {
    if (!adminTargetUid.trim()) return;
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/admin/grant-vip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetUid: adminTargetUid.trim(),
          tier: adminTier,
          days: adminDays,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAdminActionMessage(`Berhasil memberikan membership ${adminTier} selama ${adminDays} hari kepada UID: ${adminTargetUid}`);
        refreshMembership();
      } else {
        setAdminActionMessage('Gagal: ' + data.message);
      }
    } catch (e: any) {
      setAdminActionMessage('Error: ' + e.message);
    }
  };

  // Save profile updates
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayNameInput.trim()) return;
    setIsUpdatingProfile(true);
    setProfileMessage(null);
    try {
      await updateProfileDetails({ displayName: displayNameInput.trim() });
      setProfileMessage('Profil berhasil diperbarui di Firestore.');
      setTimeout(() => setProfileMessage(null), 3000);
    } catch (err: any) {
      setProfileMessage('Gagal memperbarui profil: ' + err.message);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const navMenuItems = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, requiresVip: false },
    { id: 'connection', label: 'WhatsApp Connection', icon: QrCode, requiresVip: true },
    { id: 'group', label: 'Group Broadcast', icon: Users, requiresVip: true },
    { id: 'group-dm', label: 'Group Member DM', icon: UserCheck, requiresVip: true },
    { id: 'channel', label: 'Channel Broadcast', icon: Radio, requiresVip: true },
    { id: 'contact', label: 'Contact Broadcast', icon: Send, requiresVip: true },
    { id: 'history', label: 'Broadcast History', icon: History, requiresVip: true },
    { id: 'membership', label: 'VIP Membership', icon: Crown, requiresVip: false },
    { id: 'settings', label: 'Pengaturan Akun', icon: Settings, requiresVip: false },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin Control', icon: ShieldCheck, requiresVip: false }] : []),
  ];

  // Helper banner for locked VIP feature
  const renderVipLockedGate = (featureName: string) => (
    <div className="p-8 sm:p-12 rounded-2xl bg-gradient-to-b from-[#101426] to-[#0a0e1c] border border-cyan-500/30 text-center space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
        <Lock className="w-7 h-7" />
      </div>
      <h3 className="text-xl sm:text-2xl font-extrabold text-white">
        Fitur {featureName} Terkunci
      </h3>
      <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
        Sesuai kebijakan akses <strong>ZynderJhnzV1Beta</strong>, modul ini wajib menggunakan koneksi WhatsApp asli dan hanya dapat diakses oleh akun dengan membership <strong>VIP / VVIP Aktif</strong>.
      </p>
      <div className="pt-2">
        <button
          onClick={() => setIsPaymentModalOpen(true)}
          className="px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 shadow-lg shadow-cyan-500/25 cursor-pointer inline-flex items-center gap-2"
        >
          <Crown className="w-4 h-4 text-amber-300" />
          <span>Aktivasi VIP (Rp10.000 / 30 Hari)</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-[#090d18]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3">
              {/* Mobile Menu Trigger */}
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-white bg-slate-900 border border-slate-800 min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                aria-label="Buka navigasi dashboard"
              >
                <Menu className="w-5 h-5 text-cyan-400" />
              </button>

              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 p-[1px] flex items-center justify-center shadow-md shrink-0">
                <div className="w-full h-full bg-[#0b0f19] rounded-[11px] flex items-center justify-center">
                  <Radio className="w-4 h-4 text-cyan-400" />
                </div>
              </div>
              <span className="font-extrabold text-base tracking-tight text-white hidden sm:inline">
                Zynder<span className="text-cyan-400">Jhnz</span><span className="text-purple-400 text-xs px-1.5 py-0.5 ml-1 rounded bg-purple-500/10 border border-purple-500/30">V1Beta</span>
              </span>
              <span className="hidden xs:inline px-2 py-0.5 rounded text-[11px] font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                Dashboard
              </span>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3">
              <button
                onClick={onReturnToLanding}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <span>Lihat Landing Page</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              {/* User Avatar & Info */}
              <div className="flex items-center gap-2 sm:gap-2.5 pl-2 border-l border-slate-800">
                {userProfile?.photoURL ? (
                  <img
                    src={userProfile.photoURL}
                    alt={userProfile.displayName || 'User'}
                    className="w-8 h-8 rounded-full border border-cyan-500/40 object-cover shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-cyan-600/30 border border-cyan-500/40 flex items-center justify-center font-bold text-cyan-300 text-xs shrink-0">
                    {userProfile?.displayName ? userProfile.displayName.charAt(0) : 'U'}
                  </div>
                )}
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold text-white truncate max-w-[130px]">
                    {userProfile?.displayName || user?.displayName || 'Pengguna'}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                    <span className={`px-1.5 py-0.2 rounded font-bold ${isVipActive ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'}`}>
                      {membership?.tier || (isAdmin ? 'VVIP' : 'FREE')}
                    </span>
                    <span>·</span>
                    <span>{isVipActive ? 'VIP AKTIF' : 'TERKUNCI'}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={async () => {
                  await signOutUser();
                  onReturnToLanding();
                }}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all cursor-pointer min-h-[36px]"
                title="Keluar dari sesi"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Active View Sub-Bar */}
      <div className="lg:hidden bg-[#0a0f1d] border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {(() => {
            const activeItem = navMenuItems.find((m) => m.id === currentView);
            const ActiveIcon = activeItem?.icon || LayoutDashboard;
            return (
              <>
                <ActiveIcon className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="text-xs font-bold text-white truncate">{activeItem?.label || 'Dashboard'}</span>
              </>
            );
          })()}
        </div>
        <button
          onClick={() => setMobileNavOpen(true)}
          className="px-3 py-1 rounded-lg text-xs font-semibold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 flex items-center gap-1.5 cursor-pointer shrink-0 min-h-[36px]"
        >
          <Menu className="w-3.5 h-3.5" />
          <span>Ganti Tab</span>
        </button>
      </div>

      {/* Mobile Drawer (visible when mobileNavOpen is true) */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Sheet */}
          <div className="relative w-72 max-w-[85vw] bg-[#0c101d] border-r border-slate-800 p-4 flex flex-col justify-between z-10 shadow-2xl overflow-y-auto animate-in slide-in-from-left duration-200">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Radio className="w-4 h-4 text-cyan-400" />
                  <span>Menu Dashboard</span>
                </div>
                <button
                  onClick={() => setMobileNavOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer"
                  aria-label="Tutup menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-1">
                {navMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;
                  const isLocked = item.requiresVip && !isVipActive;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setCurrentView(item.id as DashboardView);
                        setMobileNavOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer min-h-[44px] ${
                        isActive
                          ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      {isLocked ? (
                        <Lock className="w-3.5 h-3.5 text-amber-500/70" />
                      ) : (
                        <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-600'}`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mobile Drawer VIP Status & Upgrade Action */}
            <div className="mt-6 pt-4 border-t border-slate-800">
              <div className="p-3.5 rounded-xl bg-gradient-to-b from-purple-950/30 to-slate-900 border border-purple-500/20 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-amber-400 flex items-center gap-1">
                    <Crown className="w-3.5 h-3.5" />
                    <span>{membership?.tier || (isAdmin ? 'VVIP' : 'FREE')}</span>
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isVipActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {isVipActive ? 'AKTIF' : 'FREE'}
                  </span>
                </div>

                {membership?.remainingSeconds ? (
                  <div className="text-[11px] text-slate-300 font-mono mt-1">
                    Sisa: {Math.floor(membership.remainingSeconds / 86400)} hari ({Math.floor((membership.remainingSeconds % 86400) / 3600)} jam)
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-1 leading-tight">
                    Status FREE: Fitur WhatsApp & Broadcast terkunci.
                  </p>
                )}

                <button
                  onClick={() => {
                    setMobileNavOpen(false);
                    setIsPaymentModalOpen(true);
                  }}
                  className="mt-3 w-full py-2.5 min-h-[44px] rounded-lg text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Crown className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isVipActive ? 'Perpanjang VIP (Rp10k)' : 'Aktivasi VIP (Rp10k)'}</span>
                </button>

                <button
                  onClick={async () => {
                    setMobileNavOpen(false);
                    await signOutUser();
                    onReturnToLanding();
                  }}
                  className="mt-2.5 w-full py-2.5 min-h-[44px] rounded-lg text-xs font-bold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 cursor-pointer text-center flex items-center justify-center gap-2 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout dari Akun</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Desktop Navigation Sidebar (hidden on mobile, uses drawer instead) */}
          <aside className="hidden lg:block lg:col-span-3 rounded-2xl bg-[#0c101d] border border-slate-800 p-3 space-y-1">
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Navigasi Kontrol
            </div>

            {navMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              const isLocked = item.requiresVip && !isVipActive;

              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id as DashboardView)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {isLocked ? (
                    <Lock className="w-3.5 h-3.5 text-amber-500/70" />
                  ) : (
                    <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-600'}`} />
                  )}
                </button>
              );
            })}

            {/* VIP Status Badge & Upgrade Callout in Sidebar */}
            <div className="mt-4 p-3.5 rounded-xl bg-gradient-to-b from-purple-950/30 to-slate-900 border border-purple-500/20 text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-amber-400 flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5" />
                  <span>{membership?.tier || (isAdmin ? 'VVIP' : 'FREE')}</span>
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isVipActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                  {isVipActive ? 'AKTIF' : 'FREE'}
                </span>
              </div>

              {membership?.remainingSeconds ? (
                <div className="text-[11px] text-slate-300 font-mono mt-1">
                  Sisa: {Math.floor(membership.remainingSeconds / 86400)} hari ({Math.floor((membership.remainingSeconds % 86400) / 3600)} jam)
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 mt-1 leading-tight">
                  Status FREE: Fitur WhatsApp & Broadcast terkunci.
                </p>
              )}

              <button
                onClick={() => setIsPaymentModalOpen(true)}
                className="mt-3 w-full py-1.5 rounded-lg text-[11px] font-bold text-white bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 cursor-pointer text-center flex items-center justify-center gap-1.5"
              >
                <Crown className="w-3 h-3 text-amber-300" />
                <span>{isVipActive ? 'Perpanjang VIP (Rp10k)' : 'Aktivasi VIP (Rp10k)'}</span>
              </button>
            </div>
          </aside>

          {/* Right Working Panel */}
          <main className="w-full lg:col-span-9 space-y-6">
            {/* NOTIFIKASI KETIKA PEMBAYARAN DITERIMA */}
            {approvedNotification && (
              <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-[#0e1f1a] border border-emerald-500/50 shadow-xl space-y-3 animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-extrabold text-emerald-300">
                        Pembayaran Anda diterima admin.
                      </h3>
                      <p className="text-xs text-slate-200">
                        Silakan klik tombol <strong>Lanjutkan</strong> untuk membuka fitur VIP.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleAcknowledgeApproval}
                    disabled={isAcknowledging}
                    className="px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-lg shadow-emerald-500/25 flex items-center gap-2 cursor-pointer transition-all self-start sm:self-auto shrink-0 disabled:opacity-50"
                  >
                    {isAcknowledging ? (
                      <>
                        <RotateCw className="w-4 h-4 animate-spin" />
                        <span>Membuka Akses VIP...</span>
                      </>
                    ) : (
                      <>
                        <Crown className="w-4 h-4 text-slate-950" />
                        <span>Lanjutkan</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* NOTIFIKASI KETIKA PEMBAYARAN DITOLAK */}
            {rejectedNotification && (
              <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-950/70 via-slate-900 to-[#1f0e13] border border-rose-500/50 shadow-xl space-y-3 animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-base font-extrabold text-rose-300">
                        Pembayaran Anda ditolak oleh admin.
                      </h3>
                      <p className="text-xs text-slate-200">
                        Harap konfirmasi ulang bukti transfer Anda.
                      </p>
                      {rejectedNotification.rejectionReason && (
                        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-200 text-xs">
                          <span className="font-semibold">Alasan Penolakan: </span>
                          <span>{rejectedNotification.rejectionReason}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setResubmitTargetId(rejectedNotification.id);
                      setIsPaymentModalOpen(true);
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-md flex items-center gap-2 cursor-pointer transition-all self-start sm:self-auto shrink-0"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Ulang Bukti Transfer</span>
                  </button>
                </div>
              </div>
            )}

            {/* STATUS SETELAH PENGGUNA MENGIRIM BUKTI (PENDING VERIFICATION) */}
            {activePendingPayment && (
              <div className="p-5 rounded-2xl bg-[#14120a] border border-amber-500/40 shadow-xl space-y-3 animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-extrabold text-white">
                          Memverifikasi pembayaran Anda
                        </h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          PENDING_VERIFICATION
                        </span>
                      </div>
                      <p className="text-xs text-amber-200/90 font-medium">
                        Harap tunggu maksimal 1x24 jam pada jam kerja admin.
                      </p>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Jika pembayaran berhasil diverifikasi, akses VIP akan otomatis terbuka dan Anda akan menerima notifikasi.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setResubmitTargetId(null);
                      setIsPaymentModalOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 cursor-pointer self-start sm:self-auto shrink-0 transition-all flex items-center gap-1.5"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>Rincian Pembayaran</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-amber-500/20 text-[11px]">
                  <div className="flex items-center justify-between sm:justify-start gap-2 text-slate-400">
                    <span>Jam Kerja Admin:</span>
                    <span className="font-semibold text-amber-300">{adminWorkingHours}</span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-start gap-2 text-slate-400">
                    <span>Waktu Pengajuan:</span>
                    <span className="font-mono text-slate-200">
                      {activePendingPayment.submittedAt
                        ? new Date(activePendingPayment.submittedAt).toLocaleTimeString('id-ID')
                        : '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between sm:justify-start gap-2 text-slate-400">
                    <span>Status Akses:</span>
                    <span className="text-rose-400 font-semibold">Terkunci (Role FREE)</span>
                  </div>
                </div>
              </div>
            )}
            {/* 1. OVERVIEW VIEW */}
            {currentView === 'overview' && (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0d1428] via-[#0c101f] to-[#121228] border border-cyan-500/30">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-1.5">
                        <Sparkles className="w-4 h-4" />
                        <span>Platform WhatsApp Broadcast & Digital Promotion</span>
                      </div>
                      <h2 className="text-2xl font-extrabold text-white">
                        Hai, {userProfile?.displayName || user?.displayName}!
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-300 mt-1">
                        Status Keanggotaan: <strong className="text-amber-400">{membership?.tier || (isAdmin ? 'VVIP' : 'FREE')}</strong> (Harga VIP: Rp10.000 / 30 Hari).
                      </p>
                    </div>

                    {!isVipActive && (
                      <button
                        onClick={() => setIsPaymentModalOpen(true)}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 shadow-md flex items-center gap-2 cursor-pointer self-start sm:self-auto shrink-0"
                      >
                        <Crown className="w-4 h-4 text-amber-300" />
                        <span>Buka Akses VIP</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-[#0c101d] border border-slate-800">
                    <span className="text-[11px] text-slate-400">Membership</span>
                    <div className="text-lg font-bold text-amber-400 mt-1">
                      {membership?.tier || (isAdmin ? 'VVIP' : 'FREE')}
                    </div>
                    <span className="text-[10px] text-slate-500">{isVipActive ? 'Terverifikasi Server' : 'Terkunci'}</span>
                  </div>

                  <div className="p-4 rounded-xl bg-[#0c101d] border border-slate-800">
                    <span className="text-[11px] text-slate-400">WhatsApp Status</span>
                    <div className="text-lg font-bold text-cyan-400 mt-1 flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${waStatus?.status === 'CONNECTED' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                      <span>{waStatus?.status || 'OFFLINE'}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">Provider Real-time</span>
                  </div>

                  <div className="p-4 rounded-xl bg-[#0c101d] border border-slate-800">
                    <span className="text-[11px] text-slate-400">Grup Terkoneksi</span>
                    <div className="text-lg font-bold text-purple-400 mt-1 font-mono">
                      {availableGroups.length} Grup
                    </div>
                    <span className="text-[10px] text-slate-500">Dukungan Pengiriman</span>
                  </div>

                  <div className="p-4 rounded-xl bg-[#0c101d] border border-slate-800">
                    <span className="text-[11px] text-slate-400">Total Log Aktivitas</span>
                    <div className="text-lg font-bold text-emerald-400 mt-1 font-mono">
                      {activities.length} Entri
                    </div>
                    <span className="text-[10px] text-slate-500">Firestore Audit Trail</span>
                  </div>
                </div>

                {/* Activity Feed */}
                <div className="p-5 rounded-2xl bg-[#0c101d] border border-slate-800 space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <span>Audit Log Aktivitas Riil (Firestore)</span>
                  </h3>

                  {loadingActivities ? (
                    <div className="py-6 text-center text-xs text-slate-500">Memuat log aktivitas...</div>
                  ) : activities.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500">Belum ada aktivitas tercatat.</div>
                  ) : (
                    <div className="space-y-2">
                      {activities.map((act) => (
                        <div key={act.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs">
                          <div className="space-y-0.5">
                            <div className="font-semibold text-slate-200 flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 text-[10px] font-mono">
                                {act.activityType}
                              </span>
                              <span>{act.description}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3" />
                              <span>{act.timestamp?.toDate ? act.timestamp.toDate().toLocaleString('id-ID') : 'Baru saja'}</span>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            {act.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. WHATSAPP CONNECTION VIEW */}
            {currentView === 'connection' && (
              !isVipActive ? (
                renderVipLockedGate('WhatsApp Connection')
              ) : (
                <div className="p-6 rounded-2xl bg-[#0c101d] border border-slate-800 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-white">WhatsApp Connection (Real Multi-Device Session)</h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Koneksi multi-device WhatsApp nyata yang diisolasi per akun. Status diautentikasi langsung oleh server backend.
                      </p>
                    </div>
                    {/* Real-time Status Badge */}
                    <div className="self-start sm:self-auto">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                          waStatus?.status === 'CONNECTED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : waStatus?.status === 'AUTHENTICATING'
                            ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 animate-pulse'
                            : waStatus?.status === 'QR_READY' || waStatus?.status === 'PAIRING_REQUIRED'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : waStatus?.status === 'CONNECTION_EXPIRED'
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            waStatus?.status === 'CONNECTED'
                              ? 'bg-emerald-400 animate-pulse'
                              : waStatus?.status === 'AUTHENTICATING'
                              ? 'bg-cyan-400 animate-ping'
                              : waStatus?.status === 'QR_READY'
                              ? 'bg-amber-400'
                              : 'bg-slate-500'
                          }`}
                        />
                        <span>{waStatus?.status || 'DISCONNECTED'}</span>
                      </span>
                    </div>
                  </div>

                  {connectionMessage && (
                    <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs flex items-center justify-between gap-2">
                      <span>{connectionMessage}</span>
                      <button
                        onClick={() => setConnectionMessage(null)}
                        className="text-slate-400 hover:text-white text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Mode Selector Tabs (QR Code vs Pairing Code) */}
                  {waStatus?.status !== 'CONNECTED' && (
                    <div className="flex border-b border-slate-800 gap-4">
                      <button
                        onClick={() => setConnectionMode('qr')}
                        className={`pb-3 text-xs font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-2 ${
                          connectionMode === 'qr'
                            ? 'border-cyan-400 text-cyan-300'
                            : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <QrCode className="w-4 h-4" />
                        <span>Pindai QR Code</span>
                      </button>
                      <button
                        onClick={() => setConnectionMode('pairing')}
                        className={`pb-3 text-xs font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-2 ${
                          connectionMode === 'pairing'
                            ? 'border-cyan-400 text-cyan-300'
                            : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Smartphone className="w-4 h-4" />
                        <span>Tautkan dengan Nomor HP (Pairing Code)</span>
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Column: Device Information & Controls */}
                    <div className="lg:col-span-6 p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-300">Rincian Perangkat & Sesi</span>
                        <span className="text-[11px] font-mono text-cyan-400">Multi-Device Baileys</span>
                      </div>

                      <div className="space-y-2.5 text-xs text-slate-300">
                        <div className="flex justify-between py-1.5 border-b border-slate-800">
                          <span className="text-slate-500">Nomor WhatsApp:</span>
                          <span className="font-mono text-white font-medium">
                            {waStatus?.phoneNumber ? `+${waStatus.phoneNumber}` : 'Belum Ditautkan'}
                          </span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-slate-800">
                          <span className="text-slate-500">Nama Akun:</span>
                          <span className="text-slate-200 font-medium">{waStatus?.pushName || '-'}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-slate-800">
                          <span className="text-slate-500">Engine Protocol:</span>
                          <span className="text-slate-200">{waStatus?.deviceInfo?.platform || 'WhatsApp Web MD'}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-slate-800">
                          <span className="text-slate-500">Heartbeat Server:</span>
                          <span className="font-mono text-cyan-400 text-[11px]">
                            {waStatus?.lastHeartbeat ? new Date(waStatus.lastHeartbeat).toLocaleTimeString('id-ID') : 'Aktif'}
                          </span>
                        </div>
                        {waStatus?.lastError && (
                          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px]">
                            {waStatus.lastError}
                          </div>
                        )}
                      </div>

                      <div className="pt-2 space-y-2">
                        {waStatus?.status === 'CONNECTED' ? (
                          <button
                            onClick={handleDisconnectWa}
                            disabled={loadingWaStatus}
                            className="w-full py-2.5 rounded-xl text-xs font-bold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 cursor-pointer transition-all"
                          >
                            Putuskan Koneksi WhatsApp
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={handleConnectWa}
                              disabled={loadingWaStatus}
                              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              {loadingWaStatus ? (
                                <>
                                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                                  <span>Menghubungkan...</span>
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  <span>{waStatus?.status === 'QR_READY' ? 'Muat Ulang QR' : 'Mulai Hubungkan WhatsApp'}</span>
                                </>
                              )}
                            </button>
                            <button
                              onClick={refreshWaStatus}
                              disabled={loadingWaStatus}
                              className="px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 cursor-pointer"
                              title="Sinkronisasi status backend"
                            >
                              <RotateCw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={handleResetWa}
                              disabled={loadingWaStatus}
                              className="px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 cursor-pointer flex items-center gap-1"
                              title="Reset sesi & hapus kunci lama jika terjadi error dekripsi atau Bad MAC"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Reset Sesi</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Dynamic Authentication Window */}
                    <div className="lg:col-span-6 p-6 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col items-center justify-center text-center">
                      {waStatus?.status === 'CONNECTED' ? (
                        <div className="py-8 space-y-3">
                          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                            <CheckCircle2 className="w-9 h-9" />
                          </div>
                          <h3 className="text-base font-bold text-white">WhatsApp Berhasil Terkoneksi</h3>
                          <p className="text-xs text-slate-300 font-mono">
                            Nomor Aktif: +{waStatus.phoneNumber} ({waStatus.pushName})
                          </p>
                          <p className="text-[11px] text-slate-500 max-w-xs">
                            Sesi tersimpan aman di server backend. Siap digunakan untuk pengiriman broadcast grup dan pushkontak.
                          </p>
                        </div>
                      ) : waStatus?.status === 'AUTHENTICATING' ? (
                        <div className="py-10 space-y-3">
                          <RotateCw className="w-10 h-10 text-cyan-400 animate-spin mx-auto" />
                          <h3 className="text-base font-bold text-white">Memproses Autentikasi WhatsApp...</h3>
                          <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                            Koneksi sedang diverifikasi oleh server WhatsApp. Harap jangan menutup jendela ini.
                          </p>
                        </div>
                      ) : connectionMode === 'pairing' ? (
                        /* PAIRING CODE WORKFLOW */
                        <div className="w-full space-y-4">
                          {waStatus?.status === 'PAIRING_REQUIRED' && waStatus?.pairingCode ? (
                            <div className="space-y-4">
                              <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/40 flex flex-col items-center gap-2">
                                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                                  Kode Pairing Resmi WhatsApp:
                                </span>
                                <div className="text-3xl sm:text-4xl font-mono font-black text-cyan-400 tracking-widest selection:bg-cyan-500/30 py-1">
                                  {waStatus.pairingCode}
                                </div>
                                <button
                                  onClick={handleCopyPairingCode}
                                  className="text-xs text-cyan-300 hover:text-white flex items-center gap-1.5 cursor-pointer pt-1"
                                >
                                  {copiedPairingCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                  <span>{copiedPairingCode ? 'Kode Tersalin!' : 'Salin Kode'}</span>
                                </button>
                              </div>

                              <div className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800 text-left text-xs space-y-1.5 text-slate-300">
                                <div className="font-bold text-slate-200">Langkah Menautkan di WhatsApp:</div>
                                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-400 leading-relaxed">
                                  <li>Buka WhatsApp di ponsel Anda</li>
                                  <li>Buka <strong>Pengaturan</strong> &gt; <strong>Perangkat Tertaut</strong></li>
                                  <li>Pilih <strong>Tautkan Perangkat</strong></li>
                                  <li>Pilih tautan <strong>"Tautkan dengan nomor telepon saja"</strong> di bagian bawah</li>
                                  <li>Masukkan 8-digit kode pairing di atas</li>
                                </ol>
                              </div>

                              <button
                                onClick={handleConfirmPairing}
                                disabled={loadingWaStatus}
                                className="w-full py-2 rounded-lg text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 cursor-pointer"
                              >
                                Minta Kode Pairing Baru
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-4 text-left">
                              <div>
                                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                                  Masukkan Nomor WhatsApp Anda:
                                </label>
                                <input
                                  type="tel"
                                  value={pairingInputPhone}
                                  onChange={(e) => setPairingInputPhone(e.target.value)}
                                  placeholder="Contoh: 081234567890 atau 6281234567890"
                                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                                />
                                <span className="text-[11px] text-slate-400 mt-1 block">
                                  Nomor dengan format Indonesia (awalan 08 atau 62).
                                </span>
                              </div>

                              <button
                                onClick={handleConfirmPairing}
                                disabled={loadingWaStatus}
                                className="w-full py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                              >
                                {loadingWaStatus ? (
                                  <>
                                    <RotateCw className="w-4 h-4 animate-spin" />
                                    <span>Meminta Kode Pairing Resmi...</span>
                                  </>
                                ) : (
                                  <>
                                    <Smartphone className="w-4 h-4" />
                                    <span>Dapatkan 8-Digit Kode Pairing</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* QR CODE WORKFLOW */
                        <div className="space-y-4 flex flex-col items-center">
                          {waStatus?.status === 'QR_READY' && waStatus?.qrDataUrl ? (
                            <>
                              {/* ACTUAL SCANNABLE QR CODE IMAGE RENDERED HERE */}
                              <div className="p-3.5 bg-white rounded-2xl shadow-xl border border-slate-300 inline-block">
                                <img
                                  src={waStatus.qrDataUrl}
                                  alt="WhatsApp Authentication QR Code"
                                  className="w-56 h-56 object-contain rounded-lg"
                                />
                              </div>

                              <div className="space-y-1">
                                <div className="text-xs font-bold text-white">Pindai QR Code via Aplikasi WhatsApp</div>
                                <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                                  Buka WhatsApp &gt; Perangkat Tertaut &gt; Tautkan Perangkat, lalu arahkan kamera ke QR di atas.
                                </p>
                              </div>
                            </>
                          ) : waStatus?.status === 'CONNECTION_EXPIRED' ? (
                            <div className="py-6 space-y-3">
                              <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
                              <h4 className="text-xs font-bold text-white">QR Code Kedaluwarsa</h4>
                              <p className="text-[11px] text-slate-400 max-w-xs">
                                QR Code WhatsApp diperbarui setiap beberapa detik. Silakan klik tombol di bawah untuk membuat QR baru.
                              </p>
                              <button
                                onClick={handleConnectWa}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 cursor-pointer"
                              >
                                Buat QR Baru
                              </button>
                            </div>
                          ) : (
                            <div className="py-8 space-y-3">
                              <Smartphone className="w-10 h-10 text-slate-600 mx-auto" />
                              <h4 className="text-xs font-bold text-white">WhatsApp Belum Terhubung</h4>
                              <p className="text-[11px] text-slate-400 max-w-xs">
                                Klik tombol di bawah untuk meminta QR Code resmi langsung dari server WhatsApp.
                              </p>
                              <button
                                onClick={handleConnectWa}
                                disabled={loadingWaStatus}
                                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 cursor-pointer"
                              >
                                {loadingWaStatus ? 'Menyiapkan...' : 'Muat QR Code Sekarang'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            )}

            {/* 3. GROUP BROADCAST VIEW */}
            {currentView === 'group' && (
              !isVipActive ? (
                renderVipLockedGate('Group Broadcast')
              ) : (
                <div className="space-y-6">
                  {/* TWO-TAB NAVIGATION HEADER */}
                  <div className="p-4 rounded-2xl bg-[#0c101d] border border-slate-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4 mb-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setCurrentView('group')}
                          className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 bg-gradient-to-r from-cyan-500/20 to-purple-600/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10 cursor-pointer"
                        >
                          <Users className="w-4 h-4 text-cyan-400" />
                          <span>TAB 1: Group Broadcast</span>
                        </button>
                        <button
                          onClick={() => setCurrentView('group-dm')}
                          className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <UserCheck className="w-4 h-4 text-cyan-400" />
                          <span>TAB 2: Group Member DM</span>
                        </button>
                        <button
                          onClick={() => setCurrentView('contact')}
                          className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <Send className="w-4 h-4 text-purple-400" />
                          <span>TAB 3: Contact Broadcast</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Gateway: {waStatus?.status === 'CONNECTED' ? 'WhatsApp Terhubung' : 'WhatsApp Belum Terhubung'}</span>
                      </div>
                    </div>

                    <div>
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span>Group Broadcast</span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                          Multi-Group Delivery
                        </span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Kirim pesan ke beberapa grup WhatsApp yang terhubung dalam satu proses.
                      </p>
                    </div>
                  </div>

                  {/* MONITORING / REAL-TIME PROGRESS CARD */}
                  {groupProgress && (
                    <div className="p-5 rounded-2xl bg-[#0e1424] border border-cyan-500/40 shadow-lg shadow-cyan-500/5 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {isGroupBroadcasting ? (
                            <RotateCw className="w-4 h-4 text-cyan-400 animate-spin" />
                          ) : groupProgress.isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-amber-400" />
                          )}
                          <span className="text-sm font-bold text-white">
                            {isGroupBroadcasting
                              ? 'Proses Pengiriman Broadcast Sedang Berjalan...'
                              : groupProgress.isDone
                              ? 'Broadcast Grup Telah Selesai!'
                              : 'Broadcast Dihentikan'}
                          </span>
                        </div>

                        {isGroupBroadcasting && (
                          <button
                            onClick={handleStopGroupBroadcast}
                            disabled={groupProgress.isStopping}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Pause className="w-3.5 h-3.5" />
                            <span>{groupProgress.isStopping ? 'Menghentikan...' : 'Stop Broadcast'}</span>
                          </button>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div>
                        <div className="flex justify-between text-xs text-slate-400 mb-1.5 font-mono">
                          <span>
                            Progress: {groupProgress.currentIdx} / {groupProgress.total} Grup
                          </span>
                          <span className="text-cyan-400 font-bold">
                            {groupProgress.total > 0
                              ? Math.round((groupProgress.currentIdx / groupProgress.total) * 100)
                              : 0}
                            %
                          </span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 transition-all duration-300 rounded-full"
                            style={{
                              width: `${
                                groupProgress.total > 0
                                  ? (groupProgress.currentIdx / groupProgress.total) * 100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Monitoring Metrics Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                          <div className="text-[11px] text-slate-400">Total Grup Dipilih</div>
                          <div className="text-lg font-bold text-white font-mono mt-0.5">{groupProgress.total}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-900/80 border border-emerald-500/20">
                          <div className="text-[11px] text-emerald-400">Total Berhasil</div>
                          <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
                            {groupProgress.successCount}
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-900/80 border border-rose-500/20">
                          <div className="text-[11px] text-rose-400">Total Gagal</div>
                          <div className="text-lg font-bold text-rose-400 font-mono mt-0.5">
                            {groupProgress.failedCount}
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                          <div className="text-[11px] text-slate-400">Sedang Diproses</div>
                          <div className="text-xs font-semibold text-cyan-300 truncate mt-1">
                            {groupProgress.currentTargetName || '-'}
                          </div>
                        </div>
                      </div>

                      {/* Live Queue Event Log */}
                      {groupProgress.logs.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Log Real-Time Pengiriman Grup</span>
                          </div>
                          <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-slate-950/80 border border-slate-800 font-mono text-[11px]">
                            {groupProgress.logs.map((log) => (
                              <div
                                key={log.id}
                                className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {log.status === 'SUCCESS' ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  ) : (
                                    <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                  )}
                                  <span className="font-semibold text-white truncate">{log.target}</span>
                                  {log.messageId && (
                                    <span className="text-[10px] text-slate-500 truncate hidden sm:inline">
                                      ID: {log.messageId}
                                    </span>
                                  )}
                                  {log.error && (
                                    <span className="text-[10px] text-rose-400 truncate">({log.error})</span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-500 shrink-0 ml-2">{log.time}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* MAIN TWO-COLUMN CONTENT */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* LEFT COLUMN: GROUP SELECTION (5 Cols) */}
                    <div className="lg:col-span-5 p-5 rounded-2xl bg-[#0c101d] border border-slate-800 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Users className="w-4 h-4 text-cyan-400" />
                            <span>Daftar Grup WhatsApp</span>
                          </h3>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {selectedGroupIds.length} dari {availableGroups.length} grup dipilih
                          </p>
                        </div>

                        <button
                          onClick={refreshGroups}
                          title="Perbarui daftar grup dari WhatsApp"
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Search & Bulk Select Controls */}
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Cari nama grup..."
                            value={groupSearchQuery}
                            onChange={(e) => setGroupSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleSelectAllGroups}
                            className="flex-1 py-1.5 px-3 rounded-lg text-[11px] font-semibold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <CheckSquare className="w-3.5 h-3.5" />
                            <span>Pilih Semua</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleDeselectAllGroups}
                            className="flex-1 py-1.5 px-3 rounded-lg text-[11px] font-semibold text-slate-400 bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Square className="w-3.5 h-3.5" />
                            <span>Batalkan Pilihan</span>
                          </button>
                        </div>
                      </div>

                      {/* Groups List */}
                      <div className="max-h-[480px] overflow-y-auto space-y-2 pr-1">
                        {availableGroups.length === 0 ? (
                          <div className="p-8 text-center rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                            <Users className="w-8 h-8 text-slate-600 mx-auto" />
                            <div className="text-xs text-slate-400">
                              {waStatus?.status === 'CONNECTED'
                                ? 'Memuat atau tidak ditemukan grup yang terhubung pada akun WhatsApp ini.'
                                : 'WhatsApp belum terhubung. Hubungkan akun Anda untuk memuat grup.'}
                            </div>
                            {waStatus?.status !== 'CONNECTED' && (
                              <button
                                onClick={() => setCurrentView('connection')}
                                className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 cursor-pointer"
                              >
                                Hubungkan WhatsApp Sekarang
                              </button>
                            )}
                          </div>
                        ) : (
                          availableGroups
                            .filter((g) =>
                              g.name.toLowerCase().includes(groupSearchQuery.toLowerCase())
                            )
                            .map((g) => {
                              const isSelected = selectedGroupIds.includes(g.id);
                              return (
                                <div
                                  key={g.id}
                                  onClick={() => handleToggleGroup(g.id)}
                                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                    isSelected
                                      ? 'bg-cyan-950/20 border-cyan-500/40 text-white shadow-sm'
                                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 text-slate-300'
                                  }`}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    {/* Group Avatar */}
                                    {g.pictureUrl ? (
                                      <img
                                        src={g.pictureUrl}
                                        alt={g.name}
                                        className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-700"
                                      />
                                    ) : (
                                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-600 to-purple-600 flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-sm">
                                        {g.name.slice(0, 2).toUpperCase()}
                                      </div>
                                    )}

                                    <div className="min-w-0">
                                      <div className="font-semibold text-xs text-white truncate flex items-center gap-1.5">
                                        <span>{g.name}</span>
                                        {g.isAdmin && (
                                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                            Admin
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                        <Users className="w-3 h-3 text-slate-500" />
                                        <span>{g.memberCount} Anggota</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="shrink-0">
                                    <div
                                      className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                                        isSelected
                                          ? 'bg-cyan-500 text-slate-950 font-bold'
                                          : 'border border-slate-700 bg-slate-950'
                                      }`}
                                    >
                                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                        )}
                      </div>

                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 space-y-1">
                        <div className="font-semibold flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                          <span>Etika & Izin Promosi Grup</span>
                        </div>
                        <p className="text-slate-300">
                          Pastikan pengiriman hanya dilakukan pada grup yang memberikan izin untuk aktivitas promosi atau grup milik sendiri.
                        </p>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: COMPOSER, DELAY & PREVIEW (7 Cols) */}
                    <div className="lg:col-span-7 space-y-5">
                      {/* Composer Box */}
                      <div className="p-5 rounded-2xl bg-[#0c101d] border border-slate-800 space-y-4">
                        <div>
                          <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-purple-400" />
                            <span>Komposer Pesan Broadcast</span>
                          </h3>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Format pesan yang didukung: <strong>Teks Saja</strong> atau <strong>Gambar + Teks</strong>.
                          </p>
                        </div>

                        {/* Text Message Input */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                            Teks Materi Promosi
                          </label>
                          <textarea
                            rows={6}
                            value={groupMessageText}
                            onChange={(e) => setGroupMessageText(e.target.value)}
                            placeholder="Tuliskan materi promosi atau info penting..."
                            className="w-full p-3.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:border-cyan-500 placeholder-slate-500 leading-relaxed"
                          />
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <span className="text-[10px] text-slate-400 mr-1">Variabel Dinamis:</span>
                            {['{grup}', '{waktu}'].map((chip) => (
                              <button
                                key={chip}
                                type="button"
                                onClick={() => setGroupMessageText((prev) => `${prev} ${chip}`)}
                                className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 cursor-pointer"
                              >
                                + {chip}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Image Upload / Attachment */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                            Lampiran Gambar (Opsional — Gambar + Teks)
                          </label>
                          {groupMediaUrl ? (
                            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <img
                                  src={groupMediaUrl}
                                  alt="Preview"
                                  className="w-14 h-14 rounded-lg object-cover border border-slate-700 shrink-0"
                                />
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold text-white truncate">Gambar Siap Dikirim</div>
                                  <div className="text-[10px] text-emerald-400 mt-0.5">Format: Gambar + Teks (Caption)</div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setGroupMediaUrl(null)}
                                className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 cursor-pointer"
                                title="Hapus gambar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <label className="border-2 border-dashed border-slate-700 hover:border-cyan-500/50 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-slate-900/40">
                              <ImageIcon className="w-6 h-6 text-slate-400" />
                              <div className="text-xs text-slate-300 font-medium">Klik untuk Unggah Gambar Promosi</div>
                              <div className="text-[10px] text-slate-500">Mendukung format JPG, PNG, WebP (Maks 5MB)</div>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleGroupImageUpload}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>

                        {/* Delay Setting */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Jeda Pengiriman Antar Grup</span>
                            </label>
                            <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded border border-cyan-500/30">
                              {groupDelaySeconds} Detik
                            </span>
                          </div>
                          <input
                            type="range"
                            min={3}
                            max={30}
                            step={1}
                            value={groupDelaySeconds}
                            onChange={(e) => setGroupDelaySeconds(Number(e.target.value))}
                            className="w-full accent-cyan-500 cursor-pointer"
                          />
                          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                            <span>Minimal 3 Detik</span>
                            <span className="text-cyan-400 font-medium">Default Rekomendasi: 5 Detik</span>
                            <span>Maksimal 30 Detik</span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-2">
                          {isGroupBroadcasting ? (
                            <button
                              onClick={handleStopGroupBroadcast}
                              className="w-full py-3.5 px-4 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                            >
                              <Pause className="w-4 h-4" />
                              <span>Hentikan Proses Broadcast Grup</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => setShowGroupConfirmModal(true)}
                              disabled={
                                selectedGroupIds.length === 0 ||
                                !groupMessageText.trim() ||
                                waStatus?.status !== 'CONNECTED'
                              }
                              className="w-full py-3.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                              <Play className="w-4 h-4 fill-white" />
                              <span>
                                Mulai Broadcast ke {selectedGroupIds.length} Grup Terpilih
                              </span>
                            </button>
                          )}

                          {waStatus?.status !== 'CONNECTED' && (
                            <p className="text-[11px] text-amber-400 mt-2 text-center">
                              * WhatsApp belum terhubung. Harap hubungkan di menu WhatsApp Connection sebelum mulai broadcast.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Live WhatsApp Bubble Preview */}
                      <div className="p-5 rounded-2xl bg-[#0c101d] border border-slate-800 space-y-3">
                        <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                          <span>Live Preview Pesan WhatsApp:</span>
                          <span className="text-[10px] text-slate-500">Tampilan di sisi penerima</span>
                        </div>

                        <div className="p-4 rounded-xl bg-[#0b141a] border border-slate-800/80 shadow-inner">
                          <div className="max-w-[340px] ml-auto rounded-lg bg-[#005c4b] text-white p-2.5 shadow text-xs space-y-2">
                            {groupMediaUrl && (
                              <img
                                src={groupMediaUrl}
                                alt="Attachment"
                                className="w-full max-h-48 object-cover rounded-md"
                              />
                            )}
                            <div className="whitespace-pre-wrap leading-relaxed text-[11px] font-sans">
                              {formatBroadcastMessage(groupMessageText, {
                                nama: 'Nama Grup',
                                grup: 'Komunitas Digital',
                                waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
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

                  {/* GROUP BROADCAST CONFIRMATION MODAL */}
                  {showGroupConfirmModal && (
                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                      <div className="w-full max-w-md rounded-2xl bg-[#0f1422] border border-slate-800 p-6 space-y-5 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                          <div className="flex items-center gap-2 text-white font-bold text-base">
                            <Users className="w-5 h-5 text-cyan-400" />
                            <span>Konfirmasi Broadcast Grup</span>
                          </div>
                          <button
                            onClick={() => setShowGroupConfirmModal(false)}
                            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="space-y-3 text-xs text-slate-300">
                          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Total Grup Sasaran:</span>
                              <span className="font-bold text-white">{selectedGroupIds.length} Grup</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Format Pesan:</span>
                              <span className="font-bold text-cyan-400">
                                {groupMediaUrl ? 'Gambar + Teks (Caption)' : 'Teks Saja'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Jeda Antar Grup:</span>
                              <span className="font-bold text-white">{groupDelaySeconds} Detik</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Estimasi Total Waktu:</span>
                              <span className="font-bold text-purple-400 font-mono">
                                ~{Math.ceil((selectedGroupIds.length * groupDelaySeconds) / 60)} Menit
                              </span>
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] space-y-1">
                            <div className="font-bold flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span>Peringatan Kebijakan WhatsApp:</span>
                            </div>
                            <p className="text-slate-300">
                              Pastikan grup yang dituju mengizinkan promosi. Pesan akan dikirim satu per satu menggunakan nomor WhatsApp Anda yang terhubung secara nyata.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setShowGroupConfirmModal(false)}
                            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            onClick={handleStartGroupBroadcast}
                            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 shadow-md cursor-pointer"
                          >
                            Ya, Mulai Pengiriman Riil
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            )}

            {/* 4. CHANNEL BROADCAST VIEW - HONEST STATUS AS MANDATED */}
            {currentView === 'channel' && (
              !isVipActive ? (
                renderVipLockedGate('Channel Broadcast')
              ) : (
                <div className="p-6 rounded-2xl bg-[#0c101d] border border-slate-800 space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-white">Channel Broadcast (Saluran WhatsApp)</h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Status dukungan fitur integrasi siaran saluran publik.
                    </p>
                  </div>

                  {/* Mandatory Transparency Box as requested in prompt */}
                  <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-slate-200 space-y-3">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                      <span>STATUS: BELUM TERSEDIA DARI PROVIDER WHATSAPP</span>
                    </div>

                    <div className="text-xs text-slate-300 leading-relaxed space-y-2">
                      <p>
                        Sesuai pedoman integritas teknis <strong>ZynderJhnzV1Beta</strong>:
                      </p>
                      <p className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300">
                        Meta WhatsApp Business Platform dan API Gateway belum menyediakan endpoint API publik resmi untuk melakukan broadcast terprogram ke dalam WhatsApp Channels (Saluran Buletin). Berdasarkan kebijakan privasi Meta, publikasi Saluran saat ini hanya dapat dilakukan secara manual oleh pemilik saluran melalui aplikasi resmi WhatsApp.
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Kami tidak menampilkan antarmuka palsu atau simulasi pura-pura sukses. Begitu Meta merilis Channels API endpoint, modul ini akan otomatis terintegrasi.
                      </p>
                    </div>
                  </div>
                </div>
              )
            )}

            {/* 5. CONTACT BROADCAST VIEW */}
            {currentView === 'contact' && (
              !isVipActive ? (
                renderVipLockedGate('Contact Broadcast')
              ) : (
                <div className="space-y-6">
                  {/* TWO-TAB NAVIGATION HEADER */}
                  <div className="p-4 rounded-2xl bg-[#0c101d] border border-slate-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4 mb-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setCurrentView('group')}
                          className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <Users className="w-4 h-4 text-cyan-400" />
                          <span>TAB 1: Group Broadcast</span>
                        </button>
                        <button
                          onClick={() => setCurrentView('group-dm')}
                          className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <UserCheck className="w-4 h-4 text-cyan-400" />
                          <span>TAB 2: Group Member DM</span>
                        </button>
                        <button
                          onClick={() => setCurrentView('contact')}
                          className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 bg-gradient-to-r from-purple-600/20 to-cyan-500/20 text-purple-300 border border-purple-500/40 shadow-sm shadow-purple-500/10 cursor-pointer"
                        >
                          <Send className="w-4 h-4 text-purple-400" />
                          <span>TAB 3: Contact Broadcast</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Gateway: {waStatus?.status === 'CONNECTED' ? 'WhatsApp Terhubung' : 'WhatsApp Belum Terhubung'}</span>
                      </div>
                    </div>

                    <div>
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span>Contact Broadcast</span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-purple-500/10 text-purple-400 border border-purple-500/30">
                          Individual Opt-In Delivery
                        </span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-1">
                        Kelola dan kirim pesan promosi secara individual kepada kontak yang telah menyetujui komunikasi.
                      </p>
                    </div>
                  </div>

                  {/* MONITORING / REAL-TIME PROGRESS CARD */}
                  {contactProgress && (
                    <div className="p-5 rounded-2xl bg-[#0e1424] border border-purple-500/40 shadow-lg shadow-purple-500/5 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {isContactBroadcasting ? (
                            <RotateCw className="w-4 h-4 text-purple-400 animate-spin" />
                          ) : contactProgress.isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-amber-400" />
                          )}
                          <span className="text-sm font-bold text-white">
                            {isContactBroadcasting
                              ? 'Proses Pengiriman Broadcast Kontak Sedang Berjalan...'
                              : contactProgress.isDone
                              ? 'Broadcast Kontak Telah Selesai!'
                              : 'Broadcast Dihentikan'}
                          </span>
                        </div>

                        {isContactBroadcasting && (
                          <button
                            onClick={handleStopContactBroadcast}
                            disabled={contactProgress.isStopping}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <Pause className="w-3.5 h-3.5" />
                            <span>{contactProgress.isStopping ? 'Menghentikan...' : 'Stop Broadcast'}</span>
                          </button>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div>
                        <div className="flex justify-between text-xs text-slate-400 mb-1.5 font-mono">
                          <span>
                            Progress: {contactProgress.currentIdx} / {contactProgress.total} Kontak
                          </span>
                          <span className="text-purple-400 font-bold">
                            {contactProgress.total > 0
                              ? Math.round((contactProgress.currentIdx / contactProgress.total) * 100)
                              : 0}
                            %
                          </span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-500 transition-all duration-300 rounded-full"
                            style={{
                              width: `${
                                contactProgress.total > 0
                                  ? (contactProgress.currentIdx / contactProgress.total) * 100
                                  : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Monitoring Metrics Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                          <div className="text-[11px] text-slate-400">Total Kontak Dipilih</div>
                          <div className="text-lg font-bold text-white font-mono mt-0.5">{contactProgress.total}</div>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-900/80 border border-emerald-500/20">
                          <div className="text-[11px] text-emerald-400">Berhasil Dikirim</div>
                          <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
                            {contactProgress.successCount}
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-900/80 border border-rose-500/20">
                          <div className="text-[11px] text-rose-400">Gagal Dikirim</div>
                          <div className="text-lg font-bold text-rose-400 font-mono mt-0.5">
                            {contactProgress.failedCount}
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-900/80 border border-amber-500/20">
                          <div className="text-[11px] text-amber-400">Opt-out / Dilewati</div>
                          <div className="text-lg font-bold text-amber-400 font-mono mt-0.5">
                            {contactProgress.skippedCount}
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 col-span-2 sm:col-span-1">
                          <div className="text-[11px] text-slate-400">Sedang Diproses</div>
                          <div className="text-xs font-semibold text-purple-300 truncate mt-1">
                            {contactProgress.currentTargetName || '-'}
                          </div>
                        </div>
                      </div>

                      {/* Live Queue Event Log */}
                      {contactProgress.logs.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-purple-400" />
                            <span>Log Real-Time Pengiriman Kontak</span>
                          </div>
                          <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-slate-950/80 border border-slate-800 font-mono text-[11px]">
                            {contactProgress.logs.map((log, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {log.status === 'SUCCESS' ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  ) : log.status === 'OPTED_OUT' ? (
                                    <Ban className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                  ) : (
                                    <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                  )}
                                  <span className="font-semibold text-white truncate">{log.name}</span>
                                  <span className="text-[10px] text-slate-400 font-mono">({log.phone})</span>
                                  {log.messageId && (
                                    <span className="text-[10px] text-slate-500 truncate hidden sm:inline">
                                      ID: {log.messageId}
                                    </span>
                                  )}
                                  {log.error && (
                                    <span
                                      className={`text-[10px] truncate ${
                                        log.status === 'OPTED_OUT' ? 'text-amber-400' : 'text-rose-400'
                                      }`}
                                    >
                                      ({log.error})
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-500 shrink-0 ml-2">{log.time}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* MAIN TWO-COLUMN CONTENT */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* LEFT COLUMN: CONTACT MANAGEMENT & SELECTION (6 Cols) */}
                    <div className="lg:col-span-6 p-5 rounded-2xl bg-[#0c101d] border border-slate-800 space-y-4">
                      {/* Contact Action Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Send className="w-4 h-4 text-purple-400" />
                            <span>Daftar Kontak Terverifikasi</span>
                          </h3>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {selectedContactIds.length} dari {contactList.length} kontak terpilih
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setIsAddContactModalOpen(true)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 flex items-center gap-1.5 cursor-pointer shadow-sm shadow-purple-600/20"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Tambah Kontak</span>
                          </button>

                          <label className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Impor CSV</span>
                            <input type="file" accept=".csv" onChange={handleCsvImport} className="hidden" />
                          </label>
                        </div>
                      </div>

                      {/* Search & Tag Filter Bar */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <div className="sm:col-span-7 relative">
                          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Cari nama atau nomor WhatsApp..."
                            value={contactSearchQuery}
                            onChange={(e) => setContactSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                          />
                        </div>

                        <div className="sm:col-span-5">
                          <select
                            value={contactTagFilter}
                            onChange={(e) => setContactTagFilter(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-purple-500"
                          >
                            <option value="ALL">Semua Kategori Tag</option>
                            <option value="JB Akun">JB Akun</option>
                            <option value="Reseller">Reseller</option>
                            <option value="Jasa Digital">Jasa Digital</option>
                            <option value="Pebisnis Online">Pebisnis Online</option>
                            <option value="Impor CSV">Impor CSV</option>
                          </select>
                        </div>
                      </div>

                      {/* Select All Controls */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleSelectAllContacts}
                          className="flex-1 py-1.5 px-3 rounded-lg text-[11px] font-semibold text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>Pilih Semua (Opt-In Sah)</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDeselectAllContacts}
                          className="flex-1 py-1.5 px-3 rounded-lg text-[11px] font-semibold text-slate-400 bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Square className="w-3.5 h-3.5" />
                          <span>Batalkan Pilihan</span>
                        </button>
                      </div>

                      {/* Contact List Scroll Area */}
                      <div className="max-h-[480px] overflow-y-auto space-y-2 pr-1">
                        {contactList
                          .filter((c) => {
                            const matchSearch =
                              c.name.toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
                              c.phone.includes(contactSearchQuery);
                            const matchTag =
                              contactTagFilter === 'ALL' || c.tag === contactTagFilter;
                            return matchSearch && matchTag;
                          })
                          .map((c) => {
                            const isSelected = selectedContactIds.includes(c.id);
                            const isSelectable = !c.optedOut && c.consentApproved;

                            return (
                              <div
                                key={c.id}
                                className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                                  c.optedOut
                                    ? 'bg-rose-950/15 border-rose-500/30 text-slate-400'
                                    : isSelected
                                    ? 'bg-purple-950/20 border-purple-500/40 text-white'
                                    : 'bg-slate-900/70 border-slate-800 text-slate-300'
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  {/* Select Checkbox */}
                                  <button
                                    type="button"
                                    disabled={!isSelectable}
                                    onClick={() => handleToggleContact(c.id)}
                                    title={
                                      !isSelectable
                                        ? 'Kontak terdaftar Opt-out atau belum menyetujui promosi'
                                        : 'Pilih kontak ini'
                                    }
                                    className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors shrink-0 ${
                                      !isSelectable
                                        ? 'bg-slate-900 border border-slate-800 opacity-40 cursor-not-allowed'
                                        : isSelected
                                        ? 'bg-purple-600 text-white font-bold cursor-pointer'
                                        : 'border border-slate-700 bg-slate-950 cursor-pointer'
                                    }`}
                                  >
                                    {isSelected && isSelectable && (
                                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    )}
                                  </button>

                                  <div className="min-w-0">
                                    <div className="font-semibold text-xs text-white flex items-center gap-2 truncate">
                                      <span>{c.name}</span>
                                      <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-slate-800 text-slate-400 border border-slate-700">
                                        {c.tag}
                                      </span>
                                    </div>
                                    <div className="text-[11px] font-mono text-slate-400 mt-0.5">{c.phone}</div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  {/* Status Badges */}
                                  {c.optedOut ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                                      <Ban className="w-3 h-3" />
                                      <span>Opt-Out</span>
                                    </span>
                                  ) : c.consentApproved ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                      Persetujuan Sah
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                      Pending Izin
                                    </span>
                                  )}

                                  {/* Toggle Opt-Out Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleOptOut(c.id)}
                                    title={c.optedOut ? 'Pulihkan dari daftar opt-out' : 'Tandai kontak ini opt-out (menolak promosi)'}
                                    className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                                      c.optedOut
                                        ? 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/30 text-amber-300'
                                        : 'bg-slate-800 hover:bg-rose-500/20 border-slate-700 hover:border-rose-500/40 text-slate-400 hover:text-rose-300'
                                    }`}
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Delete Contact Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteContact(c.id)}
                                    title="Hapus kontak dari daftar"
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 border border-slate-700 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 cursor-pointer transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>

                      {/* Anti-Scraping / Ethics Banner */}
                      <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/30 text-[11px] text-purple-200 space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-purple-300">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Prinsip Perlindungan Privasi & Anti-Spam:</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed">
                          Sistem melarang keras ekstraksi otomatis nomor anggota grup tanpa persetujuan. Pesan individual hanya dikirimkan kepada kontak yang secara sukarela mendaftar atau menyetujui komunikasi.
                        </p>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: COMPOSER, DELAY & PREVIEW (6 Cols) */}
                    <div className="lg:col-span-6 space-y-5">
                      {/* Composer Box */}
                      <div className="p-5 rounded-2xl bg-[#0c101d] border border-slate-800 space-y-4">
                        <div>
                          <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-purple-400" />
                            <span>Komposer Pesan Personal Kontak</span>
                          </h3>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Gunakan token <strong>{'{nama}'}</strong> untuk memanggil nama penerima secara otomatis pada setiap pesan.
                          </p>
                        </div>

                        {/* Textarea */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                            Teks Materi Broadcast Personal
                          </label>
                          <textarea
                            rows={6}
                            value={contactMessageText}
                            onChange={(e) => setContactMessageText(e.target.value)}
                            placeholder="Halo kak {nama}! Kami ada penawaran eksklusif..."
                            className="w-full p-3.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:border-purple-500 placeholder-slate-500 leading-relaxed"
                          />
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <span className="text-[10px] text-slate-400 mr-1">Sisipkan Token:</span>
                            {['{nama}', '{waktu}'].map((chip) => (
                              <button
                                key={chip}
                                type="button"
                                onClick={() => setContactMessageText((prev) => `${prev} ${chip}`)}
                                className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 cursor-pointer"
                              >
                                + {chip}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Image Upload */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                            Lampiran Gambar (Opsional — Gambar + Teks)
                          </label>
                          {contactMediaUrl ? (
                            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <img
                                  src={contactMediaUrl}
                                  alt="Preview"
                                  className="w-14 h-14 rounded-lg object-cover border border-slate-700 shrink-0"
                                />
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold text-white truncate">Gambar Siap Dikirim</div>
                                  <div className="text-[10px] text-emerald-400 mt-0.5">Format: Gambar + Caption</div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => setContactMediaUrl(null)}
                                className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 cursor-pointer"
                                title="Hapus gambar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <label className="border-2 border-dashed border-slate-700 hover:border-purple-500/50 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-slate-900/40">
                              <ImageIcon className="w-6 h-6 text-slate-400" />
                              <div className="text-xs text-slate-300 font-medium">Klik untuk Unggah Gambar Promosi</div>
                              <div className="text-[10px] text-slate-500">Mendukung format JPG, PNG, WebP (Maks 5MB)</div>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleContactImageUpload}
                                className="hidden"
                              />
                            </label>
                          )}
                        </div>

                        {/* Delay Setting */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-purple-400" />
                              <span>Jeda Pengiriman Antar Kontak</span>
                            </label>
                            <span className="text-xs font-mono font-bold text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded border border-purple-500/30">
                              {contactDelaySeconds} Detik
                            </span>
                          </div>
                          <input
                            type="range"
                            min={3}
                            max={30}
                            step={1}
                            value={contactDelaySeconds}
                            onChange={(e) => setContactDelaySeconds(Number(e.target.value))}
                            className="w-full accent-purple-500 cursor-pointer"
                          />
                          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                            <span>Minimal 3 Detik</span>
                            <span className="text-purple-400 font-medium">Default Rekomendasi: 5 Detik</span>
                            <span>Maksimal 30 Detik</span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-2">
                          {isContactBroadcasting ? (
                            <button
                              onClick={handleStopContactBroadcast}
                              className="w-full py-3.5 px-4 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                            >
                              <Pause className="w-4 h-4" />
                              <span>Hentikan Proses Broadcast Kontak</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => setShowContactConfirmModal(true)}
                              disabled={
                                selectedContactIds.length === 0 ||
                                !contactMessageText.trim() ||
                                waStatus?.status !== 'CONNECTED'
                              }
                              className="w-full py-3.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                              <Play className="w-4 h-4 fill-white" />
                              <span>
                                Mulai Broadcast ke {selectedContactIds.length} Kontak Terpilih
                              </span>
                            </button>
                          )}

                          {waStatus?.status !== 'CONNECTED' && (
                            <p className="text-[11px] text-amber-400 mt-2 text-center">
                              * WhatsApp belum terhubung. Harap hubungkan di menu WhatsApp Connection sebelum mulai broadcast.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Live WhatsApp Bubble Preview with Personalized Name */}
                      <div className="p-5 rounded-2xl bg-[#0c101d] border border-slate-800 space-y-3">
                        <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                          <span>Live Preview Pesan WhatsApp:</span>
                          <span className="text-[10px] text-slate-500">Personalisasi Otomatis</span>
                        </div>

                        <div className="p-4 rounded-xl bg-[#0b141a] border border-slate-800/80 shadow-inner">
                          <div className="max-w-[340px] ml-auto rounded-lg bg-[#005c4b] text-white p-2.5 shadow text-xs space-y-2">
                            {contactMediaUrl && (
                              <img
                                src={contactMediaUrl}
                                alt="Attachment"
                                className="w-full max-h-48 object-cover rounded-md"
                              />
                            )}
                            <div className="whitespace-pre-wrap leading-relaxed text-[11px] font-sans">
                              {formatBroadcastMessage(contactMessageText, {
                                nama: 'Aldo Akun JB',
                                produk: 'Akun & Layanan Digital',
                                waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
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

                  {/* ADD CONTACT MANUAL MODAL */}
                  {isAddContactModalOpen && (
                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                      <div className="w-full max-w-md rounded-2xl bg-[#0f1422] border border-slate-800 p-6 space-y-5 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                          <div className="flex items-center gap-2 text-white font-bold text-base">
                            <UserPlus className="w-5 h-5 text-purple-400" />
                            <span>Tambah Kontak Baru</span>
                          </div>
                          <button
                            onClick={() => setIsAddContactModalOpen(false)}
                            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <form onSubmit={handleAddManualContact} className="space-y-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">
                              Nama Pelanggan / Kontak *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Misal: Kak Rian Gamer"
                              value={newContactName}
                              onChange={(e) => setNewContactName(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-purple-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">
                              Nomor WhatsApp *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Misal: 081234567890 atau 6281234567890"
                              value={newContactPhone}
                              onChange={(e) => setNewContactPhone(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">
                              Kategori / Tag
                            </label>
                            <select
                              value={newContactTag}
                              onChange={(e) => setNewContactTag(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-purple-500"
                            >
                              <option value="JB Akun">JB Akun</option>
                              <option value="Reseller">Reseller</option>
                              <option value="Jasa Digital">Jasa Digital</option>
                              <option value="Pebisnis Online">Pebisnis Online</option>
                              <option value="Pelanggan VIP">Pelanggan VIP</option>
                            </select>
                          </div>

                          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                            <label className="flex items-start gap-2.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={newContactConsent}
                                onChange={(e) => setNewContactConsent(e.target.checked)}
                                className="mt-0.5 accent-purple-500 rounded"
                              />
                              <div className="text-[11px] text-slate-300">
                                <span className="font-semibold text-white">Status Persetujuan (Consent Approved):</span>
                                <p className="text-slate-400 mt-0.5">
                                  Kontak ini secara sukarela mendaftar atau memberikan izin menerima pesan promosi.
                                </p>
                              </div>
                            </label>
                          </div>

                          <div className="flex items-center gap-3 pt-2">
                            <button
                              type="button"
                              onClick={() => setIsAddContactModalOpen(false)}
                              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 cursor-pointer"
                            >
                              Batal
                            </button>
                            <button
                              type="submit"
                              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 cursor-pointer"
                            >
                              Simpan Kontak
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* CONTACT BROADCAST CONFIRMATION MODAL */}
                  {showContactConfirmModal && (
                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                      <div className="w-full max-w-md rounded-2xl bg-[#0f1422] border border-slate-800 p-6 space-y-5 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                          <div className="flex items-center gap-2 text-white font-bold text-base">
                            <Send className="w-5 h-5 text-purple-400" />
                            <span>Konfirmasi Broadcast Kontak</span>
                          </div>
                          <button
                            onClick={() => setShowContactConfirmModal(false)}
                            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="space-y-3 text-xs text-slate-300">
                          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Total Kontak Sasaran:</span>
                              <span className="font-bold text-white">{selectedContactIds.length} Kontak</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Format Pesan:</span>
                              <span className="font-bold text-purple-400">
                                {contactMediaUrl ? 'Gambar + Teks (Caption)' : 'Teks Saja'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Jeda Antar Pesan:</span>
                              <span className="font-bold text-white">{contactDelaySeconds} Detik</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Estimasi Total Waktu:</span>
                              <span className="font-bold text-cyan-400 font-mono">
                                ~{Math.ceil((selectedContactIds.length * contactDelaySeconds) / 60)} Menit
                              </span>
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 text-purple-200 text-[11px] space-y-1">
                            <div className="font-bold flex items-center gap-1.5 text-purple-300">
                              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                              <span>Proteksi Otomatis Opt-Out:</span>
                            </div>
                            <p className="text-slate-300">
                              Kontak yang berstatus Opt-Out atau tidak memiliki persetujuan akan secara otomatis dilewati untuk menjaga kepatuhan dan reputasi nomor WhatsApp Anda.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setShowContactConfirmModal(false)}
                            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 cursor-pointer"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            onClick={handleStartContactBroadcast}
                            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 shadow-md cursor-pointer"
                          >
                            Ya, Mulai Pengiriman Riil
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            )}

            {/* GROUP MEMBER DM BROADCAST VIEW */}
            {currentView === 'group-dm' && (
              <GroupMemberDmBroadcastView
                user={user}
                userProfile={userProfile}
                isVipActive={isVipActive}
                waStatus={waStatus}
                availableGroups={availableGroups}
                onOpenPaymentModal={() => setIsPaymentModalOpen(true)}
                logActivity={logActivity}
                renderVipLockedGate={renderVipLockedGate}
              />
            )}

            {/* 6. BROADCAST HISTORY VIEW */}
            {currentView === 'history' && (
              !isVipActive ? (
                renderVipLockedGate('Broadcast History')
              ) : (
                <div className="p-6 rounded-2xl bg-[#0c101d] border border-slate-800 space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-white">Broadcast Delivery History (Verified Receipts)</h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Catatan tanda terima pengiriman dari provider WhatsApp nyata.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {[
                      { target: 'Grup: Komunitas JB Akun #1', id: 'GRP_1730538091_A8B', status: 'ACCEPTED', time: '10 menit lalu', desc: 'Diterima oleh Gateway WhatsApp' },
                      { target: 'Kontak: 081234567890', id: '3EB0729188AC', status: 'ACCEPTED', time: '1 jam lalu', desc: 'Diterima oleh Gateway WhatsApp' },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                        <div>
                          <div className="font-bold text-white">{item.target}</div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">Receipt ID: {item.id}</div>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {item.status}
                          </span>
                          <div className="text-[10px] text-slate-500 mt-0.5">{item.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}

            {/* 7. MEMBERSHIP VIEW */}
            {currentView === 'membership' && (
              <div className="p-6 rounded-2xl bg-[#0c101d] border border-slate-800 space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Sistem Membership & VIP Access Control</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Membership VIP wajib aktif untuk menggunakan seluruh modul broadcast dan koneksi WhatsApp.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-cyan-950/40 border border-purple-500/30 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Crown className="w-5 h-5 text-amber-400" />
                        <h3 className="text-lg font-extrabold text-white">
                          Status Anda: {membership?.tier || (isAdmin ? 'VVIP' : 'FREE')}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        {isVipActive
                          ? 'Akses fitur WhatsApp & Broadcast terbuka penuh sesuai masa aktif server.'
                          : 'Akun Anda berstatus FREE. Fitur WhatsApp Connection dan Broadcast terkunci.'}
                      </p>
                    </div>

                    <button
                      onClick={() => setIsPaymentModalOpen(true)}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 shadow-md cursor-pointer self-start sm:self-auto"
                    >
                      {isVipActive ? 'Perpanjang Masa Aktif VIP' : 'Aktivasi VIP (Rp10.000)'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-400">Tarif Langganan:</span>
                      <div className="text-base font-bold text-cyan-400 font-mono mt-0.5">Rp 10.000 / 30 Hari</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Masa Aktif Server:</span>
                      <div className="text-base font-bold text-purple-400 font-mono mt-0.5">
                        {membership?.expiresAt ? new Date(membership.expiresAt).toLocaleDateString('id-ID') : 'Belum Berlangganan'}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">Validasi Otorisasi:</span>
                      <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">
                        Server-Side Enforced
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pricing Card Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                    <div className="text-sm font-bold text-white">Hak Akses FREE (Gratis)</div>
                    <ul className="text-xs text-slate-400 space-y-2 list-disc list-inside">
                      <li>Melihat landing page publik</li>
                      <li>Login Google Authentication</li>
                      <li>Melihat dashboard dasar & profil</li>
                      <li>Melihat rincian harga VIP</li>
                    </ul>
                    <div className="text-[11px] text-rose-400 font-medium">
                      * Seluruh fitur broadcast dan koneksi WhatsApp terkunci.
                    </div>
                  </div>

                  <div className="p-5 rounded-xl bg-gradient-to-b from-[#11192e] to-slate-900 border border-cyan-500/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold text-white">Hak Akses VIP (Rp10.000 / 30 Hari)</div>
                      <Crown className="w-4 h-4 text-amber-400" />
                    </div>
                    <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
                      <li>Akses penuh modul WhatsApp Connection (QR & Pairing)</li>
                      <li>Group Broadcast ke grup komunitas JB & Reseller</li>
                      <li>Contact Pushkontak dengan filter tag</li>
                      <li>Log pengiriman real-time & verifikasi tanda terima</li>
                      <li>Dukungan anti-ban delay proteksi</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* 8. SETTINGS VIEW */}
            {currentView === 'settings' && (
              <div className="p-6 rounded-2xl bg-[#0c101d] border border-slate-800 space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Pengaturan Akun & Profil</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Kelola data identitas pengguna yang tersimpan di Firebase Firestore.
                  </p>
                </div>

                {profileMessage && (
                  <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs">
                    {profileMessage}
                  </div>
                )}

                <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Nama Tampilan (Display Name)
                    </label>
                    <input
                      type="text"
                      value={displayNameInput}
                      onChange={(e) => setDisplayNameInput(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Email Google Terautentikasi (Read-only)
                    </label>
                    <input
                      type="text"
                      value={userProfile?.email || user?.email || ''}
                      disabled
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-500 font-mono cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Firebase Auth UID (Document Key)
                    </label>
                    <input
                      type="text"
                      value={user?.uid || ''}
                      disabled
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-500 font-mono cursor-not-allowed"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isUpdatingProfile}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isUpdatingProfile ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 9. ADMIN CONTROL VIEW */}
            {currentView === 'admin' && isAdmin && (
              <div className="p-6 rounded-2xl bg-[#0c101d] border border-cyan-500/30 space-y-6">
                <div>
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Administrator Control Room</span>
                  </div>
                  <h2 className="text-xl font-bold text-white">Manajemen Otorisasi & Akses Membership</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Akses kontrol langsung untuk memberikan status VIP/VVIP dan memantau koneksi pengguna.
                  </p>
                </div>

                {adminActionMessage && (
                  <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs">
                    {adminActionMessage}
                  </div>
                )}

                <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4 max-w-lg">
                  <h3 className="text-sm font-bold text-white">Berikan Akses VIP / VVIP Manual</h3>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Target User UID
                    </label>
                    <input
                      type="text"
                      placeholder="Masukkan UID Pengguna"
                      value={adminTargetUid}
                      onChange={(e) => setAdminTargetUid(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tingkat Tier</label>
                      <select
                        value={adminTier}
                        onChange={(e) => setAdminTier(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                      >
                        <option value="VIP">VIP</option>
                        <option value="VVIP">VVIP (Lifetime/Custom)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">Jumlah Hari</label>
                      <input
                        type="number"
                        value={adminDays}
                        onChange={(e) => setAdminDays(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleAdminGrantVip}
                    className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 cursor-pointer"
                  >
                    Terapkan Otorisasi VIP
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* VIP Payment Modal */}
      <VipPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setResubmitTargetId(null);
          refreshMyTransactions();
        }}
        onSuccess={() => {
          refreshMembership();
          refreshWaStatus();
          refreshMyTransactions();
        }}
        resubmitTransactionId={resubmitTargetId}
        initialPendingPayment={activePendingPayment}
      />
    </div>
  );
};
