import { WhatsAppManager } from './WhatsAppManager';
import { GroupMemberBroadcastJob } from './types';

export interface StartGroupMemberDmParams {
  userId: string;
  groupId: string;
  groupName: string;
  recipients: Array<{
    id: string; // JID or user identifier
    phone: string;
    formattedPhone?: string;
    name?: string;
    consentApproved: boolean;
    optedOut?: boolean;
  }>;
  message: string;
  mediaUrl?: string;
  delaySeconds: number;
  optOutNumbers?: string[];
}

class GroupMemberBroadcastManagerService {
  private activeJobs = new Map<string, GroupMemberBroadcastJob>();
  private jobHistories = new Map<string, GroupMemberBroadcastJob[]>();
  private pauseFlags = new Map<string, boolean>();
  private abortFlags = new Map<string, boolean>();

  getStatus(userId: string): GroupMemberBroadcastJob | null {
    return this.activeJobs.get(userId) || null;
  }

  getHistory(userId: string): GroupMemberBroadcastJob[] {
    return this.jobHistories.get(userId) || [];
  }

  pauseBroadcast(userId: string): { success: boolean; message: string } {
    const job = this.activeJobs.get(userId);
    if (!job || job.status !== 'RUNNING') {
      return { success: false, message: 'Tidak ada broadcast DM anggota grup yang sedang berjalan.' };
    }
    this.pauseFlags.set(userId, true);
    job.status = 'PAUSED';
    job.updatedAt = new Date().toISOString();
    return { success: true, message: 'Broadcast berhasil dijeda (PAUSED).' };
  }

  resumeBroadcast(userId: string): { success: boolean; message: string } {
    const job = this.activeJobs.get(userId);
    if (!job || job.status !== 'PAUSED') {
      return { success: false, message: 'Broadcast tidak dalam status jeda.' };
    }
    this.pauseFlags.set(userId, false);
    job.status = 'RUNNING';
    job.updatedAt = new Date().toISOString();
    return { success: true, message: 'Broadcast dilanjutkan kembali (RESUMED).' };
  }

  stopBroadcast(userId: string): { success: boolean; message: string } {
    const job = this.activeJobs.get(userId);
    if (!job || (job.status !== 'RUNNING' && job.status !== 'PAUSED')) {
      return { success: false, message: 'Tidak ada broadcast aktif yang dapat dihentikan.' };
    }
    this.abortFlags.set(userId, true);
    this.pauseFlags.set(userId, false);
    job.status = 'STOPPED';
    job.updatedAt = new Date().toISOString();
    job.completedAt = new Date().toISOString();
    return { success: true, message: 'Broadcast berhasil dihentikan (STOPPED).' };
  }

  async startBroadcast(params: StartGroupMemberDmParams): Promise<GroupMemberBroadcastJob> {
    const { userId, groupId, groupName, recipients, message, mediaUrl, delaySeconds, optOutNumbers = [] } = params;

    // 1. WhatsApp status check
    const status = await WhatsAppManager.getStatus(userId);
    if (status.status !== 'CONNECTED') {
      throw new Error('WhatsApp belum terhubung. Silakan hubungkan WhatsApp Anda di menu WhatsApp Connection.');
    }

    // 2. Existing running job guard
    const existingJob = this.activeJobs.get(userId);
    if (existingJob && (existingJob.status === 'RUNNING' || existingJob.status === 'PAUSED')) {
      throw new Error('Sedang ada broadcast anggota grup yang masih berjalan. Silakan tunggu atau hentikan sesi sebelumnya.');
    }

    // 3. Filter strictly by consent & opt-out
    const optOutSet = new Set(optOutNumbers.map((num) => num.replace(/\D/g, '')));
    const seenJids = new Set<string>();

    const eligibleRecipients = recipients.filter((r) => {
      if (!r.consentApproved) return false;
      if (r.optedOut) return false;
      const cleanPhone = (r.phone || '').replace(/\D/g, '');
      if (cleanPhone && optOutSet.has(cleanPhone)) return false;
      const jid = r.id || r.phone;
      if (seenJids.has(jid)) return false;
      seenJids.add(jid);
      return true;
    });

    if (eligibleRecipients.length === 0) {
      throw new Error('Tidak ada anggota grup yang memenuhi syarat persetujuan (consent) dan tidak opt-out.');
    }

    const jobId = `gdm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const job: GroupMemberBroadcastJob = {
      jobId,
      userId,
      groupId,
      groupName: groupName || 'Grup WhatsApp',
      message,
      mediaUrl,
      delaySeconds: Math.max(3, delaySeconds || 5),
      status: 'RUNNING',
      total: eligibleRecipients.length,
      processed: 0,
      successCount: 0,
      failedCount: 0,
      skippedCount: recipients.length - eligibleRecipients.length,
      startedAt: nowIso,
      updatedAt: nowIso,
      logs: [],
    };

    this.activeJobs.set(userId, job);
    this.pauseFlags.set(userId, false);
    this.abortFlags.set(userId, false);

    // Launch background dispatch loop
    this.runBroadcastLoop(userId, job, eligibleRecipients).catch((err) => {
      console.error(`[GROUP DM BROADCAST ERROR] Job ${jobId} failed:`, err);
    });

    return job;
  }

  private async runBroadcastLoop(
    userId: string,
    job: GroupMemberBroadcastJob,
    recipients: StartGroupMemberDmParams['recipients']
  ) {
    console.log(`[GROUP DM BROADCAST] Starting execution of job ${job.jobId} for ${job.total} members`);

    for (let i = 0; i < recipients.length; i++) {
      // Check abort request
      if (this.abortFlags.get(userId) || job.status === 'STOPPED') {
        console.log(`[GROUP DM BROADCAST] Job ${job.jobId} stopped by user at index ${i}`);
        job.status = 'STOPPED';
        job.updatedAt = new Date().toISOString();
        job.completedAt = new Date().toISOString();
        break;
      }

      // Check pause state
      while (this.pauseFlags.get(userId) || job.status === 'PAUSED') {
        if (this.abortFlags.get(userId)) {
          job.status = 'STOPPED';
          break;
        }
        await new Promise((res) => setTimeout(res, 600));
      }

      if (job.status === 'STOPPED') break;

      const recipient = recipients[i];
      const targetIdentifier = recipient.id || recipient.phone;
      const displayName = recipient.name || recipient.formattedPhone || recipient.phone;

      job.currentRecipient = displayName;
      job.processed = i + 1;
      job.updatedAt = new Date().toISOString();

      // Replace template tokens
      const personalizedMessage = job.message
        .replace(/\{nama\}/gi, displayName)
        .replace(/\{nomor\}/gi, recipient.formattedPhone || recipient.phone)
        .replace(/\{phone\}/gi, recipient.phone)
        .replace(/\{grup\}/gi, job.groupName);

      try {
        const sendResult = await WhatsAppManager.sendContactMessage(
          userId,
          targetIdentifier,
          personalizedMessage,
          job.mediaUrl
        );

        job.successCount++;
        job.logs.unshift({
          target: displayName,
          phone: recipient.phone,
          status: 'SUCCESS',
          messageId: sendResult.messageId,
          timestamp: new Date().toLocaleTimeString('id-ID'),
        });
      } catch (err: any) {
        job.failedCount++;
        job.logs.unshift({
          target: displayName,
          phone: recipient.phone,
          status: 'FAILED',
          error: err.message || 'Gagal mengirim pesan',
          timestamp: new Date().toLocaleTimeString('id-ID'),
        });
      }

      // Staggered interval delay
      if (i < recipients.length - 1 && !this.abortFlags.get(userId)) {
        const delayMs = job.delaySeconds * 1000;
        await new Promise((res) => setTimeout(res, delayMs));
      }
    }

    if (job.status !== 'STOPPED') {
      job.status = 'COMPLETED';
      job.completedAt = new Date().toISOString();
    }

    job.currentRecipient = undefined;
    job.updatedAt = new Date().toISOString();

    // Archive to user histories
    const history = this.jobHistories.get(userId) || [];
    history.unshift({ ...job });
    if (history.length > 20) history.pop();
    this.jobHistories.set(userId, history);

    console.log(
      `[GROUP DM BROADCAST] Finished job ${job.jobId}: ${job.successCount} sent, ${job.failedCount} failed, ${job.skippedCount} skipped`
    );
  }
}

export const GroupMemberBroadcastManager = new GroupMemberBroadcastManagerService();
