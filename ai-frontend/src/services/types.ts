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
