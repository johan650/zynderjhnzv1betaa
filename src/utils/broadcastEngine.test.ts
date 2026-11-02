import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatBroadcastMessage,
  calculateBroadcastSummary,
  getTierLimits,
  isVipSubscriptionActive,
  ContactRecipient,
} from './broadcastEngine.ts';

test('formatBroadcastMessage replaces template variables correctly', () => {
  const template = 'Halo kak {nama}! Ready akun {produk}, cek info di {link} ya!';
  const formatted = formatBroadcastMessage(template, {
    nama: 'Budi JB',
    produk: 'Mobile Legends Mythic',
    link: 'https://zynder.id/p/123',
  });

  assert.equal(
    formatted,
    'Halo kak Budi JB! Ready akun Mobile Legends Mythic, cek info di https://zynder.id/p/123 ya!'
  );
});

test('calculateBroadcastSummary filters unapproved or invalid contacts and computes duration', () => {
  const mockContacts: ContactRecipient[] = [
    {
      id: '1',
      name: 'Aldi Store',
      phone: '081234567890',
      tag: 'JB Akun',
      consentApproved: true,
    },
    {
      id: '2',
      name: 'Spam Target',
      phone: '081234567891',
      tag: 'Reseller',
      consentApproved: false, // Should be skipped
    },
    {
      id: '3',
      name: 'Invalid Phone',
      phone: '123', // Invalid phone length
      tag: 'Jasa Digital',
      consentApproved: true,
    },
    {
      id: '4',
      name: 'Candra Reseller',
      phone: '085712349988',
      tag: 'Reseller',
      consentApproved: true,
    },
  ];

  const summary = calculateBroadcastSummary('Promo Spesial', mockContacts, 4);

  assert.equal(summary.total, 2);
  assert.equal(summary.skippedCount, 2);
  assert.equal(summary.estimatedDurationSeconds, 8); // 2 valid * 4s
  assert.equal(summary.validRecipients[0].name, 'Aldi Store');
  assert.equal(summary.validRecipients[1].name, 'Candra Reseller');
});

test('getTierLimits returns locked status for FREE tier and unlocked for VIP', () => {
  const freeTier = getTierLimits('FREE');
  const vipTier = getTierLimits('VIP');

  assert.equal(freeTier.isLocked, true);
  assert.equal(freeTier.groupBroadcast, false);

  assert.equal(vipTier.isLocked, false);
  assert.equal(vipTier.groupBroadcast, true);
  assert.equal(vipTier.channelBroadcast, false); // Honest provider constraint
});

test('isVipSubscriptionActive enforces expiration time against server time', () => {
  const now = 1730500000000;
  const validFuture = now + 86400000; // +1 day
  const expiredPast = now - 1000; // -1 second

  assert.equal(isVipSubscriptionActive('VIP', 'ACTIVE', validFuture, now), true);
  assert.equal(isVipSubscriptionActive('FREE', 'ACTIVE', validFuture, now), false);
  assert.equal(isVipSubscriptionActive('VIP', 'EXPIRED', validFuture, now), false);
  assert.equal(isVipSubscriptionActive('VIP', 'ACTIVE', expiredPast, now), false);
});
