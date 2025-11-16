import React from 'react';
import { Email, Tag } from './types';
import { PaperclipIcon } from './icons/Icons';

interface EmailListItemProps {
    email: Email;
    onSelectEmail: (id: string) => void;
    isSelected: boolean;
    onToggleSelect: (id: string) => void;
    isLast: boolean;
    isFocused: boolean;
    tags?: Tag[];
}

const Avatar: React.FC<{ sender: string }> = ({ sender }) => {
    const getInitials = (name: string) => {
        const parts = name.split(' ');
        if (parts.length > 1) {
            return parts[0][0] + parts[parts.length - 1][0];
        }
        return name.slice(0, 2);
    };

    const hashCode = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    };
    
    const colors = [
        'bg-red-200 text-red-800', 'bg-blue-200 text-blue-800',
        'bg-green-200 text-green-800', 'bg-yellow-200 text-yellow-800',
        'bg-purple-200 text-purple-800', 'bg-indigo-200 text-indigo-800',
        'bg-pink-200 text-pink-800',
    ];
    
    const colorClass = colors[Math.abs(hashCode(sender)) % colors.length];

    return (
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mr-4 ${colorClass}`}>
            {getInitials(sender.split('<')[0].trim())}
        </div>
    );
};


const EmailListItem: React.FC<EmailListItemProps> = ({ email, onSelectEmail, isSelected, onToggleSelect, isLast, isFocused }) => {
    const formatDate = (timestamp: string) => {
        const date = new Date(timestamp);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return date.toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' });
        }
        if (date.toDateString() === yesterday.toDateString()) {
            return 'გუშინ';
        }
        return date.toLocaleDateString('ka-GE');
    };

    const handleContainerClick = () => {
        onSelectEmail(email.id);
    }

    const handleCheckboxClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleSelect(email.id);
    }
    
    return (
        <li
            className={`flex items-center p-4 relative transition-colors duration-150 ${!isLast ? 'border-b border-white/5' : ''} ${isSelected ? 'bg-cyan-500/10' : 'hover:bg-white/5'}`}
        >
            {isFocused && <div className="absolute inset-0 ring-2 ring-cyan-500 rounded-sm pointer-events-none"></div>}
            <div className="flex items-center pr-4" onClick={handleCheckboxClick}>
                 <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="h-4 w-4 rounded border-white/20 text-cyan-500 focus:ring-cyan-500 cursor-pointer"
                />
            </div>
            
            <Avatar sender={email.sender} />

            <div className="flex-1 min-w-0 cursor-pointer" onClick={handleContainerClick}>
                <div className="flex justify-between items-baseline">
                    <p className={`truncate font-semibold ${!email.read && !isSelected ? 'text-white' : 'text-white/60'}`}>
                        {email.sender}
                    </p>
                    <div className="flex items-center flex-shrink-0 ml-4">
                        {email.attachments && email.attachments.length > 0 && (
                            <PaperclipIcon className="h-4 w-4 text-white/60 mr-2" />
                        )}
                        <p className="text-sm text-white/60">
                            {formatDate(email.timestamp)}
                        </p>
                    </div>
                </div>
                <p className={`truncate ${!email.read && !isSelected ? 'text-white' : 'text-white/60'}`}>
                    {email.subject}
                </p>
            </div>
        </li>
    );
};

export default EmailListItem;
