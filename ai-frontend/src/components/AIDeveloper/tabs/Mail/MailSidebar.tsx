import React, { useState } from 'react';
import {
  Inbox,
  Clock,
  Send,
  FileText,
  Archive,
  Trash2,
  Settings,
  ChevronDown,
  ChevronRight,
  Circle,
} from 'lucide-react';

interface MailSidebarProps {
  accounts: any[];
  selectedAccount: any;
  onAccountChange: (accountId: string) => void;
  selectedFolder: string;
  onFolderChange: (folder: string) => void;
  onCompose: () => void;
  onSettings: () => void;
  folderCounts?: Record<string, number>;
}

interface FolderItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
}

interface LabelItem {
  id: string;
  name: string;
  color: string;
}

export const MailSidebar: React.FC<MailSidebarProps> = ({
  accounts,
  selectedAccount,
  onAccountChange,
  selectedFolder,
  onFolderChange,
  onCompose,
  onSettings,
  folderCounts = {},
}) => {
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [workFoldersExpanded, setWorkFoldersExpanded] = useState(true);
  const [labelsExpanded, setLabelsExpanded] = useState(true);

  const folders: FolderItem[] = [
    { id: 'inbox', label: 'შემომავალი', icon: Inbox, count: folderCounts.inbox },
    { id: 'scheduled', label: 'დაგრულებული', icon: Clock, count: folderCounts.scheduled },
    { id: 'sent', label: 'გაგზავნილი', icon: Send, count: folderCounts.sent },
    { id: 'drafts', label: 'დრაფტები', icon: FileText, count: folderCounts.drafts },
    { id: 'archived', label: 'დაარქივებული', icon: Archive, count: folderCounts.archived },
    { id: 'trash', label: 'წაშლილი', icon: Trash2, count: folderCounts.trash },
  ];

  const workFolders: FolderItem[] = [
    { id: 'work-inbox', label: 'სამუშაო Inbox', icon: Inbox },
    { id: 'work-projects', label: 'პროექტები', icon: FileText },
  ];

  const labels: LabelItem[] = [
    { id: 'label-important', name: 'მნიშვნელოვანი', color: 'bg-red-500' },
    { id: 'label-personal', name: 'პირადი', color: 'bg-blue-500' },
    { id: 'label-work', name: 'სამსახური', color: 'bg-green-500' },
    { id: 'label-follow-up', name: 'Follow-up', color: 'bg-yellow-500' },
  ];

  const getInitials = (email: string) => {
    if (!email) return 'U';
    const parts = email.split('@')[0].split('.');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email[0].toUpperCase();
  };

  return (
    <div className="flex h-full w-64 flex-col bg-[#050914] border-r border-white/5">
      {/* Header - Account Selector */}
      <div className="p-4 border-b border-white/5">
        <div className="relative">
          <button
            onClick={() => setShowAccountDropdown(!showAccountDropdown)}
            className="w-full flex items-center gap-3 rounded-xl p-3 hover:bg-white/5 transition"
          >
            {selectedAccount ? (
              <>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-semibold text-cyan-300">
                  {getInitials(selectedAccount.email)}
                </div>
                <div className="flex-1 text-left overflow-hidden">
                  <p className="text-sm font-medium text-white truncate">
                    {selectedAccount.email}
                  </p>
                  <p className="text-xs text-white/60 truncate">{selectedAccount.name}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-white/60 flex-shrink-0" />
              </>
            ) : (
              <>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
                  <Circle className="h-4 w-4 text-white/40" />
                </div>
                <span className="text-sm text-white/60">აირჩიეთ ანგარიში</span>
                <ChevronDown className="h-4 w-4 text-white/60 ml-auto" />
              </>
            )}
          </button>

          {showAccountDropdown && accounts.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-white/5 bg-[#050914] shadow-xl z-10">
              {accounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => {
                    onAccountChange(account.id);
                    setShowAccountDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition first:rounded-t-xl last:rounded-b-xl"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-semibold text-cyan-300">
                    {getInitials(account.email)}
                  </div>
                  <div className="flex-1 text-left overflow-hidden">
                    <p className="text-sm font-medium text-white truncate">{account.email}</p>
                    <p className="text-xs text-white/60 truncate">{account.name}</p>
                  </div>
                  {account.isDefault && (
                    <span className="text-xs text-cyan-400">ნაგულისხმევი</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Compose Button */}
      <div className="p-4 border-b border-white/5">
        <button
          onClick={onCompose}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-cyan-600 shadow-lg shadow-cyan-500/20"
        >
          <Send className="h-4 w-4" />
          შეტყობინების დაწერა
        </button>
      </div>

      {/* Navigation Folders */}
      <div className="flex-1 overflow-y-auto">
        <nav className="p-2 space-y-1">
          {folders.map((folder) => {
            const Icon = folder.icon;
            const isActive = selectedFolder === folder.id;
            
            return (
              <button
                key={folder.id}
                onClick={() => onFolderChange(folder.id)}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                  isActive
                    ? 'bg-cyan-500/10 border-l-2 border-cyan-500 text-white'
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="flex-1 text-left">{folder.label}</span>
                {folder.count !== undefined && folder.count > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-300'
                        : 'bg-white/10 text-white/60'
                    }`}
                  >
                    {folder.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Work Folders Section */}
        <div className="mt-4 px-2">
          <button
            onClick={() => setWorkFoldersExpanded(!workFoldersExpanded)}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white/40 hover:text-white/60 transition"
          >
            {workFoldersExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            სამუშაო გარემო
          </button>
          {workFoldersExpanded && (
            <div className="mt-1 space-y-1">
              {workFolders.map((folder) => {
                const Icon = folder.icon;
                const isActive = selectedFolder === folder.id;
                
                return (
                  <button
                    key={folder.id}
                    onClick={() => onFolderChange(folder.id)}
                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                      isActive
                        ? 'bg-cyan-500/10 border-l-2 border-cyan-500 text-white'
                        : 'text-white/60 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <span className="flex-1 text-left">{folder.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Labels Section */}
        <div className="mt-4 px-2">
          <button
            onClick={() => setLabelsExpanded(!labelsExpanded)}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white/40 hover:text-white/60 transition"
          >
            {labelsExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            ჭდეები
          </button>
          {labelsExpanded && (
            <div className="mt-1 space-y-1">
              {labels.map((label) => {
                const isActive = selectedFolder === label.id;
                
                return (
                  <button
                    key={label.id}
                    onClick={() => onFolderChange(label.id)}
                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                      isActive
                        ? 'bg-cyan-500/10 border-l-2 border-cyan-500 text-white'
                        : 'text-white/60 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className={`h-3 w-3 rounded-full ${label.color} flex-shrink-0`} />
                    <span className="flex-1 text-left">{label.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Settings Button */}
      <div className="p-4 border-t border-white/5">
        <button
          onClick={onSettings}
          className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/60 transition hover:bg-white/5 hover:text-white"
        >
          <Settings className="h-5 w-5" />
          <span>პარამეტრები</span>
        </button>
      </div>
    </div>
  );
};

export default MailSidebar;
