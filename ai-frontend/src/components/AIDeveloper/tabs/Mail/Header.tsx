import React, { useState, useRef } from 'react';
import { SunIcon, MoonIcon, SearchIcon, ArchiveIcon, DeleteIcon, MoveIcon, MailOpenIcon, WifiIcon, WifiOffIcon } from './icons/Icons';
import { CustomFolder, Folder } from './types';
import { useClickOutside } from './hooks/useClickOutside';


interface HeaderProps {
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    selectedCount: number;
    onBulkArchive: () => void;
    onBulkDelete: () => void;
    onBulkMarkUnread: () => void;
    onBulkMove: (folderId: string) => void;
    onClearSelection: () => void;
    customFolders: CustomFolder[];
    isOffline: boolean;
}

const BulkActionMenu: React.FC<{
    onBulkArchive: () => void;
    onBulkDelete: () => void;
    onBulkMarkUnread: () => void;
    onBulkMove: (folderId: string) => void;
    customFolders: CustomFolder[];
}> = ({ onBulkArchive, onBulkDelete, onBulkMarkUnread, onBulkMove, customFolders }) => {
    const [isMoveMenuOpen, setIsMoveMenuOpen] = useState(false);
    const moveMenuRef = useClickOutside<HTMLDivElement>(() => setIsMoveMenuOpen(false));


    const systemMoveFolders = [
        {id: Folder.Inbox, name: 'შემომავალი'},
        {id: Folder.Archived, name: 'დაარქივებული'},
    ]

    return (
        <div className="flex items-center space-x-2">
            <button onClick={onBulkMarkUnread} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="წაუკითხავად მონიშვნა">
                <MailOpenIcon className="h-5 w-5" />
            </button>
            <button onClick={onBulkArchive} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="დაარქივება">
                <ArchiveIcon className="h-5 w-5" />
            </button>
            <div className="relative" ref={moveMenuRef}>
                <button onClick={() => setIsMoveMenuOpen(prev => !prev)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="გადატანა">
                    <MoveIcon className="h-5 w-5" />
                </button>
                {isMoveMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border dark:border-gray-700">
                        <ul className="py-1 max-h-60 overflow-y-auto">
                            {systemMoveFolders.map(folder => (
                                <li key={folder.id}>
                                    <a href="#" onClick={(e) => { e.preventDefault(); onBulkMove(folder.id); setIsMoveMenuOpen(false); }} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">{folder.name}</a>
                                </li>
                            ))}
                            {customFolders.length > 0 && <hr className="my-1 dark:border-gray-600"/>}
                            {customFolders.map(folder => (
                                <li key={folder.id}>
                                    <a href="#" onClick={(e) => { e.preventDefault(); onBulkMove(folder.id); setIsMoveMenuOpen(false); }} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">{folder.name}</a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
            <button onClick={onBulkDelete} className="p-2 rounded-full text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors" title="წაშლა">
                <DeleteIcon className="h-5 w-5" />
            </button>
        </div>
    );
};


const Header: React.FC<HeaderProps> = ({ theme, toggleTheme, searchTerm, setSearchTerm, selectedCount, isOffline, ...bulkActionProps }) => {
    if (selectedCount > 0) {
        return (
            <header className="flex-shrink-0 flex items-center justify-between p-4 bg-indigo-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 animate-fadeIn">
                 <div className="flex items-center">
                    <button onClick={bulkActionProps.onClearSelection} className="text-2xl leading-none p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 mr-2">&times;</button>
                    <span className="font-semibold">{selectedCount} არჩეულია</span>
                </div>
                <BulkActionMenu {...bulkActionProps} />
            </header>
        )
    }
    
    return (
        <header className="flex-shrink-0 flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="flex-1 flex items-center">
                <div className="relative w-full max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="ძიება..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-brand-light dark:focus:ring-brand-dark focus:outline-none"
                    />
                </div>
                {/* Fix: Moved title prop to a wrapping div to avoid TypeScript errors on SVG components. */}
                 <div className="ml-4" title={isOffline ? "ოფლაინ რეჟიმი" : "ონლაინ"}>
                    {isOffline ? (
                        <WifiOffIcon className="h-5 w-5 text-red-500" />
                    ) : (
                        <WifiIcon className="h-5 w-5 text-green-500" />
                    )}
                </div>
            </div>
            <button
                onClick={toggleTheme}
                className="ml-4 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-light dark:focus:ring-offset-gray-800 dark:focus:ring-brand-dark"
                aria-label="თემის შეცვლა"
            >
                {theme === 'light' ? <MoonIcon className="h-6 w-6" /> : <SunIcon className="h-6 w-6" />}
            </button>
        </header>
    );
};

export default Header;
