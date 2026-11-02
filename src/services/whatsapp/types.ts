/**
 * WhatsApp Integration Types & Provider Adapter Interfaces
 * Designed for modular swap between Meta Cloud API and Gateway Sessions.
 */

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

export interface ProviderCapabilities {
  qrPairing: boolean;
  groupBroadcast: boolean;
  channelBroadcast: boolean;
  contactBroadcast: boolean;
  mediaMessage: boolean;
  notes: string;
}

export interface WhatsAppConnectionState {
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

export interface SendResult {
  success: boolean;
  messageId?: string;
  status: 'ACCEPTED' | 'DELIVERED' | 'FAILED' | 'REJECTED';
  timestamp: string;
  provider: string;
  recipient: string;
  error?: string;
}

export interface GroupMetadata {
  id: string;
  name: string;
  memberCount: number;
  isAdmin: boolean;
  isAnnouncementOnly: boolean;
  pictureUrl?: string | null;
}

export interface GroupMember {
  id: string; // JID or user identifier
  phone: string;
  formattedPhone: string;
  role: 'admin' | 'superadmin' | 'member';
  isUserSelf: boolean;
  consentApproved: boolean;
  optedOut: boolean;
}

export interface GroupMemberBroadcastJob {
  jobId: string;
  userId: string;
  groupId: string;
  groupName: string;
  message: string;
  mediaUrl?: string;
  delaySeconds: number;
  status: 'QUEUED' | 'RUNNING' | 'PAUSED' | 'STOPPED' | 'COMPLETED' | 'FAILED';
  total: number;
  processed: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  currentRecipient?: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  logs: Array<{
    target: string;
    phone: string;
    status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
    messageId?: string;
    error?: string;
    timestamp: string;
  }>;
}

export interface WhatsAppProviderAdapter {
  id: string;
  name: string;
  getCapabilities(): ProviderCapabilities;
  initSession(userId: string): Promise<WhatsAppConnectionState>;
  disconnect(userId: string): Promise<{ success: boolean; message: string }>;
  getStatus(userId: string): Promise<WhatsAppConnectionState>;
  sendContactMessage(
    userId: string,
    phoneNumber: string,
    message: string,
    mediaUrl?: string
  ): Promise<SendResult>;
  sendGroupMessage(
    userId: string,
    groupId: string,
    message: string,
    mediaUrl?: string
  ): Promise<SendResult>;
  sendChannelMessage(
    userId: string,
    channelId: string,
    message: string
  ): Promise<SendResult>;
  getGroups(userId: string): Promise<GroupMetadata[]>;
  getGroupMembers?(userId: string, groupId: string): Promise<GroupMember[]>;
  requestPairingCode?(userId: string, phoneNumber: string): Promise<string>;
}
