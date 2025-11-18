// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../contexts/useAuth';
import { toast } from 'react-hot-toast';
import { z } from 'zod';

const ProfileSchema = z.object({
  firstName: z.string().min(0).max(100).optional(),
  lastName: z.string().min(0).max(100).optional(),
  phoneNumber: z.string().min(0).optional(),
  personalId: z.string().min(0).optional(),
  language: z.enum(['ka', 'en'])
});

export default function ProfileTab() {
  const { user, updateUserProfile, updateUserPreferences } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState({ firstName: '', lastName: '', email: '', phoneNumber: '', personalId: '', language: 'ka' });
  const [errors, setErrors] = useState<Record<string,string>>({});

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

  const handleChange = (k: string, v: string) => {
    setFields(prev => ({ ...prev, [k]: v }));
    setErrors(prev => ({ ...prev, [k]: '' }));
  };

  const validateAndParse = () => {
    try {
      const parsed = ProfileSchema.parse({
        firstName: fields.firstName,
        lastName: fields.lastName,
        phoneNumber: fields.phoneNumber,
        personalId: fields.personalId,
        language: fields.language
      });

      // Additional specific checks
      const phoneRe = /^\+?\d[\d\s\-()]{6,}\d$/;
      if (fields.phoneNumber && !phoneRe.test(fields.phoneNumber)) {
        setErrors({ phoneNumber: 'ტელეფონის ფორმატი არასწორია' });
        return null;
      }

      return parsed;
    } catch (e: any) {
      const zErr = e?.issues ?? null;
      if (Array.isArray(zErr)) {
        const map: Record<string,string> = {};
        for (const issue of zErr) {
          const path = String(issue.path?.[0] ?? 'field');
          map[path] = issue.message;
        }
        setErrors(map);
      }
      return null;
    }
  };

  const handleSave = async () => {
    setErrors({});
    const parsed = validateAndParse();
    if (!parsed) return;
    setSaving(true);
    try {
      const payload = {
        firstName: parsed.firstName ?? null,
        lastName: parsed.lastName ?? null,
        phoneNumber: parsed.phoneNumber ?? null,
        personalId: parsed.personalId ?? null
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
      try { await updateUserProfile?.(payload); } catch (e) { console.warn('failed to update user profile', e); }
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
      const payload = { firstName: null, lastName: null, phoneNumber: null, clearOptional: true };
      const res = await fetch('/api/user/update', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) { const txt = await res.text(); throw new Error(txt || `HTTP ${res.status}`); }
      toast.success('აირჩეული ინფორმაცია წაიშალა');
      try { await updateUserProfile?.({ firstName: null, lastName: null, phoneNumber: null }); } catch (e) { console.warn('failed to update user profile', e); }
    } catch (error) {
      console.error('Delete optional failed', error);
      toast.error('ინფორმაციის წაშლა ვერ მოხდა');
    } finally { setSaving(false); }
  };

  if (!user) { return <div className="p-6">ავტორიზებული სუპერ ადმინისტრატორი არ არის.</div>; }

  return (
    <div className="p-6 rounded-xl border bg-[#0B1220]">
      <h2 className="mb-4 text-lg font-semibold">ჩემი სივრცე — პროფილი</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="block text-xs text-gray-400" htmlFor="firstName">სახელი</label>
          <input id="firstName" placeholder="შენი სახელი" aria-label="სახელი" value={fields.firstName} onChange={e => handleChange('firstName', e.target.value)} readOnly={!editing} className={`mt-1 w-full rounded-lg border px-3 py-2 bg-transparent text-sm ${editing ? 'border-slate-600' : 'border-transparent'}`} />
          {errors.firstName && <div className="mt-1 text-xs text-rose-400">{errors.firstName}</div>}
        </div>

        <div>
          <label className="block text-xs text-gray-400" htmlFor="lastName">გვარი</label>
          <input id="lastName" placeholder="შენი გვარი" aria-label="გვარი" value={fields.lastName} onChange={e => handleChange('lastName', e.target.value)} readOnly={!editing} className={`mt-1 w-full rounded-lg border px-3 py-2 bg-transparent text-sm ${editing ? 'border-slate-600' : 'border-transparent'}`} />
          {errors.lastName && <div className="mt-1 text-xs text-rose-400">{errors.lastName}</div>}
        </div>

        <div>
          <label className="block text-xs text-gray-400" htmlFor="email">ელ‑ფოსტა</label>
          <input id="email" placeholder="example@domain.ge" aria-label="ელფოსტა" value={fields.email} readOnly className="mt-1 w-full rounded-lg border border-transparent px-3 py-2 bg-transparent text-sm text-gray-300" />
        </div>

        <div>
          <label className="block text-xs text-gray-400" htmlFor="phone">ტელეფონი</label>
          <input id="phone" placeholder="(+995) 5XX XXX XXX" aria-label="ტელეფონი" value={fields.phoneNumber} onChange={e => handleChange('phoneNumber', e.target.value)} readOnly={!editing} className={`mt-1 w-full rounded-lg border px-3 py-2 bg-transparent text-sm ${editing ? 'border-slate-600' : 'border-transparent'}`} />
          {errors.phoneNumber && <div className="mt-1 text-xs text-rose-400">{errors.phoneNumber}</div>}
        </div>

        <div>
          <label className="block text-xs text-gray-400" htmlFor="personalId">პირადი ნომერი</label>
          <input id="personalId" placeholder="01019062020" aria-label="პირადი ნომერი" value={fields.personalId} onChange={e => handleChange('personalId', e.target.value)} readOnly={!editing} className={`mt-1 w-full rounded-lg border px-3 py-2 bg-transparent text-sm ${editing ? 'border-slate-600' : 'border-transparent'}`} />
          {errors.personalId && <div className="mt-1 text-xs text-rose-400">{errors.personalId}</div>}
        </div>

        <div>
          <label className="block text-xs text-gray-400" htmlFor="language">ენა</label>
          <select id="language" title="ენა" value={fields.language} onChange={e => handleChange('language', e.target.value)} disabled={!editing} className={`mt-1 w-full rounded-lg border px-3 py-2 bg-transparent text-sm ${editing ? 'border-slate-600' : 'border-transparent'}`}>
            <option value="ka">ქართული</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        {!editing ? (
          <button type="button" onClick={() => setEditing(true)} className="rounded bg-emerald-500 px-4 py-2 text-sm font-semibold text-white">რედაქტირება</button>
        ) : (
          <>
            <button type="button" disabled={saving} onClick={handleSave} className="rounded bg-emerald-500 px-4 py-2 text-sm font-semibold text-white">{saving ? 'შენახვა...' : 'შენახვა'}</button>
            <button type="button" disabled={saving} onClick={() => { setEditing(false); setFields({ firstName: user.firstName ?? '', lastName: user.lastName ?? '', email: user.email ?? '', phoneNumber: user.phoneNumber ?? '', personalId: user.personalId ?? '', language: user.preferences?.language ?? 'ka' }); }} className="rounded border px-4 py-2 text-sm font-semibold">გაუქმება</button>
          </>
        )}

        <button type="button" onClick={handleDeleteOptional} disabled={saving} className="ml-auto rounded border border-rose-600 px-3 py-2 text-sm font-semibold text-rose-400">პირადი ინფორმაციის წაშლა</button>
      </div>

      <div className="mt-6 text-sm text-gray-400"><p>როლი ან ადმინისტრატორის იდენტობის ცვლილება არაა შესაძლებელი ამ ინტერფეისში.</p></div>
    </div>
  );
}
