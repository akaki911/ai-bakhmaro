import React, { useState, useRef } from 'react';
import { Email, CustomFolder, Folder, Tag } from './types';
import { ArchiveIcon, BackIcon, DeleteIcon, ReplyIcon, SparkleIcon, MoveIcon, SnoozeIcon, SendIcon, TagIcon } from './icons/Icons';
import { useClickOutside } from './hooks/useClickOutside';


interface EmailDetailProps {
    email: Email;
    tags: Tag[];
    onBack: () => void;
    onArchive: (id: string) => void;
    onDelete: (id: string) => void;
    onReply: (email: Email) => void;
    onMove: (emailId: string, targetFolderId: string) => void;
    onSnooze: (emailId: string, snoozeUntil: Date) => void;
    onQuickReply: (newEmail: Omit<Email, 'id' | 'timestamp' | 'read'| 'folder' | 'tags'>) => void;
    customFolders: CustomFolder[];
    generateSummary: (body: string) => Promise<string>;
}

const QuickReply: React.FC<{ onSend: (body: string) => void }> = ({ onSend }) => {
    const [body, setBody] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (body.trim()) {
            onSend(body.trim());
            setBody('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="mt-4">
            <div className="relative">
                <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="სწრაფი პასუხი..."
                    className="w-full h-24 resize-none p-3 pr-12 border border-white/5 rounded-xl bg-transparent text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <button type="submit" className="absolute top-2 right-2 p-2 rounded-full bg-cyan-500 hover:bg-cyan-600 text-white disabled:bg-white/5" disabled={!body.trim()}>
                    <SendIcon className="h-5 w-5" />
                </button>
            </div>
        </form>
    );
};

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
            hash |= 0; 
        }
        return hash;
    };
    
    const colors = [ 'bg-red-200 text-red-800', 'bg-blue-200 text-blue-800', 'bg-green-200 text-green-800', 'bg-yellow-200 text-yellow-800', 'bg-purple-200 text-purple-800', 'bg-indigo-200 text-indigo-800', 'bg-pink-200 text-pink-800' ];
    const colorClass = colors[Math.abs(hashCode(sender)) % colors.length];

    return (
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mr-4 ${colorClass}`}>
            {getInitials(sender.split('<')[0].trim())}
        </div>
    );
};

const EmailDetail: React.FC<EmailDetailProps> = ({ email, tags, onBack, onArchive, onDelete, onReply, onMove, onSnooze, onQuickReply, customFolders, generateSummary }) => {
    const [isMoveMenuOpen, setIsMoveMenuOpen] = useState(false);
    const [isSnoozeMenuOpen, setIsSnoozeMenuOpen] = useState(false);
    const [isTagMenuOpen, setIsTagMenuOpen] = useState(false);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [summary, setSummary] = useState<string | null>(null);

    const moveMenuRef = useClickOutside<HTMLDivElement>(() => setIsMoveMenuOpen(false));
    const snoozeMenuRef = useClickOutside<HTMLDivElement>(() => setIsSnoozeMenuOpen(false));
    const tagMenuRef = useClickOutside<HTMLDivElement>(() => setIsTagMenuOpen(false));
    
    const formatDate = (timestamp: string) => {
        return new Date(timestamp).toLocaleString('ka-GE', {
            dateStyle: 'full',
            timeStyle: 'short',
        });
    };
    
    const handleAISummary = async () => {
        if (summary) {
            setSummary(null);
            return;
        }
        setIsSummarizing(true);
        const result = await generateSummary(email.body);
        setSummary(result);
        setIsSummarizing(false);
    }

    const handleMove = (targetFolderId: string) => {
        onMove(email.id, targetFolderId);
        setIsMoveMenuOpen(false);
    }
    
    const handleSnooze = (snoozeOption: 'tomorrow' | 'weekend' | 'nextWeek') => {
        const now = new Date();
        let snoozeUntil = new Date();
        switch(snoozeOption) {
            case 'tomorrow': snoozeUntil.setDate(now.getDate() + 1); snoozeUntil.setHours(8, 0, 0, 0); break;
            case 'weekend': snoozeUntil.setDate(now.getDate() + (6 - now.getDay() + 7) % 7); snoozeUntil.setHours(9, 0, 0, 0); break;
            case 'nextWeek': snoozeUntil.setDate(now.getDate() + 7); snoozeUntil.setHours(8, 0, 0, 0); break;
        }
        onSnooze(email.id, snoozeUntil);
        setIsSnoozeMenuOpen(false);
    }

    const handleQuickReplySend = (body: string) => {
        onQuickReply({
            recipient: email.sender,
            subject: `Re: ${email.subject}`,
            body,
            sender: 'user@gurulo.co'
        });
    };
    
    const systemMoveFolders = [
        {id: Folder.Inbox, name: 'შემომავალი'},
        {id: Folder.Archived, name: 'დაარქივებული'},
    ]

    return (
        <div className="bg-white/5 rounded-2xl shadow-2xl h-full flex flex-col border border-white/5">
            <div className="p-4 border-b border-white/5 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center min-w-0">
                    <button onClick={onBack} className="p-2 mr-2 rounded-full hover:bg-white/5 transition-colors text-white">
                        <BackIcon className="h-5 w-5" />
                    </button>
                </div>
                <div className="flex items-center space-x-1 sm:space-x-2 text-white">
                    <button onClick={() => onReply(email)} className="p-2 rounded-full hover:bg-white/5 transition-colors" title="პასუხი"> <ReplyIcon className="h-5 w-5" /> </button>
                     <div className="relative" ref={moveMenuRef}>
                        <button onClick={() => setIsMoveMenuOpen(prev => !prev)} className="p-2 rounded-full hover:bg-white/5 transition-colors" title="გადატანა"> <MoveIcon className="h-5 w-5" /> </button>
                        {isMoveMenuOpen && ( <div className="absolute right-0 mt-2 w-48 bg-white/5 rounded-xl shadow-lg z-10 border border-white/5"> <ul className="py-1"> {systemMoveFolders.filter(f => f.id !== email.folder).map(folder => ( <li key={folder.id}> <a href="#" onClick={(e) => {e.preventDefault(); handleMove(folder.id)}} className="block px-4 py-2 text-sm text-white hover:bg-white/5">{folder.name}</a> </li> ))} {customFolders.length > 0 && systemMoveFolders.length > 0 && <hr className="my-1 border-white/5"/>} {customFolders.filter(f => f.id !== email.folder).map(folder => ( <li key={folder.id}> <a href="#" onClick={(e) => {e.preventDefault(); handleMove(folder.id)}} className="block px-4 py-2 text-sm text-white hover:bg-white/5">{folder.name}</a> </li> ))} </ul> </div> )}
                    </div>
                     <div className="relative" ref={snoozeMenuRef}>
                        <button onClick={() => setIsSnoozeMenuOpen(prev => !prev)} className="p-2 rounded-full hover:bg-white/5 transition-colors" title="დაყოვნება"> <SnoozeIcon className="h-5 w-5" /> </button>
                        {isSnoozeMenuOpen && ( <div className="absolute right-0 mt-2 w-48 bg-white/5 rounded-xl shadow-lg z-10 border border-white/5"> <ul className="py-1 text-sm text-white"> <li onClick={() => handleSnooze('tomorrow')} className="block px-4 py-2 hover:bg-white/5 cursor-pointer">ხვალ</li> <li onClick={() => handleSnooze('weekend')} className="block px-4 py-2 hover:bg-white/5 cursor-pointer">ამ შაბათ-კვირას</li> <li onClick={() => handleSnooze('nextWeek')} className="block px-4 py-2 hover:bg-white/5 cursor-pointer">შემდეგ კვირას</li> </ul> </div> )}
                    </div>
                    <button onClick={() => onArchive(email.id)} className="p-2 rounded-full hover:bg-white/5 transition-colors" title="დაარქივება"> <ArchiveIcon className="h-5 w-5" /> </button>
                     <button onClick={() => onDelete(email.id)} className="p-2 rounded-full hover:bg-red-900/50 text-red-400 transition-colors" title="წაშლა"> <DeleteIcon className="h-5 w-5" /> </button>
                </div>
            </div>
            
            <div className="p-4 border-b border-white/5">
                <h2 className="text-xl font-bold mb-2 text-white">{email.subject}</h2>
                <div className="flex items-center">
                    <Avatar sender={email.sender} />
                    <div className="min-w-0">
                        <p className="font-semibold truncate text-white">{email.sender}</p>
                        <p className="text-sm text-white/60 truncate">მიმღები: {email.recipient}</p>
                    </div>
                    <p className="ml-auto text-sm text-white/60 flex-shrink-0 pl-2">{formatDate(email.timestamp)}</p>
                </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto prose prose-sm prose-invert max-w-none">
                 {summary && (
                    <div className="mb-6 p-4 bg-cyan-500/10 border-l-4 border-cyan-500 rounded-r-xl">
                        <h4 className="font-bold text-sm text-cyan-400">✨ AI-ს მიერ გენერირებული</h4>
                        <p className="mt-2 text-white">{summary}</p>
                    </div>
                )}
                <p className="whitespace-pre-wrap leading-relaxed text-white">
                    {email.body}
                </p>
            </div>
             <div className="p-4 border-t border-white/5 bg-white/5">
                <QuickReply onSend={handleQuickReplySend} />
            </div>
        </div>
    );
};

export default EmailDetail;
