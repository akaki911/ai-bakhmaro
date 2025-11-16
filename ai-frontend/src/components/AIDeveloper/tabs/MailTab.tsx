import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Email, Folder, View, CustomFolder, Account, Tag, ComposeData, MailAccountConfig } from './Mail/types';
import { mailService } from '../../../services/mailService';
import * as guruloService from './Mail/services/guruloService';
import Sidebar from './Mail/Sidebar';
import Header from './Mail/Header';
import EmailList from './Mail/EmailList';
import EmailDetail from './Mail/EmailDetail';
import ComposeModal from './Mail/ComposeModal';
import Settings from './Mail/Settings';
import { UndoIcon } from './Mail/icons/Icons';

interface ToastState {
  id: number;
  message: string;
  onUndo?: () => void;
  type?: 'success' | 'error';
}

const MailTab: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
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

  const showToast = useCallback((toastData: Omit<ToastState, 'id'>) => {
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
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
      const fetchedAccounts = await guruloService.getAccounts();
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
          guruloService.getEmails(currentActiveId),
          guruloService.getCustomFolders(currentActiveId),
          guruloService.getTags(currentActiveId)
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
      const offlineData = guruloService.loadOfflineData();
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
    const initializeSession = async () => {
      if (import.meta.env.DEV) {
        try {
          const response = await fetch('/api/mail/dev/init-session', {
            method: 'POST',
            credentials: 'include',
          });
          if (response.ok) {
            console.log('✅ [Mail Tab] Backend session initialized');
          }
        } catch (error) {
          console.warn('⚠️ [Mail Tab] Session init failed:', error);
        }
      }
      
      fetchData();
    };

    initializeSession();
    const unsubscribe = guruloService.subscribeToUpdates(() => {
      fetchData(activeAccountId ?? undefined);
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
          if (email) handleStartReply(email);
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
    const updatedEmail = await guruloService.updateEmail(activeAccountId, emailId, { read });
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
        await guruloService.createFilterRule(activeAccountId, { sender: firstEmailToMove.sender, folderId: targetFolderId });
      }
      await guruloService.moveEmails(activeAccountId, emailIds, targetFolderId);
      showToast({ message: 'წერილი(ები) გადატანილია', type: 'success' });
      setEmails(prev => prev.filter(e => !emailIds.includes(e.id)));
      if (emailIds.includes(selectedEmailId!)) setSelectedEmailId(null);
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
      const updatedEmails = await guruloService.updateEmails(activeAccountId, Array.from(selectedEmailIds), { read: false });
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
      const newFolder = await guruloService.createCustomFolder(activeAccountId, name);
      setCustomFolders(prev => [...prev, newFolder]);
      showToast({ message: 'საქაღალდე შეიქმნა', type: 'success' });
    } catch (error) {
      showToast({ message: error instanceof Error ? error.message : 'საქაღალდის შექმნა ვერ მოხერხდა', type: 'error' });
    }
  }, [activeAccountId, showToast]);
  
  const handleUpdateFolder = useCallback(async (folderId: string, newName: string) => {
    if (!activeAccountId) return;
    try {
      const updatedFolder = await guruloService.updateCustomFolder(activeAccountId, folderId, newName);
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
        const affectedEmails = await guruloService.deleteCustomFolder(activeAccountId, folderId);
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
      const newAccount = await guruloService.addAccount(name, email);
      setAccounts(prev => [...prev, newAccount]);
      handleAccountChange(newAccount.id);
      showToast({ message: 'ანგარიში დამატებულია', type: 'success' });
    } catch (error) {
      showToast({ message: error instanceof Error ? error.message : 'ანგარიშის დამატება ვერ მოხერხდა', type: 'error' });
    }
  }, [showToast]);
  
  const handleDeleteAccount = useCallback(async (accountId: string) => {
    try {
      await guruloService.deleteAccount(accountId);
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
      const updatedAccount = await guruloService.saveAccountConfig(accountId, config);
      setAccounts(prevAccounts => prevAccounts.map(acc => acc.id === accountId ? updatedAccount : acc));
      showToast({ message: 'კონფიგურაცია შენახულია!', type: 'success' });
    } catch (error) {
      showToast({ message: error instanceof Error ? error.message : 'კონფიგურაციის შენახვა ვერ მოხერხდა', type: 'error' });
    }
  }, [showToast]);

  const handleTestConnection = useCallback(async (accountId: string) => {
    try {
      const result = await guruloService.testConnection(accountId);
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
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }

    const sendAction = async () => {
      try {
        await guruloService.sendEmail(activeAccountId, newEmail, draftId);
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
      const savedDraft = await guruloService.saveDraft(activeAccountId, draftData, draftId);
      if (draftId) {
        setEmails(prev => prev.map(e => e.id === draftId ? savedDraft : e));
      } else {
        setEmails(prev => [savedDraft, ...prev]);
      }
      return savedDraft;
    } catch (error) {
      showToast({ message: error instanceof Error ? error.message : 'დრაფტის შენახვა ვერ მოხერხდა', type: 'error' });
      return null;
    }
  }, [activeAccountId, showToast]);

  const handleGenerateSummary = useCallback(async (body: string): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return `[AI შეჯამება]: ${body.substring(0, 100)}...`;
  }, []);

  const handleCreateTag = useCallback(async (name: string, color: string) => {
    if (!activeAccountId) return;
    try {
      const newTag = await guruloService.createTag(activeAccountId, name, color);
      setTags(prev => [...prev, newTag]);
      showToast({ message: 'ჭდე შეიქმნა', type: 'success' });
    } catch (error) {
      showToast({ message: error instanceof Error ? error.message : 'ჭდის შექმნა ვერ მოხერხდა', type: 'error' });
    }
  }, [activeAccountId, showToast]);

  const handleUpdateTag = useCallback(async (tagId: string, newName: string, newColor: string) => {
    if (!activeAccountId) return;
    try {
      const updatedTag = await guruloService.updateTag(activeAccountId, tagId, newName, newColor);
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
        await guruloService.deleteTag(activeAccountId, tagId);
        setTags(prev => prev.filter(t => t.id !== tagId));
        showToast({ message: `ჭდე '${tagName}' წაიშალა.` });
      } catch (error) {
        showToast({ message: error instanceof Error ? error.message : 'ჭდის წაშლა ვერ მოხერხდა', type: 'error' });
      }
    }
  }, [activeAccountId, showToast]);

  const selectedEmail = selectedEmailId ? emails.find(e => e.id === selectedEmailId) : undefined;
  const unreadCount = emails.filter(e => !e.read && e.folder === Folder.Inbox).length;

  return (
    <div className="flex h-full bg-[#050914] text-white relative overflow-hidden">
      <Sidebar
        accounts={accounts}
        activeAccount={activeAccount}
        onAccountChange={handleAccountChange}
        activeFolder={activeFolder}
        onFolderChange={handleFolderChange}
        activeView={activeView}
        onViewChange={handleViewChange}
        onCompose={handleStartCompose}
        customFolders={customFolders}
        tags={tags}
        onCreateFolder={handleCreateFolder}
        onUpdateFolder={handleUpdateFolder}
        onDeleteFolder={handleDeleteFolder}
        unreadCount={unreadCount}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {activeView === View.Mail && !selectedEmailId && (
          <>
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
            <div className="flex-1 overflow-y-auto p-6">
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
          </>
        )}

        {selectedEmailId && selectedEmail && (
          <div className="flex-1 overflow-y-auto">
            <EmailDetail
              email={selectedEmail}
              tags={tags}
              onBack={handleBackToList}
              onArchive={(id) => handleMoveEmails([id], Folder.Archived)}
              onDelete={(id) => handleMoveEmails([id], Folder.Trash)}
              onReply={handleStartReply}
              onMove={(emailId, targetFolderId) => handleMoveEmails([emailId], targetFolderId)}
              onSnooze={handleSnoozeEmail}
              onQuickReply={handleQuickReply}
              customFolders={customFolders}
              generateSummary={handleGenerateSummary}
            />
          </div>
        )}

        {activeView === View.Settings && (
          <div className="flex-1 overflow-y-auto p-6">
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
          </div>
        )}
      </div>

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
        <div className="fixed bottom-6 right-6 z-50 animate-fadeIn">
          <div className={`rounded-lg shadow-2xl p-4 min-w-[300px] max-w-md border ${
            toast.type === 'error' 
              ? 'bg-red-900/90 border-red-500/50 text-red-100' 
              : 'bg-cyan-900/90 border-cyan-500/50 text-cyan-100'
          } backdrop-blur-sm`}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium flex-1">{toast.message}</p>
              {toast.onUndo && (
                <button
                  onClick={() => {
                    toast.onUndo?.();
                    setToast(null);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors text-xs font-semibold"
                >
                  <UndoIcon className="h-3 w-3" />
                  გაუქმება
                </button>
              )}
              <button
                onClick={() => setToast(null)}
                className="text-xl leading-none opacity-70 hover:opacity-100 transition-opacity px-1"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MailTab;
