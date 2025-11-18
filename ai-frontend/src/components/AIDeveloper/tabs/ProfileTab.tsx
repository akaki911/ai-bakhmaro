// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../contexts/useAuth';
import { toast } from 'react-hot-toast';

export default function ProfileTab() {
  const { user, refreshUserRole, updateUserPreferences } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    personalId: '',
    language: 'ka'
  });

  useEffect(() => {
    if (!user) return;
    setFields({
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      email: user.email ?? '',
      phoneNumber: user.phoneNumber ?? '',
      personalId: user.personalId ?? '',
      language: user.preferences?.language ?? 'ka'
    });
  }, [user]);

  const readOnlyView = useMemo(() => ({
    firstName: fields.firstName || '—',
    lastName: fields.lastName || '—',
    email: fields.email || '—',
    phoneNumber: fields.phoneNumber || '—',
    personalId: fields.personalId || '—',
    language: fields.language || 'ka'
  }), [fields]);

  const handleChange = (k: string, v: string) => setFields(prev => ({ ...prev, [k]: v }));

  const validate = () => {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (fields.email && !emailRe.test(fields.email)) {
      toast.error('ელ‑ფოსტის ფორმატი არასწორია');
      return false;
    }

    // Simple phone validation: digits, optional +, 8-15 chars
    const phoneRe = /^\+?\d[\d\s\-()]{6,}\d$/;
    if (fields.phoneNumber && !phoneRe.test(fields.phoneNumber)) {
      toast.error('ტელეფონის ფორმატი არასწორია');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        firstName: fields.firstName || null,
        lastName: fields.lastName || null,
        phoneNumber: fields.phoneNumber || null,
        personalId: fields.personalId || null,
      };

      const res = await fetch('/api/user/update', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }

      toast.success('პირადი ინფორმაცია განახლდა');
      setEditing(false);
      // Refresh local user state from backend
      try { await refreshUserRole(); } catch (e) { console.warn('failed to refresh user role', e); }
      // update preferences if changed
      try { updateUserPreferences?.({ language: fields.language }); } catch (e) { /* ignore */ }
    } catch (error) {
      console.error('Profile save failed', error);
      toast.error('პირადი ინფორმაციის განახლება ვერ მოხერხდა');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOptional = async () => {
    if (!confirm('დარწმუნებული ხართ? ეს წაიშლის პირად, არჩევით ინფორმაციას (სახელი, ტელეფონი). როლი/ადმინი იდენტობა არ წაიშლება).')) return;
    setSaving(true);
    try {
      const payload = {
        firstName: null,
        lastName: null,
        phoneNumber: null,
        personalId: user?.personalId ?? null,
        clearOptional: true
      };

      const res = await fetch('/api/user/update', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }

      toast.success('აირჩეული ინფორმაცია წაიშალა');
      try { await refreshUserRole(); } catch (e) { console.warn('failed to refresh user role', e); }
    } catch (error) {
      console.error('Delete optional failed', error);
      toast.error('ინფორმაციის წაშლა ვერ მოხდა');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return <div className="p-6">მომლაპარაკე სისტემაში შესული სუპერ ადმინისტრატორი.</div>;
  }

  return (
    <div className="p-6 rounded-xl border bg-[#0B1220]">
      <h2 className="mb-4 text-lg font-semibold">ჩემი სივრცე — პროფილი</h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="block text-xs text-gray-400">სახელი</label>
          <input
            value={fields.firstName}
            onChange={e => handleChange('firstName', e.target.value)}
            readOnly={!editing}
            className={`mt-1 w-full rounded-lg border px-3 py-2 bg-transparent text-sm ${editing ? 'border-slate-600' : 'border-transparent'}`}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400">გვარი</label>
          <input
            value={fields.lastName}
            onChange={e => handleChange('lastName', e.target.value)}
            readOnly={!editing}
            className={`mt-1 w-full rounded-lg border px-3 py-2 bg-transparent text-sm ${editing ? 'border-slate-600' : 'border-transparent'}`}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400">ელ‑ფოსტა</label>
          <input
            value={fields.email}
            onChange={e => handleChange('email', e.target.value)}
            readOnly
            className="mt-1 w-full rounded-lg border border-transparent px-3 py-2 bg-transparent text-sm text-gray-300"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400">ტელეფონი</label>
          <input
            value={fields.phoneNumber}
            onChange={e => handleChange('phoneNumber', e.target.value)}
            readOnly={!editing}
            className={`mt-1 w-full rounded-lg border px-3 py-2 bg-transparent text-sm ${editing ? 'border-slate-600' : 'border-transparent'}`}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400">პირადი ნომერი</label>
          <input
            value={fields.personalId}
            onChange={e => handleChange('personalId', e.target.value)}
            readOnly={!editing}
            className={`mt-1 w-full rounded-lg border px-3 py-2 bg-transparent text-sm ${editing ? 'border-slate-600' : 'border-transparent'}`}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400">ენა</label>
          <select
            value={fields.language}
            onChange={e => handleChange('language', e.target.value)}
            disabled={!editing}
            className={`mt-1 w-full rounded-lg border px-3 py-2 bg-transparent text-sm ${editing ? 'border-slate-600' : 'border-transparent'}`}
          >
            <option value="ka">ქართული</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        {!editing ? (
          <button type="button" onClick={() => setEditing(true)} className="rounded bg-emerald-500 px-4 py-2 text-sm font-semibold text-white">
            რედაქტირება
          </button>
        ) : (
          <>
            <button type="button" disabled={saving} onClick={handleSave} className="rounded bg-emerald-500 px-4 py-2 text-sm font-semibold text-white">
              {saving ? 'შენახვა...' : 'შენახვა'}
            </button>
            <button type="button" disabled={saving} onClick={() => { setEditing(false); setFields({
              firstName: user.firstName ?? '', lastName: user.lastName ?? '', email: user.email ?? '', phoneNumber: user.phoneNumber ?? '', personalId: user.personalId ?? '', language: user.preferences?.language ?? 'ka'
            }); }} className="rounded border px-4 py-2 text-sm font-semibold">
              გადატვირთვა
            </button>
          </>
        )}

        <button type="button" onClick={handleDeleteOptional} disabled={saving} className="ml-auto rounded border border-rose-600 px-3 py-2 text-sm font-semibold text-rose-400">
          პროფილის წაშლა
        </button>
      </div>

      <div className="mt-6 text-sm text-gray-400">
        <p>შენახვისას უზრუნველყოფილია ვალიდაცია. როლის ან ადმინისტრატორის იდენტობის შეცვლა არ არის ხელმისაწვდომი აქ.</p>
      </div>
    </div>
  );
}
