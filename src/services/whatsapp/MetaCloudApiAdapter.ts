import {
  WhatsAppProviderAdapter,
  ProviderCapabilities,
  WhatsAppConnectionState,
  SendResult,
  GroupMetadata,
} from './types.ts';

/**
 * Adapter for Official Meta WhatsApp Business Platform (Cloud API)
 * Meta's official API strictly forbids automated group posting and public channel broadcasts.
 */
export class MetaCloudApiAdapter implements WhatsAppProviderAdapter {
  id = 'cloud_api';
  name = 'Meta WhatsApp Business Cloud API (Resmi)';

  getCapabilities(): ProviderCapabilities {
    return {
      qrPairing: false,
      groupBroadcast: false,
      channelBroadcast: false,
      contactBroadcast: true,
      mediaMessage: true,
      notes:
        'Meta Cloud API resmi hanya mendukung percakapan 1-ke-1 (Contact Broadcast) dengan template WhatsApp terverifikasi. Meta TIDAK menyediakan endpoint untuk grup obrolan atau Channels.',
    };
  }

  async initSession(userId: string): Promise<WhatsAppConnectionState> {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '104829102938472';
    const hasToken = Boolean(process.env.WHATSAPP_ACCESS_TOKEN);

    if (!hasToken) {
      return {
        uid: userId,
        provider: 'cloud_api',
        status: 'DISCONNECTED',
        lastError: 'Token Akses Meta Cloud API (WHATSAPP_ACCESS_TOKEN) belum dikonfigurasikan di environment.',
      };
    }

    return {
      uid: userId,
      provider: 'cloud_api',
      status: 'CONNECTED',
      phoneNumber: `+62 ${phoneNumberId.slice(-9)}`,
      pushName: 'Official Business Account',
      connectedAt: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(),
      deviceInfo: {
        platform: 'Meta Cloud API Graph v21.0',
        waVersion: 'Business API Official',
      },
    };
  }

  async disconnect(userId: string): Promise<{ success: boolean; message: string }> {
    return {
      success: true,
      message: 'Sesi koneksi Meta Cloud API dinonaktifkan.',
    };
  }

  async getStatus(userId: string): Promise<WhatsAppConnectionState> {
    const hasToken = Boolean(process.env.WHATSAPP_ACCESS_TOKEN);
    return {
      uid: userId,
      provider: 'cloud_api',
      status: hasToken ? 'CONNECTED' : 'DISCONNECTED',
      lastHeartbeat: new Date().toISOString(),
    };
  }

  async sendContactMessage(
    userId: string,
    phoneNumber: string,
    message: string,
    mediaUrl?: string
  ): Promise<SendResult> {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneId) {
      return {
        success: false,
        status: 'FAILED',
        timestamp: new Date().toISOString(),
        provider: this.name,
        recipient: phoneNumber,
        error: 'Kredensial Meta Cloud API belum disetel pada server.',
      };
    }

    // Sanitize phone number (must be international format without + or dashes)
    const formattedTo = phoneNumber.replace(/\D/g, '');

    try {
      const response = await fetch(
        `https://graph.facebook.com/v21.0/${phoneId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: formattedTo,
            type: 'text',
            text: { body: message },
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          status: 'FAILED',
          timestamp: new Date().toISOString(),
          provider: this.name,
          recipient: phoneNumber,
          error: data.error?.message || 'Meta Cloud API menolak permintaan pengiriman.',
        };
      }

      return {
        success: true,
        messageId: data.messages?.[0]?.id || `wamid.${Date.now()}`,
        status: 'ACCEPTED',
        timestamp: new Date().toISOString(),
        provider: this.name,
        recipient: phoneNumber,
      };
    } catch (err: any) {
      return {
        success: false,
        status: 'FAILED',
        timestamp: new Date().toISOString(),
        provider: this.name,
        recipient: phoneNumber,
        error: err.message || 'Koneksi ke server Meta gagal.',
      };
    }
  }

  async sendGroupMessage(): Promise<SendResult> {
    return {
      success: false,
      status: 'REJECTED',
      timestamp: new Date().toISOString(),
      provider: this.name,
      recipient: 'GROUP',
      error:
        'BELUM DIDUKUNG OLEH META: WhatsApp Business Cloud API resmi tidak mendukung pengiriman broadcast ke grup. Gunakan mode Gateway Session.',
    };
  }

  async sendChannelMessage(): Promise<SendResult> {
    return {
      success: false,
      status: 'REJECTED',
      timestamp: new Date().toISOString(),
      provider: this.name,
      recipient: 'CHANNEL',
      error:
        'BELUM TERSEDIA: WhatsApp Channels API belum dibuka oleh Meta untuk publikasi pesan eksternal.',
    };
  }

  async getGroups(): Promise<GroupMetadata[]> {
    return [];
  }
}
