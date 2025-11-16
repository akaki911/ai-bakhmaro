export enum Folder {
    Inbox = 'Inbox',
    Sent = 'Sent',
    Drafts = 'Drafts',
    Archived = 'Archived',
    Snoofed = 'Snoofed', // Corrected typo from previous versions if any
    Trash = 'Trash',
}

export enum View {
    Mail = 'mail',
    Settings = 'settings',
}

export interface MailAccountConfig {
    imapHost: string;
    imapPort: number;
    smtpHost: string;
    smtpPort: number;
    user: string;
    pass: string;
    undoSendDelay?: number;
}

export interface Account {
    id: string; 
    name: string;
    email: string;
    isDefault?: boolean;
    config?: MailAccountConfig;
}

export interface Tag {
    id: string;
    name: string;
    color: string;
}

export interface Email {
    id: string;
    sender: string;
    recipient: string;
    subject: string;
    body: string;
    timestamp: string;
    read: boolean;
    folder: string; 
    tags?: string[];
    snoozedUntil?: string;
    attachments?: { name: string; size: string }[];
}

export interface ComposeInitialData {
    sender: string;
    recipient: string;
    subject: string;
    body: string;
}

export interface ComposeData {
    mode: 'new' | 'reply' | 'forward';
    initialData: ComposeInitialData;
    draftId: string | null;
}

export interface CustomFolder {
    id: string;
    name: string;
}

export interface FilterRule {
    sender: string;
    folderId: string;
}