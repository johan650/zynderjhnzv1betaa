import {
  AdminStats,
  PaymentTransaction,
  UserManagementRecord,
  TelegramConfigData,
  SystemSettingsData,
  AuditLogRecord,
} from '../types';

class AdminApiClient {
  private tokenKey = 'zin_admin_token';

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  setToken(token: string) {
    localStorage.setItem(this.tokenKey, token);
  }

  removeToken() {
    localStorage.removeItem(this.tokenKey);
  }

  private getHeaders(): HeadersInit {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private async handleResponse<T>(res: Response): Promise<T> {
    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Respons server tidak valid (Status ${res.status}: ${res.statusText})`);
    }

    if (!res.ok) {
      throw new Error(data.message || data.error || `Permintaan gagal dengan status ${res.status}`);
    }

    return data as T;
  }

  // --- AUTH ---
  async login(username: string, passwordPlain: string): Promise<{ token: string; admin: { username: string; role: string } }> {
    const res = await fetch('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password: passwordPlain }),
    });
    const data = await this.handleResponse<{ token: string; admin: { username: string; role: string } }>(res);
    this.setToken(data.token);
    return data;
  }

  async verifyAuth(): Promise<{ valid: boolean; admin: { username: string; role: string } }> {
    const res = await fetch('/api/admin/auth/verify', {
      headers: this.getHeaders(),
    });
    return this.handleResponse(res);
  }

  async logout(): Promise<void> {
    try {
      await fetch('/api/admin/auth/logout', {
        method: 'POST',
        headers: this.getHeaders(),
      });
    } finally {
      this.removeToken();
    }
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/admin/auth/change-password', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    return this.handleResponse(res);
  }

  // --- STATS ---
  async getStats(): Promise<AdminStats> {
    const res = await fetch('/api/admin/stats', {
      headers: this.getHeaders(),
    });
    return this.handleResponse(res);
  }

  // --- PAYMENTS ---
  async getPayments(): Promise<{ payments: PaymentTransaction[] }> {
    const res = await fetch('/api/admin/payments', {
      headers: this.getHeaders(),
    });
    return this.handleResponse(res);
  }

  async approvePayment(id: string): Promise<{ success: boolean; message: string; payment: PaymentTransaction }> {
    const res = await fetch(`/api/admin/payments/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse(res);
  }

  async rejectPayment(id: string, reason: string): Promise<{ success: boolean; message: string; payment: PaymentTransaction }> {
    const res = await fetch(`/api/admin/payments/${encodeURIComponent(id)}/reject`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ reason }),
    });
    return this.handleResponse(res);
  }

  async retryTelegram(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/admin/payments/${encodeURIComponent(id)}/retry-telegram`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse(res);
  }

  // --- USERS ---
  async getUsers(): Promise<{ users: UserManagementRecord[] }> {
    const res = await fetch('/api/admin/users', {
      headers: this.getHeaders(),
    });
    return this.handleResponse(res);
  }

  async updateUserRole(
    uid: string,
    role: 'FREE' | 'VIP' | 'VVIP',
    durationDays?: number,
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/admin/users/${encodeURIComponent(uid)}/role`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ role, durationDays, reason }),
    });
    return this.handleResponse(res);
  }

  async extendUserVip(uid: string, days: number): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/admin/users/${encodeURIComponent(uid)}/extend`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ days }),
    });
    return this.handleResponse(res);
  }

  async resetUserWaSession(uid: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/admin/users/${encodeURIComponent(uid)}/reset-wa`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse(res);
  }

  // --- TELEGRAM ---
  async getTelegramConfig(): Promise<TelegramConfigData> {
    const res = await fetch('/api/admin/telegram/config', {
      headers: this.getHeaders(),
    });
    return this.handleResponse(res);
  }

  async updateTelegramConfig(config: Partial<TelegramConfigData>): Promise<{ success: boolean; config: TelegramConfigData; message: string }> {
    const res = await fetch('/api/admin/telegram/config', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(config),
    });
    return this.handleResponse(res);
  }

  async testTelegramBot(): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/admin/telegram/test', {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse(res);
  }

  // --- SETTINGS ---
  async getSettings(): Promise<SystemSettingsData> {
    const res = await fetch('/api/admin/settings', {
      headers: this.getHeaders(),
    });
    return this.handleResponse(res);
  }

  async updateSettings(settings: Partial<SystemSettingsData>): Promise<{ success: boolean; settings: SystemSettingsData; message: string }> {
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(settings),
    });
    return this.handleResponse(res);
  }

  // --- AUDIT LOGS ---
  async getAuditLogs(): Promise<{ logs: AuditLogRecord[] }> {
    const res = await fetch('/api/admin/logs', {
      headers: this.getHeaders(),
    });
    return this.handleResponse(res);
  }
}

export const adminApi = new AdminApiClient();
