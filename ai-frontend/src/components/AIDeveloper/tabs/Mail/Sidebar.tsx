import React, { useState, useRef } from 'react';
import { Folder, View, CustomFolder, Account, Tag } from './types';
import { InboxIcon, SentIcon, ArchiveIcon, EditIcon, SettingsIcon, FolderPlusIcon, SnoozeIcon, DeleteIcon, FolderIcon, ChevronDownIcon, TagIcon } from './icons/Icons';
import { useClickOutside } from './hooks/useClickOutside';

interface AccountSwitcherProps {
    accounts: Account[];
    activeAccount?: Account;
    onAccountChange: (accountId: string) => void;
}

const AccountSwitcher: React.FC<AccountSwitcherProps> = ({ accounts, activeAccount, onAccountChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const switcherRef = useClickOutside<HTMLDivElement>(() => setIsOpen(false));
    
    if (!activeAccount) {
        return (
             <div className="h-20 flex items-center justify-center px-4 border-b border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500">ანგარიში არ არის</p>
             </div>
        )
    }

    return (
        <div className="relative" ref={switcherRef}>
            <div 
                className="h-20 flex items-center px-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-200 to-purple-200 dark:from-indigo-900 dark:to-purple-900 rounded-full flex items-center justify-center font-bold text-brand-light dark:text-brand-dark mr-3 flex-shrink-0">
                    {activeAccount.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate text-sm">{activeAccount.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{activeAccount.email}</p>
                </div>
                <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute top-full mt-1 w-full bg-white dark:bg-gray-800 rounded-md shadow-lg z-20 border dark:border-gray-700">
                    <ul className="py-1 max-h-60 overflow-y-auto">
                        {accounts.map(account => (
                            <li key={account.id}>
                                <a 
                                    href="#" 
                                    onClick={(e) => { 
                                        e.preventDefault(); 
                                        onAccountChange(account.id);
                                        setIsOpen(false); 
                                    }} 
                                    className={`block px-4 py-2 text-sm ${account.id === activeAccount.id ? 'font-bold text-brand-light dark:text-brand-dark' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                >
                                    {account.name}
                                    <span className="block text-xs text-gray-500">{account.email}</span>
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

interface SidebarProps {
    activeFolder: string;
    activeView: View;
    customFolders: CustomFolder[];
    tags: Tag[];
    accounts: Account[];
    activeAccount?: Account;
    onAccountChange: (accountId: string) => void;
    onFolderChange: (folderId: string) => void;
    onViewChange: (view: View) => void;
    onCompose: () => void;
    onCreateFolder: (name: string) => void;
    onUpdateFolder: (id: string, newName: string) => void;
    onDeleteFolder: (id: string, name: string) => void;
    unreadCount: number;
}

const Sidebar: React.FC<SidebarProps> = ({ 
    activeFolder, 
    activeView, 
    customFolders,
    tags,
    accounts,
    activeAccount,
    onAccountChange,
    onFolderChange, 
    onViewChange, 
    onCompose, 
    onCreateFolder,
    onUpdateFolder,
    onDeleteFolder,
    unreadCount 
}) => {
    const [isCreating, setIsCreating] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
    const [editingFolderName, setEditingFolderName] = useState('');

    const navItems = [
        { folder: Folder.Inbox, label: 'შემომავალი', icon: <InboxIcon className="h-5 w-5" /> },
        { folder: Folder.Snoofed, label: 'დაყოვნებული', icon: <SnoozeIcon className="h-5 w-5" /> },
        { folder: Folder.Sent, label: 'გაგზავნილი', icon: <SentIcon className="h-5 w-5" /> },
        { folder: Folder.Drafts, label: 'დრაფტები', icon: <EditIcon className="h-5 w-5" /> },
        { folder: Folder.Archived, label: 'დაარქივებული', icon: <ArchiveIcon className="h-5 w-5" /> },
        { folder: Folder.Trash, label: 'ნაგავი', icon: <DeleteIcon className="h-5 w-5" /> },
    ];
    
    const handleCreate = () => {
        if (newFolderName.trim()) {
            onCreateFolder(newFolderName.trim());
            setNewFolderName('');
            setIsCreating(false);
        }
    };

    const handleStartEdit = (folder: CustomFolder) => {
        setEditingFolderId(folder.id);
        setEditingFolderName(folder.name);
    };

    const handleCancelEdit = () => {
        setEditingFolderId(null);
        setEditingFolderName('');
    };

    const handleSaveEdit = () => {
        if (editingFolderId && editingFolderName.trim()) {
            onUpdateFolder(editingFolderId, editingFolderName.trim());
            handleCancelEdit();
        }
    };
    
    const tagColors: { [key: string]: string } = {
        red: 'bg-red-500',
        blue: 'bg-blue-500',
        green: 'bg-green-500',
        yellow: 'bg-yellow-500',
        purple: 'bg-purple-500',
    };

    return (
        <aside className="w-64 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
            <AccountSwitcher accounts={accounts} activeAccount={activeAccount} onAccountChange={onAccountChange} />
            <div className="p-4">
                <button
                    onClick={onCompose}
                    disabled={!activeAccount}
                    className="w-full flex items-center justify-center bg-brand-light hover:bg-brand-hover text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                >
                    <EditIcon className="h-5 w-5 mr-2" />
                    წერილის დაწერა
                </button>
            </div>
            <nav className="flex-1 px-4 py-2 overflow-y-auto">
                 {activeAccount && <>
                <ul>
                    {navItems.map(item => (
                        <li key={item.folder}>
                            <a
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    onFolderChange(item.folder);
                                }}
                                className={`flex items-center justify-between px-4 py-2 my-1 rounded-lg transition-colors duration-200 ${
                                    activeView === View.Mail && activeFolder === item.folder
                                        ? 'bg-indigo-100 dark:bg-gray-800 text-brand-light dark:text-white font-semibold shadow-inner'
                                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                            >
                                <div className="flex items-center">
                                    {item.icon}
                                    <span className="ml-3">{item.label}</span>
                                </div>
                                {item.folder === Folder.Inbox && unreadCount > 0 && (
                                    <span className="bg-brand-light text-white text-xs font-bold px-2 py-1 rounded-full">{unreadCount}</span>
                                )}
                            </a>
                        </li>
                    ))}
                </ul>
                <div className="mt-4">
                    <div className="flex justify-between items-center px-4 py-2">
                        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">საქაღალდეები</h2>
                        <button onClick={() => { setIsCreating(true); handleCancelEdit(); }} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                            <FolderPlusIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        </button>
                    </div>
                    {isCreating && (
                        <div className="p-2 space-y-2">
                            <input 
                                type="text"
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                placeholder="საქაღალდის სახელი..."
                                className="w-full text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-brand-light"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                            />
                            <div className="flex justify-end space-x-2">
                                <button onClick={() => setIsCreating(false)} className="px-2 py-1 text-xs rounded-md hover:bg-gray-200 dark:hover:bg-gray-700">გაუქმება</button>
                                <button onClick={handleCreate} className="px-2 py-1 text-xs rounded-md bg-brand-light text-white hover:bg-brand-hover">შექმნა</button>
                            </div>
                        </div>
                    )}
                    <ul>
                         {customFolders.map(folder => (
                             <li key={folder.id}>
                                {editingFolderId === folder.id ? (
                                    <div className="p-2 space-y-2">
                                        <input 
                                            type="text"
                                            value={editingFolderName}
                                            onChange={(e) => setEditingFolderName(e.target.value)}
                                            className="w-full text-sm px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-brand-light"
                                            autoFocus
                                            onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                                        />
                                        <div className="flex justify-end space-x-2">
                                            <button onClick={handleCancelEdit} className="px-2 py-1 text-xs rounded-md hover:bg-gray-200 dark:hover:bg-gray-700">გაუქმება</button>
                                            <button onClick={handleSaveEdit} className="px-2 py-1 text-xs rounded-md bg-brand-light text-white hover:bg-brand-hover">შენახვა</button>
                                        </div>
                                    </div>
                                ) : (
                                <a
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onFolderChange(folder.id);
                                    }}
                                    className={`group flex items-center justify-between px-4 py-2 my-1 rounded-lg transition-colors duration-200 text-sm ${
                                        activeView === View.Mail && activeFolder === folder.id
                                            ? 'bg-indigo-100 dark:bg-gray-800 text-brand-light dark:text-white font-semibold shadow-inner'
                                            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                                    }`}
                                >
                                    <div className="flex items-center truncate">
                                      <FolderIcon className="h-5 w-5 mr-3 text-gray-400 dark:text-gray-500" />
                                      <span className="truncate" title={folder.name}>{folder.name}</span>
                                    </div>
                                    <div className="hidden group-hover:flex items-center space-x-1 flex-shrink-0">
                                        <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleStartEdit(folder);}} className="p-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600" title="რედაქტირება">
                                            <EditIcon className="h-4 w-4" />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDeleteFolder(folder.id, folder.name);}} className="p-1 rounded hover:bg-red-200 dark:hover:bg-red-900/50 text-red-500" title="წაშლა">
                                            <DeleteIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                </a>
                                )}
                            </li>
                         ))}
                    </ul>
                </div>
                 <div className="mt-4">
                    <div className="flex justify-between items-center px-4 py-2">
                        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ჭდეები</h2>
                         {/* Placeholder for Add Tag button */}
                    </div>
                     <ul>
                        {tags.map(tag => (
                             <li key={tag.id}>
                                <a href="#" className="flex items-center px-4 py-2 my-1 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300">
                                    <span className={`w-3 h-3 rounded-full mr-3 ${tagColors[tag.color] || 'bg-gray-400'}`}></span>
                                    <span className="truncate">{tag.name}</span>
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
                </>}
            </nav>
            <div className="px-4 py-2 mt-auto">
                 <a
                    href="#"
                    onClick={(e) => {
                        e.preventDefault();
                        onViewChange(View.Settings);
                    }}
                    className={`flex items-center px-4 py-2 my-1 rounded-lg transition-colors duration-200 ${
                        activeView === View.Settings
                            ? 'bg-indigo-100 dark:bg-gray-800 text-brand-light dark:text-white font-semibold shadow-inner'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                >
                    <SettingsIcon className="h-5 w-5" />
                    <span className="ml-3">პარამეტრები</span>
                </a>
            </div>
        </aside>
    );
};

export default Sidebar;
