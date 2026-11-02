import {
  WhatsAppProviderAdapter,
  WhatsAppConnectionState,
  SendResult,
  GroupMetadata,
  GroupMember,
  ProviderCapabilities,
} from './types';
import { GatewaySessionAdapter } from './GatewaySessionAdapter';
import { MetaCloudApiAdapter } from './MetaCloudApiAdapter';

class WhatsAppManagerService {
  private gatewayAdapter = new GatewaySessionAdapter();
  private cloudApiAdapter = new MetaCloudApiAdapter();
  private userProviderPreference = new Map<string, 'gateway' | 'cloud_api'>();

  getAdapter(userId: string): WhatsAppProviderAdapter {
    const preference = this.userProviderPreference.get(userId) || 'gateway';
    return preference === 'cloud_api' ? this.cloudApiAdapter : this.gatewayAdapter;
  }

  getGatewayAdapter(): GatewaySessionAdapter {
    return this.gatewayAdapter;
  }

  setProvider(userId: string, provider: 'gateway' | 'cloud_api') {
    this.userProviderPreference.set(userId, provider);
  }

  getCapabilities(userId: string): ProviderCapabilities {
    return this.getAdapter(userId).getCapabilities();
  }

  async getStatus(userId: string): Promise<WhatsAppConnectionState> {
    return this.getAdapter(userId).getStatus(userId);
  }

  async initConnection(userId: string): Promise<WhatsAppConnectionState> {
    return this.getAdapter(userId).initSession(userId);
  }

  async requestPairingCode(userId: string, phoneNumber: string): Promise<string> {
    const adapter = this.getAdapter(userId);
    if (adapter.requestPairingCode) {
      return adapter.requestPairingCode(userId, phoneNumber);
    }
    throw new Error('Provider ini tidak mendukung pairing code.');
  }

  async disconnect(userId: string): Promise<{ success: boolean; message: string }> {
    return this.getAdapter(userId).disconnect(userId);
  }

  async reconnect(userId: string): Promise<WhatsAppConnectionState> {
    if (this.gatewayAdapter) {
      return this.gatewayAdapter.reconnect(userId);
    }
    return this.initConnection(userId);
  }

  async resetSession(userId: string): Promise<{ success: boolean; message: string }> {
    return this.gatewayAdapter.resetSession(userId);
  }

  addListener(userId: string, callback: (state: WhatsAppConnectionState) => void): void {
    this.gatewayAdapter.addListener(userId, callback);
  }

  removeListener(userId: string, callback: (state: WhatsAppConnectionState) => void): void {
    this.gatewayAdapter.removeListener(userId, callback);
  }

  async sendContactMessage(
    userId: string,
    phoneNumber: string,
    message: string,
    mediaUrl?: string
  ): Promise<SendResult> {
    return this.getAdapter(userId).sendContactMessage(userId, phoneNumber, message, mediaUrl);
  }

  async sendGroupMessage(
    userId: string,
    groupId: string,
    message: string,
    mediaUrl?: string
  ): Promise<SendResult> {
    return this.getAdapter(userId).sendGroupMessage(userId, groupId, message, mediaUrl);
  }

  async sendChannelMessage(
    userId: string,
    channelId: string,
    message: string
  ): Promise<SendResult> {
    return this.getAdapter(userId).sendChannelMessage(userId, channelId, message);
  }

  async getGroups(userId: string): Promise<GroupMetadata[]> {
    return this.getAdapter(userId).getGroups(userId);
  }

  async getGroupMembers(userId: string, groupId: string): Promise<GroupMember[]> {
    const adapter = this.getAdapter(userId);
    if (adapter.getGroupMembers) {
      return adapter.getGroupMembers(userId, groupId);
    }
    return [];
  }
}

export const WhatsAppManager = new WhatsAppManagerService();
