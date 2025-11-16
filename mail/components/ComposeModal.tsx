import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Email, ComposeInitialData, Tag } from '../types';

interface ComposeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSend: (newEmail: Omit<Email, 'id' | 'timestamp' | 'read'| 'folder' | 'tags'>, draftId: string | null) => void;
    onSaveDraft: (draftData: Omit<Email, 'id' | 'timestamp' | 'read' | 'folder' | 'tags'>, draftId: string | null) => Promise<Email | null>;
    mode: 'new' | 'reply' | 'forward';
    draftId: string | null;
    initialData: ComposeInitialData;
}

const ComposeModal: React.FC<ComposeModalProps> = ({ isOpen, onClose, onSend, onSaveDraft, mode, draftId: initialDraftId, initialData }) => {
    const [recipient, setRecipient] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [error, setError] = useState('');
    const [draftId, setDraftId] = useState<string | null>(initialDraftId);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    const saveTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        setRecipient(initialData.recipient);
        setSubject(initialData.subject);
        setBody(initialData.body);
        setDraftId(initialDraftId);
    }, [initialData, initialDraftId]);

    const handleAutoSave = useCallback(async () => {
        setSaveStatus('saving');
        const draftData = { sender: initialData.sender, recipient, subject, body };
        const savedDraft = await onSaveDraft(draftData, draftId);
        if (savedDraft) {
            setDraftId(savedDraft.id);
        }
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
    }, [recipient, subject, body, draftId, onSaveDraft, initialData.sender]);


    useEffect(() => {
        if(saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        if (recipient || subject || body) {
            setSaveStatus('idle'); // Reset if user types again
            saveTimeoutRef.current = window.setTimeout(handleAutoSave, 2000);
        }
        
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [recipient, subject, body, handleAutoSave]);

    if (!isOpen) return null;

    const handleSend = () => {
        if (!recipient || !subject) {
            setError('მიმღების და სათაურის ველები სავალდებულოა.');
            return;
        }
        setError('');
        onSend({ sender: initialData.sender, recipient, subject, body }, draftId);
    };
    
    const getTitle = () => {
        switch(mode) {
            case 'new': return 'ახალი წერილი';
            case 'reply': return 'პასუხი';
            case 'forward': return 'გადაგზავნა';
            default: return 'ახალი წერილი';
        }
    }

    const getSaveStatusText = () => {
        switch (saveStatus) {
            case 'saving': return 'ინახება...';
            case 'saved': return 'შენახულია დრაფტებში';
            default: return '';
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-850 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] animate-fadeIn border dark:border-gray-700"
                onClick={e => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <h2 className="text-lg font-semibold">{getTitle()}</h2>
                    <button onClick={onClose} className="text-2xl leading-none p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">&times;</button>
                </header>
                <div className="p-4 space-y-4 overflow-y-auto">
                    {error && <p className="text-red-500 text-sm px-1">{error}</p>}
                     <div className="flex items-center">
                        <span className="text-sm text-gray-500 dark:text-gray-400 w-20">გამგზავნი:</span>
                        <input
                            type="text"
                            value={initialData.sender}
                            readOnly
                            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-700 dark:text-gray-300"
                        />
                    </div>
                    <div className="flex items-center">
                         <span className="text-sm text-gray-500 dark:text-gray-400 w-20">მიმღები:</span>
                        <input
                            type="email"
                            placeholder=""
                            value={recipient}
                            onChange={(e) => setRecipient(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-light dark:focus:ring-brand-dark"
                        />
                    </div>
                    <input
                        type="text"
                        placeholder="სათაური"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-light dark:focus:ring-brand-dark"
                    />
                     <textarea
                        placeholder="წერილის ტექსტი..."
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        className="w-full h-64 resize-none px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-light dark:focus:ring-brand-dark"
                    />
                </div>
                <footer className="flex justify-between items-center p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <span className="text-sm text-gray-500 dark:text-gray-400">{getSaveStatusText()}</span>
                    <button
                        onClick={handleSend}
                        className="bg-brand-light hover:bg-brand-hover text-white font-bold py-2 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md"
                    >
                        გაგზავნა
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default ComposeModal;
