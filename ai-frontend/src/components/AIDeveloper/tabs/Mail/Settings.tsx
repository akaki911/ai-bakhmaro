import React, { useState, useEffect } from 'react';
import { UserPlusIcon, DeleteIcon, UserIcon, ChevronDownIcon, SlidersIcon, PaletteIcon, TagIcon, EditIcon, PlusIcon } from './icons/Icons';
import { Account, MailAccountConfig, Tag } from './types';

// --- General Settings ---
const GeneralSettings: React.FC<{
    accounts: Account[];
    activeAccountId: string | null;
    onSaveConfig: (accountId: string, config: MailAccountConfig) => void;
}> = ({ accounts, activeAccountId, onSaveConfig }) => {
    const activeAccount = accounts.find(a => a.id === activeAccountId);
    const [undoDelay, setUndoDelay] = useState(activeAccount?.config?.undoSendDelay || 7);

    useEffect(() => {
        setUndoDelay(activeAccount?.config?.undoSendDelay || 7);
    }, [activeAccount]);

    const handleSave = () => {
        if (activeAccount && activeAccount.config) {
            onSaveConfig(activeAccount.id, { ...activeAccount.config, undoSendDelay: undoDelay });
        }
    };
    
    if (!activeAccount) return (
        <div className="bg-white/5 p-6 rounded-2xl shadow-lg border border-white/5 text-center">
            <p className="text-white/60">გთხოვთ, აირჩიოთ ანგარიში ანგარიშების სექციიდან პარამეტრების სამართავად.</p>
        </div>
    );

    return (
        <div className="bg-white/5 p-6 rounded-2xl shadow-lg border border-white/5">
            <h2 className="text-xl font-semibold mb-4 text-white">ზოგადი პარამეტრები: <span className="text-cyan-500">{activeAccount.name}</span></h2>
            <div className="space-y-4">
                <div>
                    <label htmlFor="undo-delay" className="block text-sm font-medium text-white">"გაგზავნის გაუქმება" პერიოდი</label>
                    <p className="text-xs text-white/60 mb-2">აირჩიეთ დროის პერიოდი, რომლის განმავლობაშიც შეძლებთ გაგზავნილი წერილის დაბრუნებას.</p>
                    <select
                        id="undo-delay"
                        value={undoDelay}
                        onChange={(e) => setUndoDelay(Number(e.target.value))}
                        className="mt-1 block w-full md:w-1/2 pl-3 pr-10 py-2 text-base border-white/5 bg-transparent text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm rounded-xl"
                    >
                        <option value={5}>5 წამი</option>
                        <option value={7}>7 წამი (რეკომენდებული)</option>
                        <option value={10}>10 წამი</option>
                        <option value={15}>15 წამი</option>
                        <option value={20}>20 წამი</option>
                    </select>
                </div>
                <div className="flex justify-end pt-2">
                    <button onClick={handleSave} className="px-4 py-2 text-sm font-semibold rounded-xl bg-cyan-500 text-white hover:bg-cyan-600 shadow-sm">შენახვა</button>
                </div>
            </div>
        </div>
    );
};

// --- Config Form (for Account Settings) ---
const ConfigForm: React.FC<{
    account: Account;
    onSave: (accountId: string, config: MailAccountConfig) => void;
    onTest: (accountId: string) => void;
}> = ({ account, onSave, onTest }) => {
    const [config, setConfig] = useState<MailAccountConfig>(
        account.config || {
            imapHost: '', imapPort: 993,
            smtpHost: '', smtpPort: 465,
            user: account.email, pass: '',
            undoSendDelay: 7
        }
    );

    useEffect(() => {
        setConfig(account.config || {
            imapHost: '', imapPort: 993,
            smtpHost: '', smtpPort: 465,
            user: account.email, pass: '',
            undoSendDelay: 7
        });
    }, [account]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setConfig(prev => ({
            ...prev,
            [name]: type === 'number' ? parseInt(value, 10) : value
        }));
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(account.id, config);
    };
    
    return (
        <form onSubmit={handleSave} className="bg-white/5 p-4 rounded-b-2xl mt-0 space-y-4 border-t border-white/5">
            <div>
                <h4 className="text-md font-semibold mb-2 text-white">IMAP (შემომავალი ფოსტა)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input name="imapHost" value={config.imapHost} onChange={handleChange} placeholder="IMAP ჰოსტი" className="md:col-span-2 w-full px-3 py-2 border border-white/5 rounded-xl bg-transparent text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                    <input name="imapPort" value={config.imapPort} onChange={handleChange} type="number" placeholder="პორტი" className="w-full px-3 py-2 border border-white/5 rounded-xl bg-transparent text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                </div>
            </div>
             <div>
                <h4 className="text-md font-semibold mb-2 text-white">SMTP (გამავალი ფოსტა)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input name="smtpHost" value={config.smtpHost} onChange={handleChange} placeholder="SMTP ჰოსტი" className="md:col-span-2 w-full px-3 py-2 border border-white/5 rounded-xl bg-transparent text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                    <input name="smtpPort" value={config.smtpPort} onChange={handleChange} type="number" placeholder="პორტი" className="w-full px-3 py-2 border border-white/5 rounded-xl bg-transparent text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                </div>
            </div>
             <div>
                <h4 className="text-md font-semibold mb-2 text-white">ავტორიზაცია</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input name="user" value={config.user} onChange={handleChange} placeholder="მომხმარებელი" className="w-full px-3 py-2 border border-white/5 rounded-xl bg-transparent text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                    <input name="pass" value={config.pass} onChange={handleChange} type="password" placeholder="პაროლი" className="w-full px-3 py-2 border border-white/5 rounded-xl bg-transparent text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                </div>
            </div>
             <div className="flex justify-end space-x-2 pt-2">
                 <button type="button" onClick={() => onTest(account.id)} className="px-3 py-1.5 text-sm rounded-xl hover:bg-white/5 border border-white/5 text-white">კავშირის შემოწმება</button>
                 <button type="submit" className="px-3 py-1.5 text-sm rounded-xl bg-cyan-500 text-white hover:bg-cyan-600">შენახვა</button>
            </div>
        </form>
    );
};


// --- Account Settings ---
const AccountSettings: React.FC<{
    accounts: Account[];
    onAddAccount: (name: string, email: string) => void;
    onDeleteAccount: (id: string) => void;
    onSaveConfig: (accountId: string, config: MailAccountConfig) => void;
    onTestConnection: (accountId: string) => void;
}> = ({ accounts, onAddAccount, onDeleteAccount, onSaveConfig, onTestConnection }) => {
    const [isAddingAccount, setIsAddingAccount] = useState(false);
    const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null);

     useEffect(() => {
        if (accounts.length === 0) {
            setIsAddingAccount(true);
        }
        if (accounts.length > 0 && !expandedAccountId) {
            setExpandedAccountId(accounts[0].id);
        }
    }, [accounts, expandedAccountId]);

    const toggleExpand = (accountId: string) => {
        setExpandedAccountId(prev => prev === accountId ? null : accountId);
    };

    return (
         <div className="bg-white/5 p-6 rounded-2xl shadow-lg border border-white/5">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">ანგარიშები და ინტეგრაციები</h2>
                {!isAddingAccount && (
                    <button onClick={() => setIsAddingAccount(true)} className="flex items-center space-x-2 text-sm font-semibold py-2 px-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-500">
                        <UserPlusIcon className="h-5 w-5" />
                        <span>ანგარიშის დამატება</span>
                    </button>
                )}
            </div>
            <p className="text-sm text-white/60 mb-4">დაამატეთ და დააკონფიგურირეთ თქვენი ელ.ფოსტის ანგარიშები.</p>

            {isAddingAccount && <AddAccountForm onAdd={onAddAccount} onCancel={() => setIsAddingAccount(false)} />}
            
            <div className="space-y-2 mt-4">
                {accounts.map(account => (
                    <div key={account.id} className="bg-white/5 rounded-2xl transition-shadow duration-300 hover:shadow-md">
                        <div className="flex items-center justify-between p-3 cursor-pointer" onClick={() => toggleExpand(account.id)}>
                             <div className="flex items-center">
                                <div className={`p-2 rounded-full mr-4 ${account.config ? 'bg-green-500/20' : 'bg-yellow-500/20'}`}>
                                    <UserIcon className={`h-5 w-5 ${account.config ? 'text-green-400' : 'text-yellow-400'}`} />
                                </div>
                                <div>
                                    <p className="font-medium text-white">{account.name} {account.isDefault && <span className="text-xs text-white/60">(ნაგულისხმევი)</span>}</p>
                                    <p className="text-sm text-white/60">{account.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center">
                                <button 
                                    onClick={(e) => {e.stopPropagation(); onDeleteAccount(account.id);}} 
                                    className="p-2 rounded-full hover:bg-red-900/50 text-red-400 transition-colors"
                                    title="ანგარიშის წაშლა"
                                >
                                    <DeleteIcon className="h-5 w-5" />
                                </button>
                                <ChevronDownIcon className={`h-5 w-5 ml-2 text-white/60 transition-transform ${expandedAccountId === account.id ? 'rotate-180' : ''}`} />
                            </div>
                        </div>
                        {expandedAccountId === account.id && (
                            <ConfigForm account={account} onSave={onSaveConfig} onTest={onTestConnection} />
                        )}
                    </div>
                ))}
            </div>
            {accounts.length === 0 && !isAddingAccount && (
                 <p className="text-center text-white/60 py-4">დაამატეთ თქვენი პირველი ანგარიში.</p>
            )}
        </div>
    )
}

// --- Appearance Settings ---
const AppearanceSettings: React.FC<{
    theme: 'light' | 'dark';
    setTheme: (theme: 'light' | 'dark') => void;
}> = ({ theme, setTheme }) => (
    <div className="bg-white/5 p-6 rounded-2xl shadow-lg border border-white/5">
        <h2 className="text-xl font-semibold mb-4 text-white">გარეგნობა</h2>
        <div className="space-y-2">
            <label className="block text-white">თემა</label>
            <div className="flex space-x-2 rounded-2xl bg-white/5 p-1">
                <button
                    onClick={() => setTheme('light')}
                    className={`w-full py-2 px-4 rounded-xl text-sm font-medium transition-colors ${theme === 'light' ? 'bg-cyan-500 text-white shadow' : 'text-white/60'}`}
                >
                    ღია
                </button>
                <button
                    onClick={() => setTheme('dark')}
                    className={`w-full py-2 px-4 rounded-xl text-sm font-medium transition-colors ${theme === 'dark' ? 'bg-cyan-500 text-white shadow' : 'text-white/60'}`}
                >
                    ბნელი
                </button>
            </div>
        </div>
    </div>
);

// --- Tag Management Settings ---
const availableTagColors = ['red', 'blue', 'green', 'yellow', 'purple', 'indigo', 'pink'];
const tagColorClasses: { [key: string]: string } = {
    red: 'bg-red-500', blue: 'bg-blue-500', green: 'bg-green-500', yellow: 'bg-yellow-500',
    purple: 'bg-purple-500', indigo: 'bg-indigo-500', pink: 'bg-pink-500'
};
const tagColorRingClasses: { [key: string]: string } = {
    red: 'ring-red-500', blue: 'ring-blue-500', green: 'ring-green-500', yellow: 'ring-yellow-500',
    purple: 'ring-purple-500', indigo: 'ring-indigo-500', pink: 'ring-pink-500'
};

const TagSettings: React.FC<{
    tags: Tag[];
    onAddTag: (name: string, color: string) => void;
    onUpdateTag: (id: string, newName: string, newColor: string) => void;
    onDeleteTag: (id: string, name: string) => void;
}> = ({ tags, onAddTag, onUpdateTag, onDeleteTag }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [editingTag, setEditingTag] = useState<Tag | null>(null);
    const [tagName, setTagName] = useState('');
    const [tagColor, setTagColor] = useState(availableTagColors[0]);

    const handleStartAdd = () => {
        setIsAdding(true);
        setEditingTag(null);
        setTagName('');
        setTagColor(availableTagColors[0]);
    };
    
    const handleStartEdit = (tag: Tag) => {
        setEditingTag(tag);
        setIsAdding(false);
        setTagName(tag.name);
        setTagColor(tag.color);
    };

    const handleCancel = () => {
        setIsAdding(false);
        setEditingTag(null);
    };

    const handleSave = () => {
        if (!tagName.trim()) return;
        if (editingTag) {
            onUpdateTag(editingTag.id, tagName.trim(), tagColor);
        } else {
            onAddTag(tagName.trim(), tagColor);
        }
        handleCancel();
    };

    const renderForm = () => (
        <div className="bg-white/5 p-4 rounded-2xl mt-4 space-y-3">
            <input
                type="text" value={tagName} onChange={(e) => setTagName(e.target.value)}
                placeholder="ჭდის სახელი"
                className="w-full px-3 py-2 border border-white/5 rounded-xl bg-transparent text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                autoFocus
            />
            <div className="flex items-center space-x-2">
                {availableTagColors.map(color => (
                    <button key={color} onClick={() => setTagColor(color)} className={`w-6 h-6 rounded-full ${tagColorClasses[color]} ${tagColor === color ? `ring-2 ring-offset-2 ring-offset-[#050914] ${tagColorRingClasses[color]}` : ''}`}></button>
                ))}
            </div>
            <div className="flex justify-end space-x-2">
                 <button type="button" onClick={handleCancel} className="px-3 py-1.5 text-sm rounded-xl hover:bg-white/5 text-white">გაუქმება</button>
                 <button type="submit" onClick={handleSave} className="px-3 py-1.5 text-sm rounded-xl bg-cyan-500 text-white hover:bg-cyan-600">შენახვა</button>
            </div>
        </div>
    );

    return (
        <div className="bg-white/5 p-6 rounded-2xl shadow-lg border border-white/5">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white">ჭდეების მართვა</h2>
                {!(isAdding || editingTag) && (
                    <button onClick={handleStartAdd} className="flex items-center space-x-2 text-sm font-semibold py-2 px-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-500">
                        <PlusIcon className="h-5 w-5" />
                        <span>ჭდის დამატება</span>
                    </button>
                )}
            </div>
            <p className="text-sm text-white/60 mb-4">შექმენით და მართეთ ჭდეები თქვენი წერილების კატეგორიზაციისთვის.</p>

            {(isAdding || editingTag) && renderForm()}

            <div className="space-y-2 mt-4">
                {tags.map(tag => (
                    editingTag?.id === tag.id ? null :
                    <div key={tag.id} className="group flex items-center justify-between p-3 rounded-2xl hover:bg-white/5">
                        <div className="flex items-center">
                            <span className={`w-4 h-4 rounded-full mr-3 ${tagColorClasses[tag.color] || 'bg-white/60'}`}></span>
                            <span className="font-medium text-white">{tag.name}</span>
                        </div>
                        <div className="hidden group-hover:flex items-center space-x-1 flex-shrink-0">
                            <button onClick={() => handleStartEdit(tag)} className="p-2 rounded-full hover:bg-white/5 text-white" title="რედაქტირება"><EditIcon className="h-4 w-4" /></button>
                            <button onClick={() => onDeleteTag(tag.id, tag.name)} className="p-2 rounded-full text-red-400 hover:bg-red-900/50" title="წაშლა"><DeleteIcon className="h-4 w-4" /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// --- Add Account Form ---
const AddAccountForm: React.FC<{ onAdd: (name: string, email: string) => void; onCancel: () => void; }> = ({ onAdd, onCancel }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim() && email.trim()) {
            onAdd(name, email);
            onCancel();
        } else {
            setError('ორივე ველი სავალდებულოა.')
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white/5 p-4 rounded-2xl mt-4 space-y-3">
             {error && <p className="text-red-400 text-sm">{error}</p>}
             <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="ანგარიშის სახელი (მაგ: სამსახური)" className="w-full px-3 py-2 border border-white/5 rounded-xl bg-transparent text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" autoFocus />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ელ.ფოსტის მისამართი" className="w-full px-3 py-2 border border-white/5 rounded-xl bg-transparent text-white focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            <div className="flex justify-end space-x-2">
                 <button type="button" onClick={onCancel} className="px-3 py-1.5 text-sm rounded-xl hover:bg-white/5 text-white">გაუქმება</button>
                 <button type="submit" className="px-3 py-1.5 text-sm rounded-xl bg-cyan-500 text-white hover:bg-cyan-600">დამატება</button>
            </div>
        </form>
    )
}

// --- Main Settings Component ---
interface SettingsProps {
    theme: 'light' | 'dark';
    setTheme: (theme: 'light' | 'dark') => void;
    accounts: Account[];
    activeAccountId: string | null;
    tags: Tag[];
    onAddAccount: (name: string, email: string) => void;
    onDeleteAccount: (id: string) => void;
    onSaveConfig: (accountId: string, config: MailAccountConfig) => void;
    onTestConnection: (accountId: string) => void;
    onAddTag: (name: string, color: string) => void;
    onUpdateTag: (id: string, newName: string, newColor: string) => void;
    onDeleteTag: (id: string, name: string) => void;
}

const Settings: React.FC<SettingsProps> = (props) => {
    const [activeTab, setActiveTab] = useState('accounts');

    const TABS: { [key: string]: string } = {
        general: 'ზოგადი',
        accounts: 'ანგარიშები',
        tags: 'ჭდეები',
        appearance: 'გარეგნობა',
    };
    
    const ICONS: { [key: string]: React.ReactNode } = {
        general: <SlidersIcon className="h-5 w-5 mr-3" />,
        accounts: <UserIcon className="h-5 w-5 mr-3" />,
        tags: <TagIcon className="h-5 w-5 mr-3" />,
        appearance: <PaletteIcon className="h-5 w-5 mr-3" />,
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'general':
                return <GeneralSettings accounts={props.accounts} activeAccountId={props.activeAccountId} onSaveConfig={props.onSaveConfig} />;
            case 'accounts':
                return <AccountSettings accounts={props.accounts} onAddAccount={props.onAddAccount} onDeleteAccount={props.onDeleteAccount} onSaveConfig={props.onSaveConfig} onTestConnection={props.onTestConnection} />;
            case 'appearance':
                return <AppearanceSettings theme={props.theme} setTheme={props.setTheme} />;
            case 'tags':
                return <TagSettings tags={props.tags} onAddTag={props.onAddTag} onUpdateTag={props.onUpdateTag} onDeleteTag={props.onDeleteTag} />;
            default:
                return null;
        }
    };
    
    return (
        <div className="animate-fadeIn max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-8 text-white">პარამეტრები</h1>

            <div className="flex flex-col md:flex-row gap-8">
                <aside className="md:w-1/4 lg:w-1/5">
                    <nav className="space-y-1">
                        {Object.keys(TABS).map(tabKey => (
                            <button
                                key={tabKey}
                                onClick={() => setActiveTab(tabKey)}
                                className={`w-full flex items-center px-4 py-2 text-left text-sm font-medium rounded-2xl transition-colors ${activeTab === tabKey ? 'bg-cyan-500/10 border-l-2 border-cyan-500 text-cyan-500' : 'hover:bg-white/5 text-white'}`}
                            >
                                {ICONS[tabKey]}
                                {TABS[tabKey]}
                            </button>
                        ))}
                    </nav>
                </aside>
                <main className="flex-1">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

export default Settings;
