import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Email, Folder, ComposeData, View, CustomFolder, Account, MailAccountConfig, Tag } from './types';
import * as apiClient from './apiClient';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import EmailList from './components/EmailList';
import EmailDetail from './components/EmailDetail';
import ComposeModal from './components/ComposeModal';
import Settings from './components/Settings';
import { GoogleGenAI } from "@google/genai";
import { UndoIcon } from './components/icons/Icons';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface ToastState {
    id: number;
    message: string;
    onUndo?: () => void;
    type?: 'success' | 'error';
}

const App: React.FC = () => {
    const [theme, setTheme] = useState<'light' | 'dark'>('light');
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
    const [emails, setEmails] = useState<Email[]>([]);
    const [customFolders, setCustomFolders] = useState<CustomFolder[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [activeFolder, setActiveFolder] = useState<string>(Folder.Inbox);
    const [activeView, setActiveView] = useState<View>(View.Mail);
    const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
    const [selectedEmailIds, setSelectedEmailIds] = useState<Set<string>>(new Set());
    const [isComposing, setIsComposing] = useState<boolean>(false);
    const [composeData, setComposeData] = useState<ComposeData | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [toast, setToast] = useState<ToastState | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const undoTimeoutRef = useRef<number | null>(null);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [focusedEmailId, setFocusedEmailId] = useState<string | null>(null);
    
    const activeAccount = accounts.find(acc => acc.id === activeAccountId);

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove(theme === 'light' ? 'dark' : 'light');
        root.classList.add(theme);
    }, [theme]);

    const showToast = useCallback((toastData: Omit<ToastState, 'id'>) => {
        if(undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
        const newToast = { id: Date.now(), ...toastData };
        setToast(newToast);

        const timeout = toastData.onUndo ? 7000 : 5000;
        undoTimeoutRef.current = window.setTimeout(() => {
           setToast(currentToast => (currentToast?.id === newToast.id ? null : currentToast));
           undoTimeoutRef.current = null;
        }, timeout);
    }, []);

    const fetchData = useCallback(async (accountIdToLoad?: string) => {
        setIsLoading(true);
        try {
            const fetchedAccounts = await apiClient.getAccounts();
            setAccounts(fetchedAccounts);

            if (fetchedAccounts.length === 0) {
                setActiveAccountId(null);
                setEmails([]);
                setCustomFolders([]);
                setTags([]);
                setActiveView(View.Settings);
                setIsLoading(false);
                return;
            }

            const currentActiveId = accountIdToLoad || activeAccountId || fetchedAccounts.find(a => a.isDefault)?.id || fetchedAccounts[0]?.id;
            
            if (currentActiveId) {
                if (currentActiveId !== activeAccountId) setActiveAccountId(currentActiveId);
                const [fetchedEmails, fetchedFolders, fetchedTags] = await Promise.all([
                    apiClient.getEmails(currentActiveId),
                    apiClient.getCustomFolders(currentActiveId),
                    apiClient.getTags(currentActiveId)
                ]);
                setEmails(fetchedEmails);
                setCustomFolders(fetchedFolders);
                setTags(fetchedTags);
            } else {
                setEmails([]);
                setCustomFolders([]);
                setTags([]);
            }
        } catch (error) {
            showToast({ message: error instanceof Error ? error.message : 'მონაცემების ჩატვირთვისას მოხდა შეცდომა.', type: 'error' });
            setIsOffline(true);
            const offlineData = apiClient.loadOfflineData();
            if (offlineData) {
                setAccounts(offlineData.accounts);
                setActiveAccountId(offlineData.activeAccountId);
                setEmails(offlineData.emails);
                setCustomFolders(offlineData.customFolders);
                setTags(offlineData.tags);
            }
        } finally {
            setIsLoading(false);
        }
    }, [activeAccountId, showToast]);

    useEffect(() => {
        fetchData();
        const unsubscribe = apiClient.subscribeToUpdates(() => {
            fetchData(activeAccountId);
        });
        
        const handleOnline = () => { setIsOffline(false); fetchData(); };
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            unsubscribe();
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    const filteredEmails = emails.filter(email => 
        email.folder === activeFolder &&
        (
            email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
            email.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
            email.body.toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

     useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            if (isComposing) {
                 if (e.key === 'Escape') setIsComposing(false);
                return;
            }
            if (selectedEmailId) {
                if (e.key === 'Escape') handleBackToList();
                if (e.key === 'r') {
                    const email = emails.find(em => em.id === selectedEmailId);
                    if(email) handleStartReply(email);
                }
                return;
            }

            switch (e.key) {
                case 'c':
                    handleStartCompose();
                    break;
                case 'j':
                    e.preventDefault();
                    if (filteredEmails.length > 0) {
                        const currentIndex = focusedEmailId ? filteredEmails.findIndex(em => em.id === focusedEmailId) : -1;
                        const nextIndex = Math.min(currentIndex + 1, filteredEmails.length - 1);
                        setFocusedEmailId(filteredEmails[nextIndex].id);
                    }
                    break;
                case 'k':
                    e.preventDefault();
                     if (filteredEmails.length > 0) {
                        const currentIndex = focusedEmailId ? filteredEmails.findIndex(em => em.id === focusedEmailId) : 0;
                        const prevIndex = Math.max(currentIndex - 1, 0);
                        setFocusedEmailId(filteredEmails[prevIndex].id);
                    }
                    break;
                case 'Enter':
                    if (focusedEmailId) handleSelectEmail(focusedEmailId);
                    break;
                case 'Escape':
                    setFocusedEmailId(null);
                    setSelectedEmailIds(new Set());
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [filteredEmails, focusedEmailId, selectedEmailId, isComposing, emails]);

    
    const handleSetEmailRead = useCallback(async (emailId: string, read: boolean) => {
        if (!activeAccountId) return;
        const updatedEmail = await apiClient.updateEmail(activeAccountId, emailId, { read });
        setEmails(prevEmails =>
            prevEmails.map(email =>
                email.id === emailId ? updatedEmail : email
            )
        );
    }, [activeAccountId]);
    
    const handleOpenDraft = useCallback((email: Email) => {
        setComposeData({
            mode: 'new',
            draftId: email.id,
            initialData: {
                sender: email.sender,
                recipient: email.recipient,
                subject: email.subject,
                body: email.body,
            },
        });
        setIsComposing(true);
        setActiveFolder(Folder.Drafts);
    }, []);

    const handleSelectEmail = useCallback((emailId: string) => {
        const email = emails.find(e => e.id === emailId);
        if (email && email.folder === Folder.Drafts) {
            handleOpenDraft(email);
            return;
        }

        setSelectedEmailId(emailId);
        if (email && !email.read) {
            handleSetEmailRead(emailId, true);
        }
    }, [emails, handleSetEmailRead, handleOpenDraft]);

    const handleBackToList = useCallback(() => {
        setSelectedEmailId(null);
    }, []);

    const toggleTheme = useCallback(() => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    }, []);
    
    const handleViewChange = useCallback((view: View) => {
        setActiveView(view);
        setSelectedEmailId(null);
    }, []);
    
    const handleAccountChange = useCallback((accountId: string) => {
        if (accountId !== activeAccountId) {
            setActiveAccountId(accountId);
            setActiveFolder(Folder.Inbox);
            setSelectedEmailId(null);
            setSelectedEmailIds(new Set());
            fetchData(accountId);
        }
    }, [activeAccountId, fetchData]);

    const handleFolderChange = useCallback((folderId: string) => {
        setActiveFolder(folderId);
        setActiveView(View.Mail);
        setSelectedEmailId(null);
        setSelectedEmailIds(new Set());
        setFocusedEmailId(null);
    }, []);
    
    const handleMoveEmails = useCallback(async (emailIds: string[], targetFolderId: string) => {
        if (!activeAccountId || emailIds.length === 0) return;

        const firstEmailToMove = emails.find(e => e.id === emailIds[0]);
        if (!firstEmailToMove) return;

        let createRule = false;
        if (emailIds.length === 1 && targetFolderId !== Folder.Archived && targetFolderId !== Folder.Trash) {
            const targetFolderName = customFolders.find(f => f.id === targetFolderId)?.name || targetFolderId;
            createRule = window.confirm(
                `შევქმნათ წესი, რომ ${firstEmailToMove.sender}-ის ყველა მომავალი წერილი ავტომატურად მოხვდეს '${targetFolderName}' საქაღალდეში?`
            );
        }
        
        try {
            if (createRule) {
                await apiClient.createFilterRule(activeAccountId, { sender: firstEmailToMove.sender, folderId: targetFolderId });
            }
            await apiClient.moveEmails(activeAccountId, emailIds, targetFolderId);
            showToast({ message: 'წერილი(ები) გადატანილია', type: 'success' });
            setEmails(prev => prev.filter(e => !emailIds.includes(e.id)));
            if(emailIds.includes(selectedEmailId!)) setSelectedEmailId(null);
            setSelectedEmailIds(new Set());
        } catch (error) {
            showToast({ message: error instanceof Error ? error.message : 'წარუმატებელი ოპერაცია', type: 'error' });
        }
    }, [activeAccountId, emails, customFolders, showToast, selectedEmailId]);

    const handleToggleSelectAll = useCallback((filteredEmailIds: string[]) => {
        setSelectedEmailIds(prevSelected => {
            if (prevSelected.size === filteredEmailIds.length) {
                return new Set();
            } else {
                return new Set(filteredEmailIds);
            }
        });
    }, []);
    
    const handleToggleSelectOne = useCallback((emailId: string) => {
        setSelectedEmailIds(prevSelected => {
            const newSelected = new Set(prevSelected);
            if (newSelected.has(emailId)) {
                newSelected.delete(emailId);
            } else {
                newSelected.add(emailId);
            }
            return newSelected;
        });
    }, []);
    
    const handleBulkMove = useCallback((targetFolderId: string) => {
        handleMoveEmails(Array.from(selectedEmailIds), targetFolderId);
    }, [selectedEmailIds, handleMoveEmails]);

    const handleBulkMarkUnread = useCallback(async () => {
        if (!activeAccountId || selectedEmailIds.size === 0) return;
        try {
            const updatedEmails = await apiClient.updateEmails(activeAccountId, Array.from(selectedEmailIds), { read: false });
            setEmails(prev => prev.map(e => updatedEmails.find(u => u.id === e.id) || e));
            setSelectedEmailIds(new Set());
            showToast({ message: 'მონიშნულია როგორც წაუკითხავი' });
        } catch (error) {
             showToast({ message: error instanceof Error ? error.message : 'ოპერაცია ვერ შესრულდა', type: 'error' });
        }
    }, [activeAccountId, selectedEmailIds, showToast]);
    
    const handleBulkAction = useCallback(async (action: 'archive' | 'delete') => {
        if (!activeAccountId || selectedEmailIds.size === 0) return;
        const targetFolder = action === 'archive' ? Folder.Archived : Folder.Trash;
        await handleMoveEmails(Array.from(selectedEmailIds), targetFolder);
        showToast({ message: `წერილი(ები) ${action === 'archive' ? 'დაარქივდა' : 'წაიშალა'}` });
    }, [activeAccountId, selectedEmailIds, handleMoveEmails, showToast]);
    
    const handleSnoozeEmail = useCallback((emailId: string, snoozeUntil: Date) => {
        console.log(`Snoozing email ${emailId} until ${snoozeUntil.toISOString()}`);
        setSelectedEmailId(null);
    }, []);

    const handleCreateFolder = useCallback(async (name: string) => {
        if (!activeAccountId) return;
        try {
            const newFolder = await apiClient.createCustomFolder(activeAccountId, name);
            setCustomFolders(prev => [...prev, newFolder]);
            showToast({ message: 'საქაღალდე შეიქმნა', type: 'success' });
        } catch (error) {
            showToast({ message: error instanceof Error ? error.message : 'საქაღალდის შექმნა ვერ მოხერხდა', type: 'error' });
        }
    }, [activeAccountId, showToast]);
    
    const handleUpdateFolder = useCallback(async (folderId: string, newName: string) => {
        if (!activeAccountId) return;
        try {
            const updatedFolder = await apiClient.updateCustomFolder(activeAccountId, folderId, newName);
            setCustomFolders(prev => prev.map(f => f.id === folderId ? updatedFolder : f));
            showToast({ message: 'საქაღალდე განახლდა', type: 'success' });
        } catch (error) {
            showToast({ message: error instanceof Error ? error.message : 'საქაღალდის განახლება ვერ მოხერხდა', type: 'error' });
        }
    }, [activeAccountId, showToast]);

    const handleDeleteFolder = useCallback(async (folderId: string, folderName: string) => {
        if (!activeAccountId) return;
        if (window.confirm(`დარწმუნებული ხართ, რომ გსურთ '${folderName}' საქაღალდის წაშლა?`)) {
            try {
                const affectedEmails = await apiClient.deleteCustomFolder(activeAccountId, folderId);
                setCustomFolders(prev => prev.filter(f => f.id !== folderId));
                setEmails(prev => prev.map(e => affectedEmails.find(ae => ae.id === e.id) || e));
                if (activeFolder === folderId) {
                    setActiveFolder(Folder.Inbox);
                }
                showToast({ message: `საქაღალდე '${folderName}' წაიშალა.` });
            } catch (error) {
                showToast({ message: error instanceof Error ? error.message : 'საქაღალდის წაშლა ვერ მოხერხდა', type: 'error' });
            }
        }
    }, [activeAccountId, activeFolder, showToast]);
    
    const handleAddAccount = useCallback(async (name: string, email: string) => {
        try {
            const newAccount = await apiClient.addAccount(name, email);
            setAccounts(prev => [...prev, newAccount]);
            handleAccountChange(newAccount.id);
            showToast({ message: 'ანგარიში დამატებულია', type: 'success' });
        } catch (error) {
            showToast({ message: error instanceof Error ? error.message : 'ანგარიშის დამატება ვერ მოხერხდა', type: 'error' });
        }
    }, [handleAccountChange, showToast]);
    
    const handleDeleteAccount = useCallback(async (accountId: string) => {
        try {
            await apiClient.deleteAccount(accountId);
            showToast({ message: 'ანგარიში წაიშალა' });
            const newAccounts = accounts.filter(acc => acc.id !== accountId);
            setAccounts(newAccounts);
            if (activeAccountId === accountId) {
                 const nextAccountId = newAccounts.find(a => a.isDefault)?.id || newAccounts[0]?.id || null;
                 setActiveAccountId(nextAccountId);
                 if (nextAccountId) {
                    fetchData(nextAccountId);
                 } else {
                    fetchData();
                 }
            }
        } catch (error) {
            showToast({ message: error instanceof Error ? error.message : 'ანგარიშის წაშლა ვერ მოხერხდა', type: 'error' });
        }
    }, [accounts, activeAccountId, fetchData, showToast]);
    
    const handleSaveAccountConfig = useCallback(async (accountId: string, config: MailAccountConfig) => {
        try {
            const updatedAccount = await apiClient.saveAccountConfig(accountId, config);
            setAccounts(prevAccounts => prevAccounts.map(acc => acc.id === accountId ? updatedAccount : acc));
            showToast({ message: 'კონფიგურაცია შენახულია!', type: 'success' });
        } catch (error) {
            showToast({ message: error instanceof Error ? error.message : 'კონფიგურაციის შენახვა ვერ მოხერხდა', type: 'error' });
        }
    }, [showToast]);

    const handleTestConnection = useCallback(async (accountId: string) => {
        try {
            const result = await apiClient.testConnection(accountId);
            if (result.success) {
                showToast({ message: 'კავშირი წარმატებით დამყარდა!', type: 'success' });
            } else {
                showToast({ message: `კავშირის შეცდომა: ${result.error}`, type: 'error' });
            }
        } catch (error) {
             showToast({ message: error instanceof Error ? error.message : 'კავშირის შემოწმება ვერ მოხერხდა', type: 'error' });
        }
    }, [showToast]);

    const handleStartCompose = useCallback(() => {
        if (!activeAccount) return;
        setComposeData({ 
            mode: 'new',
            draftId: null,
            initialData: { 
                sender: activeAccount.email, 
                recipient: '', 
                subject: '', 
                body: '' 
            } 
        });
        setIsComposing(true);
    }, [activeAccount]);
    
    const handleStartReply = useCallback((email: Email) => {
        if (!activeAccount) return;
        setComposeData({
            mode: 'reply',
            draftId: null,
            initialData: {
                sender: activeAccount.email,
                recipient: email.sender,
                subject: `Re: ${email.subject}`,
                body: `\n\n--- თავდაპირველი წერილი ---\n${email.body}`,
            },
        });
        setIsComposing(true);
    }, [activeAccount]);

    const sendEmailWithUndo = useCallback(async (newEmail: Omit<Email, 'id' | 'timestamp' | 'read' | 'folder' | 'tags'>, draftId: string | null, onUndoSuccess: () => void) => {
        if (!activeAccountId || !activeAccount) return;
        if(undoTimeoutRef.current) {
            clearTimeout(undoTimeoutRef.current);
            undoTimeoutRef.current = null;
        }

        const sendAction = async () => {
            try {
                await apiClient.sendEmail(activeAccountId, newEmail, draftId);
                showToast({ message: 'წერილი გაგზავნილია', type: 'success' });
                fetchData(activeAccountId);
                setActiveFolder(Folder.Sent);
                setActiveView(View.Mail);
            } catch (error) {
                showToast({ message: error instanceof Error ? error.message : 'წერილის გაგზავნა ვერ მოხერხდა', type: 'error' });
            }
        };

        const undoDelay = (activeAccount.config?.undoSendDelay || 7) * 1000;
        const timeoutId = window.setTimeout(sendAction, undoDelay);
        
        const handleUndo = () => {
            clearTimeout(timeoutId);
            setToast(null);
            onUndoSuccess();
        };
        
        showToast({ message: 'წერილი იგზავნება...', onUndo: handleUndo });
    }, [activeAccountId, activeAccount, fetchData, showToast]);

    const handleSendEmail = useCallback((data: Omit<Email, 'id' | 'timestamp' | 'read' | 'folder' | 'tags'>, draftId: string | null) => {
        setIsComposing(false);
        sendEmailWithUndo(data, draftId, () => {
            setIsComposing(true);
        });
    }, [sendEmailWithUndo]);

    const handleQuickReply = useCallback((newEmail: Omit<Email, 'id' | 'timestamp' | 'read' | 'folder' | 'tags'>) => {
        sendEmailWithUndo(newEmail, null, () => {
            showToast({ message: 'გაგზავნა გაუქმდა.' });
        });
    }, [sendEmailWithUndo, showToast]);

    const handleSaveDraft = useCallback(async (draftData: Omit<Email, 'id' | 'timestamp' | 'read' | 'folder' | 'tags'>, draftId: string | null) => {
        if (!activeAccountId) return null;
        try {
            const savedDraft = await apiClient.saveDraft(activeAccountId, draftData, draftId);
            if(draftId) {
                setEmails(prev => prev.map(e => e.id === draftId ? savedDraft : e));
            } else {
                setEmails(prev => [savedDraft, ...prev]);
            }
            return savedDraft;
        } catch (error) {
            console.error("Failed to save draft", error);
            showToast({ message: 'დრაფტის შენახვა ვერ მოხერხდა', type: 'error' });
            return null;
        }
    }, [activeAccountId, showToast]);
    
    const handleCreateTag = useCallback(async (name: string, color: string) => {
        if (!activeAccountId) return;
        try {
            const newTag = await apiClient.createTag(activeAccountId, name, color);
            setTags(prev => [...prev, newTag]);
            showToast({ message: 'ჭდე შეიქმნა', type: 'success' });
        } catch (error) {
            showToast({ message: error instanceof Error ? error.message : 'ჭდის შექმნა ვერ მოხერხდა', type: 'error' });
        }
    }, [activeAccountId, showToast]);

    const handleUpdateTag = useCallback(async (tagId: string, newName: string, newColor: string) => {
        if (!activeAccountId) return;
        try {
            const updatedTag = await apiClient.updateTag(activeAccountId, tagId, newName, newColor);
            setTags(prev => prev.map(t => t.id === tagId ? updatedTag : t));
            showToast({ message: 'ჭდე განახლდა', type: 'success' });
        } catch (error) {
            showToast({ message: error instanceof Error ? error.message : 'ჭდის განახლება ვერ მოხერხდა', type: 'error' });
        }
    }, [activeAccountId, showToast]);

    const handleDeleteTag = useCallback(async (tagId: string, tagName: string) => {
        if (!activeAccountId) return;
        if (window.confirm(`დარწმუნებული ხართ, რომ გსურთ '${tagName}' ჭდის წაშლა?`)) {
            try {
                await apiClient.deleteTag(activeAccountId, tagId);
                setTags(prev => prev.filter(t => t.id !== tagId));
                showToast({ message: `ჭდე '${tagName}' წაიშალა.` });
            } catch (error) {
                showToast({ message: error instanceof Error ? error.message : 'ჭდის წაშლა ვერ მოხერხდა', type: 'error' });
            }
        }
    }, [activeAccountId, showToast]);

    const generateSummary = useCallback(async (body: string): Promise<string> => {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `შემდეგი ელ.წერილი შეაჯამე ერთი ან ორი წინადადებით ქართულად:\n\n---\n${body}`
            });
            return response.text;
        } catch (error) {
            console.error("Error generating summary:", error);
            const errorMessage = error instanceof Error ? error.message : "უცნობი შეცდომა";
            showToast({ message: `AI შეჯამებისას მოხდა შეცდომა: ${errorMessage}`, type: 'error' });
            return "AI შეჯამებისას მოხდა შეცდომა.";
        }
    }, [showToast]);

    const selectedEmail = emails.find(email => email.id === selectedEmailId);
    
    const unreadCount = emails.filter(e => e.folder === Folder.Inbox && !e.read).length;

    return (
        <div className="flex h-screen font-sans bg-gray-100 dark:bg-gray-850 text-gray-900 dark:text-gray-100 overflow-hidden">
            <Sidebar 
                activeFolder={activeFolder} 
                activeView={activeView}
                customFolders={customFolders}
                tags={tags}
                accounts={accounts}
                activeAccount={activeAccount}
                onAccountChange={handleAccountChange}
                onFolderChange={handleFolderChange} 
                onViewChange={handleViewChange}
                onCompose={handleStartCompose}
                onCreateFolder={handleCreateFolder}
                onUpdateFolder={handleUpdateFolder}
                onDeleteFolder={handleDeleteFolder}
                unreadCount={unreadCount}
            />
            <main className="flex-1 flex flex-col min-w-0">
                {activeView === View.Mail && (
                    <Header 
                        theme={theme} 
                        toggleTheme={toggleTheme} 
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        selectedCount={selectedEmailIds.size}
                        onBulkArchive={() => handleBulkAction('archive')}
                        onBulkDelete={() => handleBulkAction('delete')}
                        onBulkMarkUnread={handleBulkMarkUnread}
                        onBulkMove={handleBulkMove}
                        onClearSelection={() => setSelectedEmailIds(new Set())}
                        customFolders={customFolders}
                        isOffline={isOffline}
                    />
                )}
                <div className={`flex-1 overflow-y-auto p-4 md:p-6`}>
                   <div className="h-full relative overflow-hidden">
                       {activeView === View.Mail ? (
                            <div className="relative h-full">
                                 <div className={`transition-transform duration-300 ease-in-out w-full h-full absolute inset-0 ${selectedEmailId ? '-translate-x-full' : 'translate-x-0'}`}>
                                    <EmailList 
                                        emails={filteredEmails} 
                                        onSelectEmail={handleSelectEmail} 
                                        isLoading={isLoading}
                                        selectedEmailIds={selectedEmailIds}
                                        onToggleSelectAll={handleToggleSelectAll}
                                        onToggleSelectOne={handleToggleSelectOne}
                                        accountConfigured={!!activeAccount?.config}
                                        focusedEmailId={focusedEmailId}
                                    />
                                 </div>
                                {selectedEmail && (
                                    <div className={`transition-transform duration-300 ease-in-out w-full h-full absolute inset-0 ${selectedEmailId ? 'translate-x-0' : 'translate-x-full'}`}>
                                        <EmailDetail 
                                            key={selectedEmail.id}
                                            email={selectedEmail} 
                                            tags={tags}
                                            onBack={handleBackToList}
                                            onArchive={() => handleMoveEmails([selectedEmail.id], Folder.Archived)}
                                            onDelete={() => handleMoveEmails([selectedEmail.id], Folder.Trash)}
                                            onReply={handleStartReply}
                                            onMove={(emailId, folderId) => handleMoveEmails([emailId], folderId)}
                                            onSnooze={handleSnoozeEmail}
                                            onQuickReply={handleQuickReply}
                                            customFolders={customFolders}
                                            generateSummary={generateSummary}
                                        />
                                    </div>
                                )}
                            </div>
                        ) : (
                           <Settings 
                             theme={theme} 
                             setTheme={setTheme}
                             accounts={accounts}
                             activeAccountId={activeAccountId}
                             tags={tags}
                             onAddAccount={handleAddAccount}
                             onDeleteAccount={handleDeleteAccount}
                             onSaveConfig={handleSaveAccountConfig}
                             onTestConnection={handleTestConnection}
                             onAddTag={handleCreateTag}
                             onUpdateTag={handleUpdateTag}
                             onDeleteTag={handleDeleteTag}
                           />
                        )}
                   </div>
                </div>
            </main>
            {isComposing && composeData && (
                <ComposeModal
                    isOpen={isComposing}
                    onClose={() => setIsComposing(false)}
                    onSend={handleSendEmail}
                    onSaveDraft={handleSaveDraft}
                    mode={composeData.mode}
                    draftId={composeData.draftId}
                    initialData={composeData.initialData}
                />
            )}
             {toast && (
                <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 text-white py-3 px-5 rounded-lg shadow-2xl flex items-center justify-between animate-fadeIn z-50 ${toast.type === 'error' ? 'bg-red-600' : 'bg-gray-900 dark:bg-gray-700'}`}>
                    <p className="mr-4">{toast.message}</p>
                    {toast.onUndo && (
                        <button onClick={toast.onUndo} className="flex items-center text-sm font-semibold text-indigo-400 hover:text-indigo-300">
                           <UndoIcon className="h-4 w-4 mr-1" />
                           გაუქმება
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default App;