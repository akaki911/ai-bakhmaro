import { mailService } from '../../../../../services/mailService';
import type { MailAccount, MailMessage, ConnectionTestResult, EmailPayload } from '../../../../../services/mailService';
import { Email, CustomFolder, FilterRule, Account, MailAccountConfig, Folder, Tag } from '../types';

// --- Type Mapping Helpers ---
const mapBackendAccountToFrontend = (backendAccount: MailAccount): Account => ({
  id: backendAccount.id,
  name: backendAccount.name,
  email: backendAccount.email,
  isDefault: backendAccount.isDefault,
  config: backendAccount.config ? {
    imapHost: backendAccount.config.imapHost,
    imapPort: backendAccount.config.imapPort,
    smtpHost: backendAccount.config.smtpHost,
    smtpPort: backendAccount.config.smtpPort,
    user: backendAccount.config.user,
    pass: '',
  } : undefined,
});

const mapBackendMessageToEmail = (message: MailMessage, folder: string = 'INBOX'): Email => ({
  id: message.id,
  sender: message.from,
  recipient: Array.isArray(message.to) ? message.to[0] || '' : message.to,
  subject: message.subject,
  body: message.snippet || '',
  timestamp: message.date,
  read: message.flags?.some(f => f.includes('Seen') || f.includes('SEEN')) || false,
  folder,
});

// --- Real-time Update Listeners ---
let updateListeners: (() => void)[] = [];

export const subscribeToUpdates = (callback: () => void) => {
  updateListeners.push(callback);
  return () => {
    updateListeners = updateListeners.filter(cb => cb !== callback);
  };
};

const notifyUpdates = () => {
  updateListeners.forEach(cb => cb());
};

// --- Offline Data ---
export const loadOfflineData = () => {
  return null;
};

// --- Account Management (Backend API) ---
export const getAccounts = async (): Promise<Account[]> => {
  const accounts = await mailService.listAccounts();
  return accounts.map(mapBackendAccountToFrontend);
};

export const addAccount = async (name: string, email: string): Promise<Account> => {
  const account = await mailService.createAccount({ name, email, isDefault: false });
  notifyUpdates();
  return mapBackendAccountToFrontend(account);
};

export const deleteAccount = async (accountId: string): Promise<void> => {
  await mailService.deleteAccount(accountId);
  notifyUpdates();
};

export const saveAccountConfig = async (accountId: string, config: MailAccountConfig): Promise<Account> => {
  const account = await mailService.updateAccount(accountId, { config });
  notifyUpdates();
  return mapBackendAccountToFrontend(account);
};

export const testConnection = async (accountId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const result = await mailService.testConnection(accountId);
    
    if (result.imap.ok && result.smtp.ok) {
      return { success: true };
    } else {
      const errors = [];
      if (!result.imap.ok) errors.push(`IMAP: ${result.imap.error || 'connection failed'}`);
      if (!result.smtp.ok) errors.push(`SMTP: ${result.smtp.error || 'connection failed'}`);
      return { success: false, error: errors.join(', ') };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Connection test failed' };
  }
};

// --- Email Management (Backend API) ---
export const getEmails = async (accountId: string, folder: string = 'INBOX'): Promise<Email[]> => {
  const messages = await mailService.fetchEmails(folder, accountId, 50);
  return messages.map(msg => mapBackendMessageToEmail(msg, folder));
};

export const updateEmail = async (accountId: string, emailId: string, updates: Partial<Email>): Promise<Email> => {
  throw new Error('Email update not supported by backend yet');
};

export const updateEmails = async (accountId: string, emailIds: string[], updates: Partial<Email>): Promise<Email[]> => {
  throw new Error('Bulk email update not supported by backend yet');
};

export const moveEmails = async (accountId: string, emailIds: string[], targetFolderId: string): Promise<void> => {
  await Promise.all(
    emailIds.map(emailId => mailService.moveEmail(accountId, emailId, targetFolderId))
  );
  notifyUpdates();
};

export const sendEmail = async (
  accountId: string,
  newEmailData: Omit<Email, 'id' | 'timestamp' | 'read' | 'folder' | 'tags'>,
  draftId: string | null
): Promise<Email> => {
  const emailPayload: EmailPayload = {
    from: newEmailData.sender,
    to: newEmailData.recipient,
    subject: newEmailData.subject,
    text: newEmailData.body,
  };
  
  await mailService.sendEmail(accountId, emailPayload);
  
  if (draftId) {
    await deleteDraft(accountId, draftId).catch(() => {});
  }
  
  notifyUpdates();
  
  return {
    ...newEmailData,
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    read: true,
    folder: Folder.Sent,
  };
};

// --- Custom Folders (localStorage - backend support pending) ---
const CUSTOM_FOLDERS_KEY = 'gurulo_custom_folders';

export const getCustomFolders = async (accountId: string): Promise<CustomFolder[]> => {
  const stored = localStorage.getItem(`${CUSTOM_FOLDERS_KEY}_${accountId}`);
  return stored ? JSON.parse(stored) : [];
};

export const createCustomFolder = async (accountId: string, name: string): Promise<CustomFolder> => {
  const folders = await getCustomFolders(accountId);
  if (folders.some(f => f.name.toLowerCase() === name.toLowerCase())) {
    throw new Error('საქაღალდე ამ სახელით უკვე არსებობს.');
  }
  const newFolder: CustomFolder = {
    id: `custom-${Date.now()}`,
    name,
  };
  folders.push(newFolder);
  localStorage.setItem(`${CUSTOM_FOLDERS_KEY}_${accountId}`, JSON.stringify(folders));
  notifyUpdates();
  return newFolder;
};

export const updateCustomFolder = async (accountId: string, folderId: string, newName: string): Promise<CustomFolder> => {
  const folders = await getCustomFolders(accountId);
  const folder = folders.find(f => f.id === folderId);
  if (!folder) throw new Error('საქაღალდე ვერ მოიძებნა.');
  folder.name = newName;
  localStorage.setItem(`${CUSTOM_FOLDERS_KEY}_${accountId}`, JSON.stringify(folders));
  notifyUpdates();
  return folder;
};

export const deleteCustomFolder = async (accountId: string, folderId: string): Promise<Email[]> => {
  const folders = await getCustomFolders(accountId);
  const filtered = folders.filter(f => f.id !== folderId);
  localStorage.setItem(`${CUSTOM_FOLDERS_KEY}_${accountId}`, JSON.stringify(filtered));
  notifyUpdates();
  return [];
};

export const createFilterRule = async (accountId: string, rule: FilterRule): Promise<FilterRule> => {
  throw new Error('Filter rules not yet supported by backend');
};

// --- Drafts (localStorage - backend support pending) ---
const DRAFTS_KEY = 'gurulo_drafts';

export const saveDraft = async (
  accountId: string,
  draftData: Omit<Email, 'id' | 'timestamp' | 'read' | 'folder' | 'tags'>,
  draftId: string | null
): Promise<Email> => {
  const stored = localStorage.getItem(`${DRAFTS_KEY}_${accountId}`);
  let drafts: Email[] = stored ? JSON.parse(stored) : [];
  
  if (draftId) {
    drafts = drafts.map(d => 
      d.id === draftId 
        ? { ...d, ...draftData, timestamp: new Date().toISOString() }
        : d
    );
    const updated = drafts.find(d => d.id === draftId);
    if (!updated) throw new Error('Draft not found');
    localStorage.setItem(`${DRAFTS_KEY}_${accountId}`, JSON.stringify(drafts));
    notifyUpdates();
    return updated;
  } else {
    const newDraft: Email = {
      ...draftData,
      id: `draft-${Date.now()}`,
      timestamp: new Date().toISOString(),
      read: true,
      folder: Folder.Drafts,
    };
    drafts.unshift(newDraft);
    localStorage.setItem(`${DRAFTS_KEY}_${accountId}`, JSON.stringify(drafts));
    notifyUpdates();
    return newDraft;
  }
};

export const deleteDraft = async (accountId: string, draftId: string): Promise<void> => {
  const stored = localStorage.getItem(`${DRAFTS_KEY}_${accountId}`);
  let drafts: Email[] = stored ? JSON.parse(stored) : [];
  drafts = drafts.filter(d => d.id !== draftId);
  localStorage.setItem(`${DRAFTS_KEY}_${accountId}`, JSON.stringify(drafts));
  notifyUpdates();
};

// --- Tags (localStorage - backend support pending) ---
const TAGS_KEY = 'gurulo_tags';

export const getTags = async (accountId: string): Promise<Tag[]> => {
  const stored = localStorage.getItem(`${TAGS_KEY}_${accountId}`);
  return stored ? JSON.parse(stored) : [];
};

export const createTag = async (accountId: string, name: string, color: string): Promise<Tag> => {
  const tags = await getTags(accountId);
  if (tags.some(t => t.name.toLowerCase() === name.toLowerCase())) {
    throw new Error('ჭდე ამ სახელით უკვე არსებობს.');
  }
  const newTag: Tag = {
    id: `tag-${Date.now()}`,
    name,
    color,
  };
  tags.push(newTag);
  localStorage.setItem(`${TAGS_KEY}_${accountId}`, JSON.stringify(tags));
  notifyUpdates();
  return newTag;
};

export const updateTag = async (accountId: string, tagId: string, newName: string, newColor: string): Promise<Tag> => {
  const tags = await getTags(accountId);
  const tag = tags.find(t => t.id === tagId);
  if (!tag) throw new Error('ჭდე ვერ მოიძებნა.');
  tag.name = newName;
  tag.color = newColor;
  localStorage.setItem(`${TAGS_KEY}_${accountId}`, JSON.stringify(tags));
  notifyUpdates();
  return tag;
};

export const deleteTag = async (accountId: string, tagId: string): Promise<void> => {
  const tags = await getTags(accountId);
  const filtered = tags.filter(t => t.id !== tagId);
  localStorage.setItem(`${TAGS_KEY}_${accountId}`, JSON.stringify(filtered));
  notifyUpdates();
};
