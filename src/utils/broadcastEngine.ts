/**
 * ZynderJhnzV1Beta - Broadcast Engine Utilities
 * Pure helper functions for WhatsApp broadcast formatting, anti-ban calculations,
 * and recipient filtering.
 */

export interface ContactRecipient {
  id: string;
  name: string;
  phone: string;
  tag: 'JB Akun' | 'Reseller' | 'Jasa Digital' | 'Pebisnis Online';
  consentApproved: boolean;
}

export interface BroadcastPayload {
  template: string;
  recipients: ContactRecipient[];
  delaySeconds: number;
}

export interface BroadcastSummary {
  total: number;
  estimatedDurationSeconds: number;
  validRecipients: ContactRecipient[];
  skippedCount: number;
}

/**
 * Replaces dynamic variables like {nama}, {produk}, {link} in the broadcast text
 */
export function formatBroadcastMessage(
  template: string,
  variables: Record<string, string>
): string {
  let message = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{${key}\\}`, 'gi');
    message = message.replace(regex, value);
  }
  return message;
}

/**
 * Calculates anti-ban staggered delay and duration
 */
export function calculateBroadcastSummary(
  template: string,
  recipients: ContactRecipient[],
  delaySeconds: number = 3
): BroadcastSummary {
  // Only send to consent-approved recipients for WhatsApp policy compliance
  const validRecipients = recipients.filter(
    (r) => r.consentApproved && r.phone && r.phone.length >= 10
  );
  const skippedCount = recipients.length - validRecipients.length;
  const safeDelay = Math.max(delaySeconds, 2); // Minimum 2s safe interval
  const estimatedDurationSeconds = validRecipients.length * safeDelay;

  return {
    total: validRecipients.length,
    estimatedDurationSeconds,
    validRecipients,
    skippedCount,
  };
}

/**
 * Computes membership tier limits and eligibility
 */
export function getTierLimits(tier: 'Starter' | 'Pro' | 'VIP' | 'FREE' | 'VVIP') {
  switch (tier) {
    case 'FREE':
    case 'Starter':
      return {
        dailyQuota: 0,
        multiDeviceCount: 0,
        groupBroadcast: false,
        channelBroadcast: false,
        contactBroadcast: false,
        vipBadge: false,
        isLocked: true,
      };
    case 'Pro':
    case 'VIP':
      return {
        dailyQuota: 50000,
        multiDeviceCount: 3,
        groupBroadcast: true,
        channelBroadcast: false, // Honest provider constraint
        contactBroadcast: true,
        vipBadge: true,
        isLocked: false,
      };
    case 'VVIP':
      return {
        dailyQuota: 100000,
        multiDeviceCount: 10,
        groupBroadcast: true,
        channelBroadcast: false,
        contactBroadcast: true,
        vipBadge: true,
        isLocked: false,
      };
  }
}

/**
 * Verifies if user VIP subscription is currently active given server timestamp
 */
export function isVipSubscriptionActive(
  tier: string,
  status: string,
  expiresAtMs: number,
  serverTimeMs: number
): boolean {
  if (tier !== 'VIP' && tier !== 'VVIP') return false;
  if (status !== 'ACTIVE') return false;
  return expiresAtMs > serverTimeMs;
}
