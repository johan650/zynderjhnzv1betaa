import { auth } from '../firebase';

export interface MembershipResponse {
  uid: string;
  tier: 'FREE' | 'VIP' | 'VVIP';
  status: 'ACTIVE' | 'EXPIRED' | 'INACTIVE';
  isVipActive: boolean;
  activatedAt?: string;
  expiresAt?: string;
  remainingSeconds?: number;
  price?: number;
  serverTime: string;
}

export interface PaymentOrderResponse {
  paymentId: string;
  amount: number;
  currency: string;
  tier: string;
  durationDays: number;
  method: string;
  qrisPayload: string;
  validUntil: string;
}

export type ConnectionStatus =
  | 'DISCONNECTED'
  | 'INITIALIZING'
  | 'QR_READY'
  | 'PAIRING_REQUIRED'
  | 'AUTHENTICATING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'CONNECTION_EXPIRED'
  | 'ERROR';

export interface WhatsAppStatusPayload {
  uid: string;
  provider: 'gateway' | 'cloud_api';
  status: ConnectionStatus;
  phoneNumber?: string;
  pushName?: string;
  qrCode?: string;
  qrDataUrl?: string;
  pairingCode?: string;
  connectedAt?: string;
  lastHeartbeat?: string;
  lastError?: string | null;
  deviceInfo?: {
    platform: string;
    battery?: number;
    waVersion?: string;
  };
}

export interface WhatsAppStatusResponse {
  status: WhatsAppStatusPayload;
}

class ApiClientService {
  private async getAuthHeaders(): Promise<HeadersInit> {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Pengguna belum terautentikasi.');
    }
    const token = await currentUser.getIdToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }

  // Parse respons API secara aman. Jika server mengembalikan HTML/teks (mis. error proxy platform),
  // tampilkan status HTTP nyata, bukan error parsing mentah.
  private async safeParseJson(res: Response, fallbackMessage: string): Promise<any> {
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      throw new Error(
        `${fallbackMessage} (HTTP ${res.status}: server mengembalikan respons non-JSON. Periksa log server/worker.)`
      );
    }
  }

  async getMembershipStatus(): Promise<MembershipResponse> {
    const headers = await this.getAuthHeaders();
    const res = await fetch('/api/membership/status', { headers });
    const data = await this.safeParseJson(res, 'Gagal memuat status membership');
    if (!res.ok) {
      throw new Error(data.message || 'Gagal memuat status membership.');
    }
    return data;
  }

  async createPaymentOrder(): Promise<PaymentOrderResponse> {
    const headers = await this.getAuthHeaders();
    const res = await fetch('/api/membership/create-order', {
      method: 'POST',
      headers,
    });
    const data = await this.safeParseJson(res, 'Gagal membuat pesanan pembayaran');
    if (!res.ok) {
      throw new Error(data.message || 'Gagal membuat pesanan pembayaran.');
    }
    return data;
  }

  async verifyPayment(paymentId: string): Promise<{ success: boolean; message: string }> {
    const headers = await this.getAuthHeaders();
    const res = await fetch('/api/membership/verify-payment', {
      method: 'POST',
      headers,
      body: JSON.stringify({ paymentId }),
    });
    const data = await this.safeParseJson(res, 'Gagal memverifikasi pembayaran');
    if (!res.ok) {
      throw new Error(data.message || 'Gagal memverifikasi pembayaran.');
    }
    return data;
  }

  async getPublicSettings(): Promise<any> {
    const res = await fetch('/api/public/settings');
    return this.safeParseJson(res, 'Gagal memuat pengaturan publik');
  }

  async submitManualPayment(payload: {
    paymentId?: string;
    senderName: string;
    senderAccount: string;
    notes?: string;
    receiptUrl: string;
    tier?: string;
    amount?: number;
    durationDays?: number;
    method?: string;
  }): Promise<{ success: boolean; message: string; payment: any }> {
    const headers = await this.getAuthHeaders();
    const res = await fetch('/api/membership/submit-manual-payment', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const data = await this.safeParseJson(res, 'Gagal mengirim bukti pembayaran');
    if (!res.ok) {
      throw new Error(data.message || 'Gagal mengirim bukti pembayaran.');
    }
    return data;
  }

  async resubmitManualPayment(payload: {
    paymentId: string;
    receiptUrl: string;
    senderName?: string;
    senderAccount?: string;
    notes?: string;
  }): Promise<{ success: boolean; message: string; payment: any }> {
    const headers = await this.getAuthHeaders();
    const res = await fetch('/api/membership/resubmit-manual-payment', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const data = await this.safeParseJson(res, 'Gagal mengirim ulang bukti pembayaran');
    if (!res.ok) {
      throw new Error(data.message || 'Gagal mengirim ulang bukti pembayaran.');
    }
    return data;
  }

  async getMyTransactions(): Promise<{
    payments: any[];
    activePending: any | null;
    latestPayment: any | null;
  }> {
    const headers = await this.getAuthHeaders();
    const res = await fetch('/api/membership/my-transactions', { headers });
    const data = await this.safeParseJson(res, 'Gagal memuat riwayat transaksi Anda');
    if (!res.ok) {
      throw new Error(data.message || 'Gagal memuat riwayat transaksi.');
    }
    return data;
  }

  async acknowledgeApproval(paymentId?: string): Promise<{
    success: boolean;
    isVipActive: boolean;
    subscription: any;
    message: string;
    acknowledged: boolean;
  }> {
    const headers = await this.getAuthHeaders();
    const res = await fetch('/api/membership/acknowledge-approval', {
      method: 'POST',
      headers,
      body: JSON.stringify({ paymentId }),
    });
    const data = await this.safeParseJson(res, 'Gagal mengonfirmasi aktivasi VIP');
    if (!res.ok) {
      throw new Error(data.message || 'Gagal mengonfirmasi aktivasi VIP.');
    }
    return data;
  }

  async getWhatsAppCapabilities(): Promise<any> {
    const headers = await this.getAuthHeaders();
    const res = await fetch('/api/whatsapp/capabilities', { headers });
    return this.safeParseJson(res, 'Gagal memuat kapabilitas WhatsApp');
  }

  async getWhatsAppStatus(): Promise<WhatsAppStatusResponse> {
    const headers = await this.getAuthHeaders();
    const res = await fetch('/api/whatsapp/status', { headers });
    const data = await this.safeParseJson(res, 'Gagal memuat status WhatsApp');
    if (!res.ok || data.success === false) {
      throw new Error(data.message || 'Gagal memuat status WhatsApp.');
    }
    return data;
  }

  async connectWhatsApp(provider: 'gateway' | 'cloud_api' = 'gateway'): Promise<any> {
    const headers = await this.getAuthHeaders();
    const res = await fetch('/api/whatsapp/connect', {
      method: 'POST',
      headers,
      body: JSON.stringify({ provider }),
    });
    const data = await this.safeParseJson(res, 'Gagal menghubungkan WhatsApp');
    if (!res.ok || data.success === false) {
      throw new Error(data.message || 'Gagal menghubungkan WhatsApp.');
    }
    return data;
  }

  async requestPairingCode(phoneNumber: string): Promise<{ success: boolean; pairingCode: string; message: string }> {
    const headers = await this.getAuthHeaders();
    const res = await fetch('/api/whatsapp/request-pairing', {
      method: 'POST',
      headers,
      body: JSON.stringify({ phoneNumber }),
    });
    const data = await this.safeParseJson(res, 'Gagal meminta kode pairing WhatsApp');
    if (!res.ok || data.success === false) {
      throw new Error(data.message || data.error || 'Gagal meminta kode pairing WhatsApp.');
    }
    return data;
  }

  async reconnectWhatsApp(): Promise<any> {
    const headers = await this.getAuthHeaders();
    const res = await fetch('/api/whatsapp/reconnect', {
      method: 'POST',
      headers,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Gagal menyambung ulang sesi WhatsApp.');
    }
    return res.json();
  }

  async disconnectWhatsApp(): Promise<any> {
    const headers = await this.getAuthHeaders();
    const res = await fetch('/api/whatsapp/disconnect', {
      method: 'POST',
      headers,
    });
    const data = await this.safeParseJson(res, 'Gagal memutuskan sesi WhatsApp');
    if (!res.ok) {
      throw new Error(data.message || 'Gagal memutuskan sesi WhatsApp.');
    }
    return data;
  }

  async resetWhatsAppSession(): Promise<any> {
    const headers = await this.getAuthHeaders();
    const res = await fetch('/api/whatsapp/reset', {
      method: 'POST',
      headers,
    });
    const data = await this.safeParseJson(res, 'Gagal mereset sesi WhatsApp');
    if (!res.ok) {
      throw new Error(data.message || 'Gagal mereset sesi WhatsApp.');
    }
    return data;
  }

  async getWhatsAppGroups(): Promise<any> {
    const headers = await this.getAuthHeaders();
    const res = await fetch('/api/whatsapp/groups', { headers });
    const data = await this.safeParseJson(res, 'Gagal memuat daftar grup WhatsApp');
    if (!res.ok) {
      throw new Error(data.message || 'Gagal memuat daftar grup WhatsApp.');
    }
    return data;
  }

  async getGroupMembers(groupId: string): Promise<any> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/whatsapp/groups/${encodeURIComponent(groupId)}/members`, { headers });
    const data = await this.safeParseJson(res, 'Gagal mengambil anggota grup');
    if (!res.ok) {
      throw new Error(data.message || 'Gagal memuat anggota grup.');
    }
    return data;
  }

  async startGroupMemberDmBroadcast(payload: {
    groupId: string;
    groupName: string;
    recipients: Array<{
      id: string;
      phone: string;
      formattedPhone?: string;
      name?: string;
      consentApproved: boolean;
      optedOut?: boolean;
    }>;
    message: string;
    mediaUrl?: string | null;
    delaySeconds: number;
    optOutNumbers?: string[];
  }): Promise<any> {
    const headers = await this.getAuthHeaders();
    const res = await fetch('/api/broadcast/group-members/start', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const data = await this.safeParseJson(res, 'Gagal memulai broadcast DM anggota grup');
    if (!res.ok) {
      throw new Error(data.message || 'Gagal memulai broadcast DM anggota grup.');
    }
    return data;
  }

  async pauseGroupMemberDmBroadcast(): Promise<any> {
    const headers = await this.getAuthHeaders();
    const res = await fetch('/api/broadcast/group-members/pause', {
      method: 'POST',
      headers,
    });
    const data = await this.safeParseJson(res, 'Gagal menjeda broadcast');
    if (!res.ok) {
      throw new Error(data.message || 'Gagal menjeda broadcast.');
    }
    return data;
  }

  async resumeGroupMemberDmBroadcast(): Promise<any> {
    const headers = await this.getAuthHeaders();
    const res = await fetch('/api/broadcast/group-members/resume', {
      method: 'POST',
      headers,
    });
    const data = await this.safeParseJson(res, 'Gagal melanjutkan broadcast');
    if (!res.ok) {
      throw new Error(data.message || 'Gagal melanjutkan broadcast.');
    }
    return data;
  }

  async stopGroupMemberDmBroadcast(): Promise<any> {
    const headers = await this.getAuthHeaders();
    const res = await fetch('/api/broadcast/group-members/stop', {
      method: 'POST',
      headers,
    });
    const data = await this.safeParseJson(res, 'Gagal menghentikan broadcast');
    if (!res.ok) {
      throw new Error(data.message || 'Gagal menghentikan broadcast.');
    }
    return data;
  }

  async getGroupMemberDmBroadcastStatus(): Promise<any> {
    const headers = await this.getAuthHeaders();
    const res = await fetch('/api/broadcast/group-members/status', { headers });
    return this.safeParseJson(res, 'Gagal mengecek status broadcast DM');
  }

  async getGroupMemberDmBroadcastHistory(): Promise<any> {
    const headers = await this.getAuthHeaders();
    const res = await fetch('/api/broadcast/group-members/history', { headers });
    return this.safeParseJson(res, 'Gagal mengambil riwayat broadcast DM');
  }

  async sendGroupBroadcast(groupId: string, message: string, mediaUrl?: string): Promise<any> {
    const headers = await this.getAuthHeaders();
    const res = await fetch('/api/broadcast/group', {
      method: 'POST',
      headers,
      body: JSON.stringify({ groupId, message, mediaUrl }),
    });
    const data = await this.safeParseJson(res, 'Gagal mengirim pesan grup');
    if (!res.ok) {
      throw new Error(data.error || data.message || 'Gagal mengirim pesan grup.');
    }
    return data;
  }

  async sendContactBroadcast(phoneNumber: string, message: string, mediaUrl?: string): Promise<any> {
    const headers = await this.getAuthHeaders();
    const res = await fetch('/api/broadcast/contact', {
      method: 'POST',
      headers,
      body: JSON.stringify({ phoneNumber, message, mediaUrl }),
    });
    const data = await this.safeParseJson(res, 'Gagal mengirim pesan kontak');
    if (!res.ok) {
      throw new Error(data.error || data.message || 'Gagal mengirim pesan kontak.');
    }
    return data;
  }

  async sendChannelBroadcast(channelId: string, message: string): Promise<any> {
    const headers = await this.getAuthHeaders();
    const res = await fetch('/api/broadcast/channel', {
      method: 'POST',
      headers,
      body: JSON.stringify({ channelId, message }),
    });
    const data = await this.safeParseJson(res, 'Fitur saluran tidak didukung provider');
    if (!res.ok) {
      throw new Error(data.error || data.message || 'Fitur saluran tidak didukung provider.');
    }
    return data;
  }

  /**
   * Subscribe to real-time WhatsApp updates via Server-Sent Events (SSE)
   */
  async subscribeWhatsAppEvents(
    onUpdate: (state: WhatsAppStatusPayload) => void,
    onError?: (err: any) => void
  ): Promise<() => void> {
    const currentUser = auth.currentUser;
    if (!currentUser) return () => {};

    const token = await currentUser.getIdToken();
    const eventSource = new EventSource(`/api/whatsapp/events?token=${encodeURIComponent(token)}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && data.status) {
          onUpdate(data);
        }
      } catch (err) {
        console.error('[SSE Client] Parse error:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.warn('[SSE Client] Connection warning:', err);
      if (onError) onError(err);
    };

    return () => {
      eventSource.close();
    };
  }
}

export const ApiClient = new ApiClientService();
