import { buildApiUrl } from '@/lib/apiBase';
import { envFeatureFlag } from '@/lib/featureFlags';
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

export interface OfflineMailData {
  accounts: MailAccountSummary[];
  activeAccountId: string | null;
  emails: any[];
  customFolders: any[];
  tags: any[];
}

const jsonHeaders = { 'Content-Type': 'application/json' } as const;
const BASE_KEY = 'gurulo:mail';
const USE_MAIL_PROTOTYPE = envFeatureFlag('VITE_MAIL_PROTOTYPE', true);

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

const HttpMailService = {
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

  loadOfflineData: (): OfflineMailData | null => null,
};

type MailboxByFolder = Record<string, MailSyncResponse>;

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const demoAccounts: MailAccountSummary[] = [
  {
    id: 'demo-primary',
    name: 'Primary Inbox',
    email: 'user.primary@example.com',
    isDefault: true,
    config: {
      imapHost: 'demo-imap.local',
      imapPort: 993,
      smtpHost: 'demo-smtp.local',
      smtpPort: 587,
      user: 'user.primary',
      hasPassword: false,
      useSecureImap: true,
      useSecureSmtp: true,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-team',
    name: 'Team Inbox',
    email: 'team@example.com',
    isDefault: false,
    config: {
      imapHost: 'demo-imap.local',
      imapPort: 993,
      smtpHost: 'demo-smtp.local',
      smtpPort: 587,
      user: 'team',
      hasPassword: false,
      useSecureImap: true,
      useSecureSmtp: true,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const seededMailbox: MailboxByFolder = {
  Inbox: {
    success: true,
    folder: 'Inbox',
    accountId: 'demo-primary',
    messages: [
      {
        id: 'demo-msg-1',
        subject: 'გურულო Prototype Inbox-ში მოგესალმებით',
        from: 'welcome@gurulo.ai',
        to: 'user.primary@example.com',
        date: new Date().toISOString(),
        snippet: 'ეს არის სიმულირებული შეტყობინება ინ-მემორი ინბოქსიდან.',
        flags: ['Seen'],
      },
      {
        id: 'demo-msg-2',
        subject: 'ფუნქციონალი: სინქრონიზაცია და გასაგზავნი',
        from: 'product@gurulo.ai',
        to: 'user.primary@example.com',
        date: new Date(Date.now() - 3600 * 1000).toISOString(),
        snippet: 'Folder sync აბრუნებს MailSyncResponse-ს rateLimitedJsonFetch-ის გარეშე.',
        flags: [],
      },
      {
        id: 'demo-msg-3',
        subject: 'ინბოქსის თესლი დემო რეჟიმისთვის',
        from: 'demo@gurulo.ai',
        to: 'user.primary@example.com',
        date: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        snippet: 'ეს მონაცემები ინახება მხოლოდ მეხსიერებაში და არ ტოვებს ბრაუზერს.',
        flags: ['Flagged'],
      },
    ],
  },
  Sent: {
    success: true,
    folder: 'Sent',
    accountId: 'demo-primary',
    messages: [
      {
        id: 'demo-sent-1',
        subject: 'გამოგზავნილი შეტყობინება (დემო)',
        from: 'user.primary@example.com',
        to: 'teammate@example.com',
        date: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
        snippet: 'სწრაფი ტექსტური შინაარსი სალამად.',
        flags: ['Seen'],
      },
    ],
  },
};

const getFolderKey = (folder: string) => folder.trim() || 'Inbox';

const findAccountEmail = (accountId: string) =>
  demoAccounts.find((account) => account.id === accountId)?.email ?? accountId;

const getPrototypeSyncResponse = (folder: string, accountId?: string): MailSyncResponse => {
  const key = getFolderKey(folder);
  const fallback = seededMailbox.Inbox;
  const snapshot = seededMailbox[key] ?? fallback;

  return deepClone({
    ...snapshot,
    folder: folder || snapshot.folder,
    accountId: accountId ?? snapshot.accountId,
  });
};

const PrototypeMailService: typeof HttpMailService = {
  listAccounts: async () => ({ success: true, accounts: deepClone(demoAccounts) }),

  createAccount: async (payload: MailAccountPayload) => {
    const newAccount: MailAccountSummary = {
      id: `demo-${Date.now()}`,
      name: payload.name,
      email: payload.email,
      isDefault: Boolean(payload.isDefault),
      config: {
        ...payload.config,
        hasPassword: Boolean(payload.config.pass),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    demoAccounts.push(newAccount);
    return { success: true, account: deepClone(newAccount) };
  },

  updateAccount: async (accountId: string, payload: Partial<MailAccountPayload>) => {
    const index = demoAccounts.findIndex((account) => account.id === accountId);
    if (index === -1) {
      throw new Error('Account not found');
    }

    const existing = demoAccounts[index];
    const updated: MailAccountSummary = {
      ...existing,
      ...payload,
      config: {
        ...existing.config,
        ...(payload.config ?? {}),
        hasPassword: payload.config?.pass ? true : existing.config.hasPassword,
      },
      updatedAt: new Date().toISOString(),
    };

    demoAccounts.splice(index, 1, updated);
    return { success: true, account: deepClone(updated) };
  },

  deleteAccount: async (accountId: string) => {
    const index = demoAccounts.findIndex((account) => account.id === accountId);
    if (index !== -1) {
      demoAccounts.splice(index, 1);
    }

    return new Response(null, { status: 204 });
  },

  testConnection: async () => ({ success: true, result: { message: 'Prototype connection successful' } }),

  syncFolder: async (folder: string, options: { accountId?: string; limit?: number } = {}) => {
    const snapshot = getPrototypeSyncResponse(folder, options.accountId);
    const limitedMessages = options.limit ? snapshot.messages.slice(0, options.limit) : snapshot.messages;

    return {
      ...snapshot,
      messages: limitedMessages,
    };
  },

  sendEmail: async (accountId: string, email: MailSendPayload) => {
    const sentFolder = getPrototypeSyncResponse('Sent', accountId);
    const fromEmail = findAccountEmail(accountId);
    const newMessage = {
      id: `demo-sent-${Date.now()}`,
      subject: email.subject,
      from: fromEmail,
      to: Array.isArray(email.to) ? email.to.join(', ') : email.to,
      date: new Date().toISOString(),
      snippet: email.text || email.html || 'Sent from prototype inbox',
      flags: ['Seen'],
    };

    sentFolder.messages = [newMessage, ...sentFolder.messages];
    seededMailbox.Sent = sentFolder;

    return { success: true, result: { messageId: newMessage.id } };
  },

  moveEmail: async (_accountId: string, emailId: string, targetFolder: string) => {
    const sourceFolders = Object.keys(seededMailbox);
    for (const folder of sourceFolders) {
      const mailbox = seededMailbox[folder];
      const index = mailbox.messages.findIndex((msg) => msg.id === emailId);
      if (index !== -1) {
        const [message] = mailbox.messages.splice(index, 1);
        const destination = getPrototypeSyncResponse(targetFolder, mailbox.accountId);
        destination.messages.unshift(message);
        seededMailbox[getFolderKey(targetFolder)] = destination;
        break;
      }
    }

    return { success: true };
  },

  loadOfflineData: (): OfflineMailData | null => null,
};

export const GuruloMailService = USE_MAIL_PROTOTYPE ? PrototypeMailService : HttpMailService;

export type GuruloMailServiceType = typeof GuruloMailService;

export async function getAccounts(): Promise<MailAccountSummary[]> {
  const response = await GuruloMailService.listAccounts();
  return response.accounts;
}

export async function getEmails(accountId: string): Promise<any[]> {
  const response = await GuruloMailService.syncFolder('Inbox', { accountId });
  return response.messages.map((msg: any) => ({
    id: msg.id,
    sender: msg.from,
    recipient: msg.to,
    subject: msg.subject,
    body: msg.snippet,
    timestamp: msg.date,
    read: msg.flags.includes('Seen'),
    folder: 'Inbox',
  }));
}

export async function getCustomFolders(_accountId: string): Promise<any[]> {
  return [];
}

export async function getTags(_accountId: string): Promise<any[]> {
  return [];
}

export function subscribeToUpdates(_callback: () => void): () => void {
  return () => {};
}

export async function moveEmails(accountId: string, emailIds: string[], targetFolder: string): Promise<void> {
  for (const emailId of emailIds) {
    await GuruloMailService.moveEmail(accountId, emailId, targetFolder);
  }
}

export async function sendEmail(accountId: string, email: any, _draftId?: string | null): Promise<void> {
  await GuruloMailService.sendEmail(accountId, {
    to: email.to,
    cc: email.cc,
    bcc: email.bcc,
    subject: email.subject,
    text: email.body,
    html: email.htmlBody,
  });
}

export async function updateEmail(_accountId: string, _emailId: string, _updates: any): Promise<void> {
  console.warn('updateEmail not yet implemented');
}

export async function updateEmails(_accountId: string, _emailIds: string[], _updates: any): Promise<void> {
  console.warn('updateEmails not yet implemented');
}
