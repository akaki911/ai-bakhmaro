import React from 'react';
import { Email } from './types';
import EmailListItem from './EmailListItem';
import { EmptyInboxIcon } from './icons/Icons';

const EmailListSkeleton: React.FC = () => (
    <div className="bg-white/5 rounded-2xl shadow-2xl overflow-hidden border border-white/5">
        <ul>
            {Array.from({ length: 8 }).map((_, index) => (
                <li key={index} className={`flex items-center p-4 ${index !== 7 ? 'border-b border-white/5' : ''}`}>
                    <div className="h-6 w-6 rounded mr-4 bg-white/5 animate-pulse"></div>
                    <div className="w-10 h-10 rounded-full mr-4 bg-white/5 animate-pulse"></div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                            <div className="h-4 w-1/4 rounded bg-white/5 animate-pulse"></div>
                            <div className="h-3 w-16 rounded bg-white/5 animate-pulse"></div>
                        </div>
                         <div className="h-4 w-2/3 mt-2 rounded bg-white/5 animate-pulse"></div>
                    </div>
                </li>
            ))}
        </ul>
    </div>
);


interface EmailListProps {
    emails: Email[];
    onSelectEmail: (id: string) => void;
    isLoading: boolean;
    selectedEmailIds: Set<string>;
    onToggleSelectAll: (emailIds: string[]) => void;
    onToggleSelectOne: (emailId: string) => void;
    accountConfigured: boolean;
    focusedEmailId: string | null;
}

const EmailList: React.FC<EmailListProps> = ({ emails, onSelectEmail, isLoading, selectedEmailIds, onToggleSelectAll, onToggleSelectOne, accountConfigured, focusedEmailId }) => {
    if (isLoading) {
        return <EmailListSkeleton />;
    }
    
    if (!accountConfigured) {
         return (
            <div className="flex items-center justify-center h-full animate-fadeIn">
                <div className="text-center p-8 bg-white/5 rounded-2xl shadow-md">
                     <h3 className="text-lg font-semibold text-white">ანგარიში არ არის დაკონფიგურირებული</h3>
                    <p className="text-white/60 text-sm mt-2">
                        გთხოვთ, გადახვიდეთ პარამეტრების გვერდზე და დაამატოთ ფოსტის სერვერის მონაცემები.
                    </p>
                </div>
            </div>
        );
    }

    if (emails.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full animate-fadeIn text-center">
                <EmptyInboxIcon className="w-32 h-32 text-white/20" />
                <p className="text-white/60 text-lg mt-4 font-semibold">საქაღალდე ცარიელია</p>
                <p className="text-white/40 text-sm mt-1">როგორც ჩანს, აქ წერილები არ არის.</p>
            </div>
        );
    }
    
    const allEmailIds = emails.map(e => e.id);
    const areAllSelected = selectedEmailIds.size === emails.length && emails.length > 0;

    return (
        <div className="bg-white/5 rounded-2xl shadow-2xl overflow-hidden animate-fadeIn border border-white/5">
            <div className="p-4 border-b border-white/5">
                 <input
                    type="checkbox"
                    checked={areAllSelected}
                    onChange={() => onToggleSelectAll(allEmailIds)}
                    className="h-4 w-4 rounded border-white/20 text-cyan-500 focus:ring-cyan-500"
                    aria-label="ყველას მონიშვნა"
                />
            </div>
            <ul className="overflow-y-auto h-full">
                {emails.map((email, index) => (
                    <EmailListItem 
                        key={email.id} 
                        email={email} 
                        onSelectEmail={onSelectEmail}
                        isSelected={selectedEmailIds.has(email.id)}
                        onToggleSelect={onToggleSelectOne}
                        isLast={index === emails.length - 1}
                        isFocused={email.id === focusedEmailId}
                    />
                ))}
            </ul>
        </div>
    );
};

export default EmailList;
