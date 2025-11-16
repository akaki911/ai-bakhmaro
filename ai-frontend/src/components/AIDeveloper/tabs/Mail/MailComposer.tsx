import React, { useState, useCallback } from 'react';
import { X, Send, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { mailService, type MailAccount, type EmailPayload } from '../../../../services/mailService';

interface MailComposerProps {
  account: MailAccount;
  onClose: () => void;
  onSent: () => void;
}

export const MailComposer: React.FC<MailComposerProps> = ({ account, onClose, onSent }) => {
  const [formData, setFormData] = useState<EmailPayload>({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    text: '',
    html: '',
  });

  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (field: keyof EmailPayload, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSend = useCallback(async () => {
    try {
      setSending(true);
      setError(null);
      setSuccess(false);

      if (!formData.to) {
        throw new Error('მიმღების მისამართი აუცილებელია');
      }

      if (!formData.subject) {
        throw new Error('თემა აუცილებელია');
      }

      if (!formData.text && !formData.html) {
        throw new Error('შეტყობინების ტექსტი აუცილებელია');
      }

      const emailData: EmailPayload = {
        to: formData.to,
        subject: formData.subject,
        text: formData.text,
      };

      if (formData.cc) emailData.cc = formData.cc;
      if (formData.bcc) emailData.bcc = formData.bcc;
      if (formData.html) emailData.html = formData.html;

      await mailService.sendEmail(account.id, emailData);
      
      setSuccess(true);
      setTimeout(() => {
        onSent();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  }, [account, formData, onClose, onSent]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-[#050914] p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">ახალი შეტყობინება</h2>
            <p className="text-sm text-slate-400">გაგზავნეთ მაილი {account.email}-დან</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-200">
            <CheckCircle className="h-4 w-4" />
            <span>შეტყობინება წარმატებით გაიგზავნა!</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">მიმღები *</label>
            <input
              type="email"
              value={formData.to}
              onChange={(e) => handleChange('to', e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
              placeholder="recipient@example.com"
              disabled={sending || success}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">CC (ასლი)</label>
              <input
                type="email"
                value={formData.cc}
                onChange={(e) => handleChange('cc', e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                placeholder="cc@example.com"
                disabled={sending || success}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">BCC (ფარული ასლი)</label>
              <input
                type="email"
                value={formData.bcc}
                onChange={(e) => handleChange('bcc', e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                placeholder="bcc@example.com"
                disabled={sending || success}
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">თემა *</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => handleChange('subject', e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
              placeholder="შეტყობინების თემა"
              disabled={sending || success}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">შეტყობინება *</label>
            <textarea
              value={formData.text}
              onChange={(e) => handleChange('text', e.target.value)}
              rows={12}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none resize-none"
              placeholder="დაწერეთ თქვენი შეტყობინება აქ..."
              disabled={sending || success}
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <div className="flex-1" />
          <button
            onClick={onClose}
            disabled={sending}
            className="rounded-full px-4 py-2 text-sm font-medium text-slate-400 transition hover:text-white disabled:opacity-50"
          >
            გაუქმება
          </button>
          <button
            onClick={handleSend}
            disabled={sending || success}
            className="flex items-center gap-2 rounded-full bg-cyan-500/20 px-6 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/30 disabled:opacity-50"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                გაგზავნა...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                გაგზავნა
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
