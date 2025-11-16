import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  Inbox,
  Send,
  Settings,
  Plus,
  RefreshCw,
  Trash2,
  Edit,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { mailService, type MailAccount, type MailMessage } from '../../../services/mailService';
import { MailAccountForm } from './Mail/MailAccountForm';
import { MailComposer } from './Mail/MailComposer';

type MailView = 'overview' | 'inbox' | 'compose' | 'accounts';

interface MailTabProps {
  className?: string;
}

export const MailTab: React.FC<MailTabProps> = ({ className = '' }) => {
  const [currentView, setCurrentView] = useState<MailView>('overview');
  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<MailAccount | null>(null);
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<MailAccount | null>(null);
  const [showComposer, setShowComposer] = useState(false);

  const loadAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedAccounts = await mailService.listAccounts();
      setAccounts(fetchedAccounts);
      
      if (fetchedAccounts.length > 0 && !selectedAccount) {
        const defaultAccount = fetchedAccounts.find(a => a.isDefault) || fetchedAccounts[0];
        setSelectedAccount(defaultAccount);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load accounts');
      console.error('Failed to load accounts:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedAccount]);

  const loadInbox = useCallback(async () => {
    if (!selectedAccount) return;
    
    try {
      setRefreshing(true);
      setError(null);
      const fetchedMessages = await mailService.fetchEmails('INBOX', selectedAccount.id);
      setMessages(fetchedMessages);
    } catch (err: any) {
      setError(err.message || 'Failed to load inbox');
      console.error('Failed to load inbox:', err);
    } finally {
      setRefreshing(false);
    }
  }, [selectedAccount]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/5 bg-white/5 p-6 shadow-xl shadow-cyan-500/5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">სტატუსი</p>
            <h2 className="text-lg font-semibold text-white">
              {accounts.length > 0 ? 'მაილის სისტემა კონფიგურირებულია' : 'მაილის სისტემა მზადაა'}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {accounts.length > 0
                ? `${accounts.length} ანგარიში კონფიგურირებულია და მზადაა გამოსაყენებლად`
                : 'დაამატეთ თქვენი პირველი მაილის ანგარიში დასაწყებად'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentView('accounts')}
              className="flex items-center gap-2 rounded-full bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/20"
            >
              <Settings className="h-4 w-4" />
              ანგარიშები
            </button>
            {accounts.length > 0 && (
              <button
                onClick={() => setCurrentView('inbox')}
                className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
              >
                <Inbox className="h-4 w-4" />
                Inbox
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/5 bg-white/5 p-5 shadow-lg shadow-cyan-500/5">
          <div className="flex items-center justify-between pb-3">
            <Mail className="h-5 w-5 text-cyan-400" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">
              ანგარიშები
            </span>
          </div>
          <p className="text-2xl font-bold text-white">{accounts.length}</p>
          <p className="mt-1 text-xs text-slate-400">კონფიგურირებული მაილის ანგარიშები</p>
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/5 p-5 shadow-lg shadow-cyan-500/5">
          <div className="flex items-center justify-between pb-3">
            <Inbox className="h-5 w-5 text-cyan-400" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">
              შეტყობინებები
            </span>
          </div>
          <p className="text-2xl font-bold text-white">{messages.length}</p>
          <p className="mt-1 text-xs text-slate-400">სულ ჩატვირთული შეტყობინებები</p>
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/5 p-5 shadow-lg shadow-cyan-500/5">
          <div className="flex items-center justify-between pb-3">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">
              სტატუსი
            </span>
          </div>
          <p className="text-2xl font-bold text-white">
            {accounts.some(a => a.isDefault) ? 'მზადაა' : 'მოითხოვს კონფიგურაციას'}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {accounts.some(a => a.isDefault) ? 'ნაგულისხმევი ანგარიში დაყენებულია' : 'ანგარიში არ არის დაყენებული'}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-white/5 p-6 shadow-xl shadow-cyan-500/5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200/80">
          სწრაფი მოქმედებები
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={() => setCurrentView('accounts')}
            className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/20 p-4 text-left transition hover:border-cyan-500/30 hover:bg-cyan-500/5"
          >
            <Plus className="h-5 w-5 text-cyan-400" />
            <div>
              <p className="font-medium text-white">დაამატეთ მაილის ანგარიში</p>
              <p className="text-xs text-slate-400">კონფიგურაცია ახალი IMAP/SMTP ანგარიშისთვის</p>
            </div>
          </button>
          <button
            onClick={() => {
              if (accounts.length > 0) setCurrentView('compose');
            }}
            disabled={accounts.length === 0}
            className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/20 p-4 text-left transition hover:border-cyan-500/30 hover:bg-cyan-500/5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-5 w-5 text-cyan-400" />
            <div>
              <p className="font-medium text-white">გაგზავნეთ ახალი მაილი</p>
              <p className="text-xs text-slate-400">შექმენით და გაგზავნეთ ახალი შეტყობინება</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  const renderInbox = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Inbox</h2>
          <p className="text-sm text-slate-400">
            {selectedAccount ? selectedAccount.email : 'არცერთი ანგარიში არჩეული არ არის'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadInbox}
            disabled={refreshing || !selectedAccount}
            className="flex items-center gap-2 rounded-full bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/20 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            განახლება
          </button>
          <button
            onClick={() => setCurrentView('compose')}
            disabled={!selectedAccount}
            className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            დაწერეთ
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-200">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {selectedAccount && messages.length === 0 && !refreshing && (
        <div className="rounded-2xl border border-white/5 bg-white/5 p-12 text-center">
          <Inbox className="mx-auto h-12 w-12 text-slate-400" />
          <p className="mt-4 text-sm text-slate-400">არცერთი შეტყობინება არ არის</p>
          <button
            onClick={loadInbox}
            className="mt-4 text-sm font-medium text-cyan-400 hover:text-cyan-300"
          >
            ჩატვირთეთ შეტყობინებები
          </button>
        </div>
      )}

      {refreshing && messages.length === 0 && (
        <div className="flex items-center justify-center rounded-2xl border border-white/5 bg-white/5 p-12">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        </div>
      )}

      {messages.length > 0 && (
        <div className="space-y-2">
          {messages.map((message) => (
            <div
              key={message.id}
              className="rounded-xl border border-white/5 bg-white/5 p-4 transition hover:border-cyan-500/30 hover:bg-cyan-500/5"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-white">{message.subject || '(უსათაურო)'}</p>
                  <p className="mt-1 text-sm text-cyan-400">{message.from}</p>
                  <p className="mt-2 text-sm text-slate-400 line-clamp-2">{message.snippet}</p>
                </div>
                <div className="ml-4 text-right">
                  <p className="text-xs text-slate-500">
                    {new Date(message.date).toLocaleDateString('ka-GE')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderCompose = () => {
    if (!selectedAccount) {
      return (
        <div className="rounded-2xl border border-white/5 bg-white/5 p-12 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-slate-400" />
          <p className="mt-4 text-sm text-slate-400">პირველ რიგში აირჩიეთ ანგარიში</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">ახალი შეტყობინება</h2>
            <p className="text-sm text-slate-400">გაგზავნეთ მაილი {selectedAccount.email}-დან</p>
          </div>
          <button
            onClick={() => setShowComposer(true)}
            className="flex items-center gap-2 rounded-full bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/20"
          >
            <Send className="h-4 w-4" />
            ახალი შეტყობინება
          </button>
        </div>
      </div>
    );
  };

  const renderAccounts = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">მაილის ანგარიშები</h2>
          <p className="text-sm text-slate-400">მართეთ თქვენი IMAP/SMTP ანგარიშები</p>
        </div>
        <button
          onClick={() => {
            setEditingAccount(null);
            setShowAccountForm(true);
          }}
          className="flex items-center gap-2 rounded-full bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/20"
        >
          <Plus className="h-4 w-4" />
          დამატება
        </button>
      </div>

      {accounts.length === 0 && !loading && (
        <div className="rounded-2xl border border-white/5 bg-white/5 p-12 text-center">
          <Mail className="mx-auto h-12 w-12 text-slate-400" />
          <p className="mt-4 text-sm text-slate-400">არცერთი ანგარიში არ არის დამატებული</p>
          <button
            onClick={() => {
              setEditingAccount(null);
              setShowAccountForm(true);
            }}
            className="mt-4 flex items-center gap-2 rounded-full bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/20 mx-auto"
          >
            <Plus className="h-4 w-4" />
            დაამატეთ პირველი ანგარიში
          </button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center rounded-2xl border border-white/5 bg-white/5 p-12">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        </div>
      )}

      {accounts.length > 0 && (
        <div className="grid gap-4">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="rounded-xl border border-white/5 bg-white/5 p-5 transition hover:border-cyan-500/30"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white">{account.name}</p>
                    {account.isDefault && (
                      <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-xs font-medium text-cyan-300">
                        ნაგულისხმევი
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-cyan-400">{account.email}</p>
                  <div className="mt-2 flex gap-4 text-xs text-slate-400">
                    <span>IMAP: {account.config.imapHost}:{account.config.imapPort}</span>
                    <span>SMTP: {account.config.smtpHost}:{account.config.smtpPort}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedAccount(account)}
                    className="rounded-full bg-cyan-500/10 p-2 text-cyan-400 transition hover:bg-cyan-500/20"
                    title="არჩევა"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingAccount(account);
                      setShowAccountForm(true);
                    }}
                    className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
                    title="რედაქტირება"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={async () => {
                      if (window.confirm(`დარწმუნებული ხართ რომ გსურთ ${account.name}-ის წაშლა?`)) {
                        try {
                          await mailService.deleteAccount(account.id);
                          await loadAccounts();
                        } catch (err) {
                          console.error('Failed to delete account:', err);
                        }
                      }
                    }}
                    className="rounded-full bg-red-500/10 p-2 text-red-400 transition hover:bg-red-500/20"
                    title="წაშლა"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className={`min-h-full ${className}`}>
      <div className="mb-6 flex items-center gap-2 border-b border-white/5 pb-4">
        <button
          onClick={() => setCurrentView('overview')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            currentView === 'overview'
              ? 'bg-cyan-500/20 text-cyan-200'
              : 'text-slate-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          მიმოხილვა
        </button>
        <button
          onClick={() => setCurrentView('inbox')}
          disabled={accounts.length === 0}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
            currentView === 'inbox'
              ? 'bg-cyan-500/20 text-cyan-200'
              : 'text-slate-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          Inbox
        </button>
        <button
          onClick={() => setCurrentView('compose')}
          disabled={accounts.length === 0}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
            currentView === 'compose'
              ? 'bg-cyan-500/20 text-cyan-200'
              : 'text-slate-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          დაწერეთ
        </button>
        <button
          onClick={() => setCurrentView('accounts')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            currentView === 'accounts'
              ? 'bg-cyan-500/20 text-cyan-200'
              : 'text-slate-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          ანგარიშები
        </button>
      </div>

      {currentView === 'overview' && renderOverview()}
      {currentView === 'inbox' && renderInbox()}
      {currentView === 'compose' && renderCompose()}
      {currentView === 'accounts' && renderAccounts()}

      {showAccountForm && (
        <MailAccountForm
          account={editingAccount}
          onClose={() => {
            setShowAccountForm(false);
            setEditingAccount(null);
          }}
          onSaved={() => {
            loadAccounts();
          }}
        />
      )}

      {showComposer && selectedAccount && (
        <MailComposer
          account={selectedAccount}
          onClose={() => setShowComposer(false)}
          onSent={() => {
            setShowComposer(false);
            loadInbox();
          }}
        />
      )}
    </div>
  );
};

export default MailTab;
