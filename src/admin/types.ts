export type AdminTab =
  | 'dashboard'
  | 'payments'
  | 'users'
  | 'telegram'
  | 'settings'
  | 'logs';

export interface AdminUser {
  username: string;
  role: 'SUPER_ADMIN';
  lastLoginAt?: string;
}

export interface PaymentProofHistoryItem {
  receiptUrl: string;
  submittedAt: string;
  senderName?: string;
  senderAccount?: string;
  notes?: string;
}

export interface PaymentTransaction {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  tier: 'VIP' | 'VVIP';
  package?: string;
  amount: number;
  currency: string;
  durationDays: number;
  method: 'QRIS_MANUAL' | 'QRIS_INSTANT' | 'BANK_TRANSFER' | 'E_WALLET';
  receiptUrl?: string;
  proofUrl?: string;
  senderName?: string;
  senderAccount?: string;
  notes?: string;
  status: 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED' | 'PENDING';
  rejectionReason?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectedBy?: string | null;
  rejectedAt?: string | null;
  submittedAt?: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  proofHistory?: PaymentProofHistoryItem[];
  telegramNotificationStatus?: 'SENT' | 'FAILED' | 'PENDING';
  telegramError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminStats {
  totalUsers: number;
  freeUsers: number;
  vipUsers: number;
  vvipUsers: number;
  pendingPaymentsCount: number;
  approvedPaymentsCount: number;
  rejectedPaymentsCount: number;
  totalTransactionsCount: number;
  totalRevenueIdr: number;
  activeSessionsCount: number;
}

export interface UserManagementRecord {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role: 'FREE' | 'VIP' | 'VVIP';
  status: 'ACTIVE' | 'EXPIRED' | 'INACTIVE';
  createdAt: string;
  vipExpiresAt?: string;
  vipActivatedAt?: string;
  remainingDays?: number;
}

export interface TelegramConfigData {
  botToken: string;
  adminChatId: string;
  isActive: boolean;
  botUsername?: string;
  lastTestedAt?: string;
  lastError?: string;
}

export interface SystemSettingsData {
  siteName: string;
  siteDescription: string;
  qrisImageUrl: string;
  qrisManualActive: boolean;
  qiospayActive: boolean;
  vipPrice: number;
  vipDurationDays: number;
  adminWorkingHours?: string;
  whatsappChannelUrl: string;
  whatsappGroupUrl: string;
  adminWhatsappUrl: string;
  adminTelegramUrl: string;
  customerServiceUrl: string;
  announcementActive: boolean;
  announcementText: string;
  announcementType: 'info' | 'warning' | 'promo';
  maintenanceMode: boolean;
  maintenanceMessage: string;
  updatedAt: string;
  updatedBy: string;
}

export interface AuditLogRecord {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  details: string;
  ip?: string;
  previousData?: any;
  newData?: any;
}
