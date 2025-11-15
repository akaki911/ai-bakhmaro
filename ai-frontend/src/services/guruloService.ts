import { buildApiUrl } from '@/lib/apiBase';
import { rateLimitedJsonFetch } from '@/utils/rateLimitedFetch';

export interface MailAccountConfig {
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  user: string;
  hasPassword?: boolean;
  useSecureImap?: boolean;
  useSecureSmtp?: boolean;
}

export interface MailAccountSummary {
  id: string;
  name: string;
  email: string;
  isDefault: boolean;
  config: MailAccountConfig;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface MailAccountPayload {
  name: string;
  email: string;
  isDefault?: boolean;
  config: {
    imapHost: string;
    imapPort: number;
    smtpHost: string;
    smtpPort: number;
    user: string;
    pass?: string;
    useSecureImap?: boolean;
    useSecureSmtp?: boolean;
  };
}

export interface MailSyncResponse {
  success: boolean;
  folder: string;
  accountId: string;
  messages: Array<{
    id: string;
    subject: string;
    from: string;
    to: string;
    date: string | null;
    snippet: string;
    flags: string[];
  }>;
}

export interface MailSendPayload {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{ filename: string; content: string; encoding?: string }>;
}

const jsonHeaders = { 'Content-Type': 'application/json' } as const;
const BASE_KEY = 'gurulo:mail';

const buildUrl = (path: string, params?: Record<string, string | number | undefined>) => {
  const base = buildApiUrl(path);
  if (!params) {
    return base;
  }

  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });

  const query = searchParams.toString();
  if (!query) {
    return base;
  }

  return `${base}${base.includes('?') ? '&' : '?'}${query}`;
};

export const GuruloMailService = {
  listAccounts: () =>
    rateLimitedJsonFetch<{ success: boolean; accounts: MailAccountSummary[] }>(
      buildApiUrl('/api/mail/accounts'),
      { key: `${BASE_KEY}:accounts`, method: 'GET' },
    ),

  createAccount: (payload: MailAccountPayload) =>
    rateLimitedJsonFetch<{ success: boolean; account: MailAccountSummary }>(
      buildApiUrl('/api/mail/accounts'),
      { key: `${BASE_KEY}:accounts:create`, method: 'POST', headers: jsonHeaders, body: JSON.stringify(payload) },
    ),

  updateAccount: (accountId: string, payload: Partial<MailAccountPayload>) =>
    rateLimitedJsonFetch<{ success: boolean; account: MailAccountSummary }>(
      buildApiUrl(`/api/mail/accounts/${encodeURIComponent(accountId)}`),
      {
        key: `${BASE_KEY}:accounts:update:${accountId}`,
        method: 'PUT',
        headers: jsonHeaders,
        body: JSON.stringify(payload),
      },
    ),

  deleteAccount: (accountId: string) =>
    rateLimitedJsonFetch<Response>(buildApiUrl(`/api/mail/accounts/${encodeURIComponent(accountId)}`), {
      key: `${BASE_KEY}:accounts:delete:${accountId}`,
      method: 'DELETE',
      parseJson: false,
    }),

  testConnection: (accountId: string) =>
    rateLimitedJsonFetch<{ success: boolean; result: any }>(
      buildApiUrl(`/api/mail/accounts/${encodeURIComponent(accountId)}/test`),
      { key: `${BASE_KEY}:accounts:test:${accountId}`, method: 'POST' },
    ),

  syncFolder: (folder: string, options: { accountId?: string; limit?: number } = {}) =>
    rateLimitedJsonFetch<MailSyncResponse>(
      buildUrl(`/api/mail/sync/${encodeURIComponent(folder)}`, {
        accountId: options.accountId,
        limit: options.limit,
      }),
      { key: `${BASE_KEY}:sync:${folder}:${options.accountId ?? 'default'}`, method: 'GET' },
    ),

  sendEmail: (accountId: string, email: MailSendPayload) =>
    rateLimitedJsonFetch<{ success: boolean; result: { messageId: string } }>(
      buildApiUrl('/api/mail/send'),
      {
        key: `${BASE_KEY}:send:${accountId}`,
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ accountId, email }),
      },
    ),

  moveEmail: (accountId: string, emailId: string, targetFolder: string) =>
    rateLimitedJsonFetch<{ success: boolean }>(
      buildApiUrl('/api/mail/move'),
      {
        key: `${BASE_KEY}:move:${accountId}`,
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ accountId, emailId, targetFolder }),
      },
    ),
};

export type GuruloMailServiceType = typeof GuruloMailService;
