import { buildApiUrl } from '../lib/apiBase';

export interface MailAccountConfig {
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  user: string;
  hasPassword?: boolean;
}

export interface MailAccount {
  id: string;
  name: string;
  email: string;
  isDefault: boolean;
  config: MailAccountConfig;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface MailAccountPayload {
  name: string;
  email: string;
  isDefault?: boolean;
  config?: {
    imapHost: string;
    imapPort: number | string;
    smtpHost: string;
    smtpPort: number | string;
    user: string;
    pass?: string;
  };
}

export interface MailMessage {
  id: string;
  from: string;
  to: string[];
  subject: string;
  date: string;
  snippet: string;
  flags: string[];
}

export interface EmailPayload {
  from?: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: any[];
}

export interface ConnectionTestResult {
  imap: { ok: boolean; error?: string };
  smtp: { ok: boolean; error?: string };
}

export interface MailServiceResponse<T = any> {
  success: boolean;
  error?: string;
  data?: T;
}

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }
  return response.json();
};

export const mailService = {
  async listAccounts(signal?: AbortSignal): Promise<MailAccount[]> {
    const url = buildApiUrl('/mail/accounts');
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      signal,
    });
    const data = await handleResponse<{ success: boolean; accounts: MailAccount[] }>(response);
    return data.accounts || [];
  },

  async createAccount(payload: MailAccountPayload, signal?: AbortSignal): Promise<MailAccount> {
    const url = buildApiUrl('/mail/accounts');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
      signal,
    });
    const data = await handleResponse<{ success: boolean; account: MailAccount }>(response);
    return data.account;
  },

  async updateAccount(accountId: string, payload: Partial<MailAccountPayload>, signal?: AbortSignal): Promise<MailAccount> {
    const url = buildApiUrl(`/mail/accounts/${accountId}`);
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
      signal,
    });
    const data = await handleResponse<{ success: boolean; account: MailAccount }>(response);
    return data.account;
  },

  async deleteAccount(accountId: string, signal?: AbortSignal): Promise<void> {
    const url = buildApiUrl(`/mail/accounts/${accountId}`);
    const response = await fetch(url, {
      method: 'DELETE',
      credentials: 'include',
      signal,
    });
    if (!response.ok && response.status !== 204) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || 'Failed to delete account');
    }
  },

  async testConnection(accountId: string, signal?: AbortSignal): Promise<ConnectionTestResult> {
    const url = buildApiUrl(`/mail/accounts/${accountId}/test`);
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      signal,
    });
    const data = await handleResponse<{ success: boolean; result: ConnectionTestResult }>(response);
    return data.result;
  },

  async fetchEmails(folder: string = 'INBOX', accountId?: string, limit: number = 20, signal?: AbortSignal): Promise<MailMessage[]> {
    const params = new URLSearchParams();
    if (accountId) params.append('accountId', accountId);
    params.append('limit', String(limit));
    
    const url = buildApiUrl(`/mail/sync/${folder}?${params.toString()}`);
    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      signal,
    });
    const data = await handleResponse<{ success: boolean; messages: MailMessage[] }>(response);
    return data.messages || [];
  },

  async sendEmail(accountId: string, email: EmailPayload, signal?: AbortSignal): Promise<any> {
    const url = buildApiUrl('/mail/send');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ accountId, email }),
      signal,
    });
    const data = await handleResponse<{ success: boolean; result: any }>(response);
    return data.result;
  },

  async moveEmail(accountId: string, emailId: string, targetFolder: string, signal?: AbortSignal): Promise<void> {
    const url = buildApiUrl('/mail/move');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ accountId, emailId, targetFolder }),
      signal,
    });
    await handleResponse(response);
  },
};
