import React, { useState, useCallback } from 'react';
import { X, Save, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { mailService, type MailAccountPayload, type MailAccount } from '../../../../services/mailService';

interface MailAccountFormProps {
  account?: MailAccount | null;
  onClose: () => void;
  onSaved: () => void;
}

export const MailAccountForm: React.FC<MailAccountFormProps> = ({ account, onClose, onSaved }) => {
  const [formData, setFormData] = useState<MailAccountPayload>({
    name: account?.name || '',
    email: account?.email || '',
    isDefault: account?.isDefault || false,
    config: {
      imapHost: account?.config.imapHost || '',
      imapPort: account?.config.imapPort || 993,
      smtpHost: account?.config.smtpHost || '',
      smtpPort: account?.config.smtpPort || 587,
      user: account?.config.user || '',
      pass: '',
    },
  });

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ imap: boolean; smtp: boolean } | null>(null);

  const handleChange = (field: keyof MailAccountPayload, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleConfigChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      config: { ...prev.config!, [field]: value },
    }));
  };

  const handleTest = useCallback(async () => {
    if (account) {
      try {
        setTesting(true);
        setError(null);
        const result = await mailService.testConnection(account.id);
        setTestResult({ imap: result.imap.ok, smtp: result.smtp.ok });
      } catch (err: any) {
        setError(err.message || 'Connection test failed');
      } finally {
        setTesting(false);
      }
    }
  }, [account]);

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);

      if (account) {
        const updateData = { ...formData };
        if (updateData.config && (!formData.config?.pass || formData.config.pass.trim() === '')) {
          delete updateData.config.pass;
        }
        await mailService.updateAccount(account.id, updateData);
      } else {
        await mailService.createAccount(formData);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save account');
    } finally {
      setSaving(false);
    }
  }, [account, formData, onClose, onSaved]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#050914] p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">
            {account ? 'რედაქტირება' : 'ახალი მაილის ანგარიში'}
          </h2>
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

        {testResult && (
          <div className="mb-4 space-y-2">
            {testResult.imap && (
              <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-200">
                <CheckCircle className="h-4 w-4" />
                <span>IMAP კავშირი წარმატებულია</span>
              </div>
            )}
            {testResult.smtp && (
              <div className="flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-200">
                <CheckCircle className="h-4 w-4" />
                <span>SMTP კავშირი წარმატებულია</span>
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">ანგარიშის სახელი</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                placeholder="Gurulo Mail"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">მაილის მისამართი</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                placeholder="gurulo@bakhmaro.co"
              />
            </div>
          </div>

          <div className="rounded-xl border border-white/5 bg-white/5 p-4">
            <h3 className="mb-3 text-sm font-semibold text-cyan-200">IMAP კონფიგურაცია (შემომავალი)</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs text-slate-400">Host</label>
                <input
                  type="text"
                  value={formData.config?.imapHost || ''}
                  onChange={(e) => handleConfigChange('imapHost', e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                  placeholder="imap.gmail.com"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs text-slate-400">Port</label>
                <input
                  type="number"
                  value={formData.config?.imapPort || ''}
                  onChange={(e) => handleConfigChange('imapPort', parseInt(e.target.value))}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                  placeholder="993"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/5 bg-white/5 p-4">
            <h3 className="mb-3 text-sm font-semibold text-cyan-200">SMTP კონფიგურაცია (გამავალი)</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs text-slate-400">Host</label>
                <input
                  type="text"
                  value={formData.config?.smtpHost || ''}
                  onChange={(e) => handleConfigChange('smtpHost', e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                  placeholder="smtp.gmail.com"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs text-slate-400">Port</label>
                <input
                  type="number"
                  value={formData.config?.smtpPort || ''}
                  onChange={(e) => handleConfigChange('smtpPort', parseInt(e.target.value))}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                  placeholder="587"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">მომხმარებელი</label>
              <input
                type="text"
                value={formData.config?.user || ''}
                onChange={(e) => handleConfigChange('user', e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                placeholder="username"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">პაროლი</label>
              <input
                type="password"
                value={formData.config?.pass || ''}
                onChange={(e) => handleConfigChange('pass', e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none"
                placeholder={account ? 'დატოვეთ ცარიელი ძველი პაროლისთვის' : 'პაროლი'}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={formData.isDefault}
              onChange={(e) => handleChange('isDefault', e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-2 focus:ring-cyan-500/50"
            />
            <label htmlFor="isDefault" className="text-sm text-slate-300">
              გამოიყენეთ როგორც ნაგულისხმევი ანგარიში
            </label>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          {account && (
            <button
              onClick={handleTest}
              disabled={testing}
              className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20 disabled:opacity-50"
            >
              {testing && <Loader2 className="h-4 w-4 animate-spin" />}
              კავშირის ტესტი
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-medium text-slate-400 transition hover:text-white"
          >
            გაუქმება
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-full bg-cyan-500/20 px-6 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/30 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                შენახვა...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                შენახვა
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
