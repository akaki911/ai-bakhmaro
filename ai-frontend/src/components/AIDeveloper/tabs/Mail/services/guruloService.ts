import { Email, CustomFolder, FilterRule, Account, MailAccountConfig, Folder, Tag } from '../types';

// --- CACHE & REAL-TIME ---
const CACHE_KEY_ACCOUNTS = 'gurulo_cache_accounts';
const CACHE_KEY_DATA = 'gurulo_cache_data';

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

// --- MOCK DATA STORE ---
interface MockData {
    emails: Email[];
    customFolders: CustomFolder[];
    tags: Tag[];
    rules: FilterRule[];
}

const initialAccounts: Account[] = [
    {
        id: 'gurulo@bakhmaro.co',
        name: 'გურულო',
        email: 'gurulo@bakhmaro.co',
        isDefault: true,
        config: {
             imapHost: 'imap.bakhmaro.co', imapPort: 993,
            smtpHost: 'smtp.bakhmaro.co', smtpPort: 465,
            user: 'gurulo@bakhmaro.co', pass: 'password',
            undoSendDelay: 7,
        },
    },
    {
        id: 'info@bakhmaro.co',
        name: 'ინფო',
        email: 'info@bakhmaro.co',
        config: {
            imapHost: 'imap.bakhmaro.co', imapPort: 993,
            smtpHost: 'smtp.bakhmaro.co', smtpPort: 465,
            user: 'info@bakhmaro.co', pass: 'password',
            undoSendDelay: 7,
        }
    }
];

const initialDataStore: { [accountId: string]: MockData } = {
    'gurulo@bakhmaro.co': {
        emails: [
            { id: '1', sender: 'GitGurulo <notifications@github.com>', recipient: 'gurulo@bakhmaro.co', subject: '[gurulo-ai-space] 18 new issues were created', body: 'გამარჯობა გურულო,\n\nთქვენს რეპოზიტორიში 18 ახალი issue დაემატა.', timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), read: false, folder: Folder.Inbox, tags: ['2'], attachments: [{ name: 'report.pdf', size: '2.1MB' }] },
            { id: '2', sender: 'Vercel <no-reply@vercel.com>', recipient: 'gurulo@bakhmaro.co', subject: 'Deployment successful: gurulo-mail', body: 'თქვენი პროექტი, gurulo-mail, წარმატებით აიტვირთა.', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), read: true, folder: Folder.Inbox, tags: ['1', '2'] },
            { id: '3', sender: 'gurulo@bakhmaro.co', recipient: 'dev.team@bakhmaro.co', subject: 'ხვალ დილით მიტინგი', body: 'გამარჯობა გუნდო,\n\nხვალ, დილის 10 საათზე, გთხოვთ შემოგვიერთდეთ.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), read: true, folder: Folder.Sent },
            { id: 'd1', sender: 'gurulo@bakhmaro.co', recipient: 'marketing@bakhmaro.co', subject: 'კვარტალური რეპორტი', body: 'გამარჯობა, ვამზადებ კვარტალურ რეპორტს და მჭირდება...', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), read: true, folder: Folder.Drafts },

        ],
        customFolders: [{ id: 'proj-bakhmaro', name: 'პროექტი: ბახმარო' }],
        tags: [
            { id: '1', name: 'მნიშვნელოვანი', color: 'red' },
            { id: '2', name: 'სამსახური', color: 'blue' },
        ],
        rules: [],
    },
    'info@bakhmaro.co': {
        emails: [{ id: 'info-1', sender: 'მომხმარებელი <user@example.com>', recipient: 'info@bakhmaro.co', subject: 'შეკითხვა პროდუქტთან დაკავშირებით', body: 'გამარჯობა, მაინტერესებს თქვენი პროდუქტის ფასები.', timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), read: false, folder: Folder.Inbox }],
        customFolders: [],
        tags: [],
        rules: [],
    }
};

let mockAccounts: Account[] = JSON.parse(localStorage.getItem(CACHE_KEY_ACCOUNTS) || 'null') || initialAccounts;
let mockDataStore: { [accountId: string]: MockData } = JSON.parse(localStorage.getItem(CACHE_KEY_DATA) || 'null') || initialDataStore;


const saveDataToCache = () => {
    localStorage.setItem(CACHE_KEY_ACCOUNTS, JSON.stringify(mockAccounts));
    localStorage.setItem(CACHE_KEY_DATA, JSON.stringify(mockDataStore));
};

const simulateDelay = (ms: number) => new Promise(res => setTimeout(res, ms));
const getAccountData = (accountId: string): MockData => {
    if (!mockDataStore[accountId]) {
        mockDataStore[accountId] = { emails: [], customFolders: [], rules: [], tags: [] };
    }
    return mockDataStore[accountId];
}
const generateId = () => Math.random().toString(36).substring(2, 10);

// --- Offline Data ---
export const loadOfflineData = () => {
    const accounts = localStorage.getItem(CACHE_KEY_ACCOUNTS);
    const data = localStorage.getItem(CACHE_KEY_DATA);
    if(accounts && data) {
        const parsedAccounts = JSON.parse(accounts);
        const parsedData = JSON.parse(data);
        const activeAccountId = parsedAccounts.find((a: Account) => a.isDefault)?.id || parsedAccounts[0]?.id;
        if (activeAccountId && parsedData[activeAccountId]) {
             return {
                accounts: parsedAccounts,
                activeAccountId,
                emails: parsedData[activeAccountId].emails,
                customFolders: parsedData[activeAccountId].customFolders,
                tags: parsedData[activeAccountId].tags,
            }
        }
    }
    return null;
}

// --- Account Management ---
export const getAccounts = async (): Promise<Account[]> => {
    await simulateDelay(200);
    return JSON.parse(JSON.stringify(mockAccounts));
};

export const addAccount = async (name: string, email: string): Promise<Account> => {
    await simulateDelay(300);
    if (mockAccounts.some(acc => acc.email === email)) throw new Error('ეს ანგარიში უკვე არსებობს.');
    const newAccount: Account = { id: email, name, email, isDefault: mockAccounts.length === 0 };
    mockAccounts = [...mockAccounts, newAccount];
    getAccountData(email);
    saveDataToCache();
    return JSON.parse(JSON.stringify(newAccount));
};

export const deleteAccount = async (accountId: string): Promise<void> => {
    await simulateDelay(300);
    const newAccounts = mockAccounts.filter(acc => acc.id !== accountId);
    delete mockDataStore[accountId];
    if (newAccounts.length > 0 && !newAccounts.some(a => a.isDefault)) {
        newAccounts[0].isDefault = true;
    }
    mockAccounts = newAccounts;
    saveDataToCache();
};

export const saveAccountConfig = async (accountId: string, config: MailAccountConfig): Promise<Account> => {
    await simulateDelay(500);
    let targetAccount: Account | undefined;
    mockAccounts = mockAccounts.map(acc => {
        if (acc.id === accountId) {
            targetAccount = { ...acc, config };
            return targetAccount;
        }
        return acc;
    });
    if (!targetAccount) throw new Error('ანგარიში ვერ მოიძებნა.');
    saveDataToCache();
    return JSON.parse(JSON.stringify(targetAccount));
};

export const testConnection = async (accountId: string): Promise<{ success: boolean; error?: string }> => {
    await simulateDelay(1000);
    const account = mockAccounts.find(acc => acc.id === accountId);
    if (!account || !account.config || !account.config.pass) return { success: false, error: 'არასრული კონფიგურაცია.' };
    return { success: true };
};

// --- Email and Folder Management (IMMUTABLE) ---
export const getEmails = async (accountId: string): Promise<Email[]> => {
    await simulateDelay(500);
    const account = mockAccounts.find(acc => acc.id === accountId);
    if (!account) throw new Error("ანგარიში ვერ მოიძებნა.");
    if (!account.config) return [];
    const data = getAccountData(accountId);
    return JSON.parse(JSON.stringify(data.emails));
};

export const updateEmail = async (accountId: string, emailId: string, updates: Partial<Email>): Promise<Email> => {
    await simulateDelay(50);
    const data = getAccountData(accountId);
    let updatedEmail: Email | undefined;
    data.emails = data.emails.map(e => {
        if (e.id === emailId) {
            updatedEmail = { ...e, ...updates };
            return updatedEmail;
        }
        return e;
    });
    if (!updatedEmail) throw new Error("წერილი ვერ მოიძებნა");
    saveDataToCache();
    return JSON.parse(JSON.stringify(updatedEmail));
}

export const updateEmails = async (accountId: string, emailIds: string[], updates: Partial<Email>): Promise<Email[]> => {
    await simulateDelay(100);
    const data = getAccountData(accountId);
    const updatedEmails: Email[] = [];
    data.emails = data.emails.map(e => {
        if (emailIds.includes(e.id)) {
            const updated = { ...e, ...updates };
            updatedEmails.push(updated);
            return updated;
        }
        return e;
    });
    saveDataToCache();
    return JSON.parse(JSON.stringify(updatedEmails));
}

export const moveEmails = async (accountId: string, emailIds: string[], targetFolderId: string): Promise<void> => {
    await simulateDelay(150);
    const data = getAccountData(accountId);
    data.emails = data.emails.map(email => 
        emailIds.includes(email.id) ? { ...email, folder: targetFolderId } : email
    );
    saveDataToCache();
};

export const sendEmail = async (accountId: string, newEmailData: Omit<Email, 'id' | 'timestamp' | 'read' | 'folder' | 'tags'>, draftId: string | null): Promise<Email> => {
    await simulateDelay(400);
    const data = getAccountData(accountId);
    const newEmail: Email = { ...newEmailData, id: generateId(), timestamp: new Date().toISOString(), read: true, folder: Folder.Sent };
    
    let emails = [...data.emails];
    if (draftId) {
        emails = emails.filter(e => e.id !== draftId);
    }
    emails.push(newEmail);
    
    if (newEmailData.recipient === accountId) {
        const receivedEmail: Email = { ...newEmail, id: generateId(), read: false, folder: Folder.Inbox };
        emails.push(receivedEmail);
    }
    data.emails = emails;
    saveDataToCache();
    return JSON.parse(JSON.stringify(newEmail));
};

export const getCustomFolders = async (accountId: string): Promise<CustomFolder[]> => {
    await simulateDelay(100);
    const data = getAccountData(accountId);
    return JSON.parse(JSON.stringify(data.customFolders));
};

export const createCustomFolder = async (accountId: string, name: string): Promise<CustomFolder> => {
    await simulateDelay(200);
    const data = getAccountData(accountId);
    if (data.customFolders.some(f => f.name.toLowerCase() === name.toLowerCase())) throw new Error('საქაღალდე ამ სახელით უკვე არსებობს.');
    const newFolder: CustomFolder = { id: `custom-${generateId()}`, name };
    data.customFolders = [...data.customFolders, newFolder];
    saveDataToCache();
    return JSON.parse(JSON.stringify(newFolder));
};

export const updateCustomFolder = async (accountId: string, folderId: string, newName: string): Promise<CustomFolder> => {
    await simulateDelay(200);
    const data = getAccountData(accountId);
    let updatedFolder: CustomFolder | undefined;
    data.customFolders = data.customFolders.map(f => {
        if (f.id === folderId) {
            updatedFolder = { ...f, name: newName };
            return updatedFolder;
        }
        return f;
    });
    if (!updatedFolder) throw new Error('საქაღალდე ვერ მოიძებნა.');
    saveDataToCache();
    return JSON.parse(JSON.stringify(updatedFolder));
};

export const deleteCustomFolder = async (accountId: string, folderId: string): Promise<Email[]> => {
    await simulateDelay(300);
    const data = getAccountData(accountId);
    const affectedEmails: Email[] = [];
    data.emails = data.emails.map(e => {
        if (e.folder === folderId) {
            const updated = { ...e, folder: Folder.Inbox };
            affectedEmails.push(updated);
            return updated;
        }
        return e;
    });
    data.customFolders = data.customFolders.filter(f => f.id !== folderId);
    data.rules = data.rules.filter(r => r.folderId !== folderId);
    saveDataToCache();
    return JSON.parse(JSON.stringify(affectedEmails));
};

export const createFilterRule = async (accountId: string, rule: FilterRule): Promise<FilterRule> => {
    await simulateDelay(100);
    const data = getAccountData(accountId);
    const newRule = { ...rule };
    data.rules = [...data.rules, newRule];
    saveDataToCache();
    return JSON.parse(JSON.stringify(newRule));
};

// --- Drafts ---
export const saveDraft = async (accountId: string, draftData: Omit<Email, 'id' | 'timestamp' | 'read' | 'folder' | 'tags'>, draftId: string | null): Promise<Email> => {
    await simulateDelay(300);
    const data = getAccountData(accountId);
    if (draftId) {
        let updatedDraft: Email | undefined;
        data.emails = data.emails.map(e => {
            if (e.id === draftId) {
                updatedDraft = { ...e, ...draftData, timestamp: new Date().toISOString() };
                return updatedDraft;
            }
            return e;
        });
        if (!updatedDraft) throw new Error("Draft not found");
        saveDataToCache();
        return JSON.parse(JSON.stringify(updatedDraft));
    } else {
        const newDraft: Email = { ...draftData, id: `draft-${generateId()}`, timestamp: new Date().toISOString(), read: true, folder: Folder.Drafts };
        data.emails = [newDraft, ...data.emails];
        saveDataToCache();
        return JSON.parse(JSON.stringify(newDraft));
    }
};

export const deleteDraft = async (accountId: string, draftId: string): Promise<void> => {
    await simulateDelay(100);
    const data = getAccountData(accountId);
    data.emails = data.emails.filter(e => e.id !== draftId);
    saveDataToCache();
};

// --- Tags ---
export const getTags = async (accountId: string): Promise<Tag[]> => {
    await simulateDelay(100);
    const data = getAccountData(accountId);
    return JSON.parse(JSON.stringify(data.tags));
};

export const createTag = async (accountId: string, name: string, color: string): Promise<Tag> => {
    await simulateDelay(200);
    const data = getAccountData(accountId);
    if (data.tags.some(t => t.name.toLowerCase() === name.toLowerCase())) {
        throw new Error('ჭდე ამ სახელით უკვე არსებობს.');
    }
    const newTag: Tag = { id: `tag-${generateId()}`, name, color };
    data.tags = [...data.tags, newTag];
    saveDataToCache();
    return JSON.parse(JSON.stringify(newTag));
};

export const updateTag = async (accountId: string, tagId: string, newName: string, newColor: string): Promise<Tag> => {
    await simulateDelay(200);
    const data = getAccountData(accountId);
    let updatedTag: Tag | undefined;
    data.tags = data.tags.map(t => {
        if (t.id === tagId) {
            updatedTag = { ...t, name: newName, color: newColor };
            return updatedTag;
        }
        return t;
    });
    if (!updatedTag) throw new Error('ჭდე ვერ მოიძებნა.');
    saveDataToCache();
    return JSON.parse(JSON.stringify(updatedTag));
};

export const deleteTag = async (accountId: string, tagId: string): Promise<void> => {
    await simulateDelay(300);
    const data = getAccountData(accountId);
    // Remove the tag itself
    data.tags = data.tags.filter(t => t.id !== tagId);
    // Remove the tag from any emails that have it
    data.emails = data.emails.map(e => {
        if (e.tags?.includes(tagId)) {
            return { ...e, tags: e.tags.filter(t => t !== tagId) };
        }
        return e;
    });
    saveDataToCache();
};


// --- REAL-TIME SIMULATION ---
setInterval(() => {
    if (mockAccounts.length > 0) {
        const defaultAccount = mockAccounts.find(a => a.isDefault) || mockAccounts[0];
        if (defaultAccount && defaultAccount.config) {
            const data = getAccountData(defaultAccount.id);
            const newRandomEmail: Email = {
                id: generateId(),
                sender: 'System Update <update@gurulo.ai>',
                recipient: defaultAccount.email,
                subject: `სისტემური განახლება #${Math.floor(Math.random() * 1000)}`,
                body: 'ეს არის ავტომატურად გენერირებული წერილი, რომელიც ახდენს რეალურ დროში განახლების სიმულაციას.',
                timestamp: new Date().toISOString(),
                read: false,
                folder: Folder.Inbox,
            };
            data.emails = [newRandomEmail, ...data.emails];
            saveDataToCache();
            notifyUpdates();
        }
    }
}, 30000);
