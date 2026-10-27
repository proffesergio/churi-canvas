 'use client';
import { useState } from 'react';
import type { Lead } from '@/lib/model';
import { api } from '@/lib/api';
import { useToast } from './providers';

export function LeadForm({ source = 'Facebook', admin = false, onSaved }: { source?: Lead['source']; admin?: boolean; onSaved?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [key, setKey] = useState('');
  const toast = useToast();
  if (done) return <p role="status">Thank you! Your enquiry has been saved. We’ll contact you on the number you provided.</p>;
  return <form className="social-form" onSubmit={async e => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const submissionKey = key || crypto.randomUUID();
    setKey(submissionKey);
    setBusy(true);
    try {
      await api(admin ? 'admin/leads' : 'leads', { method: 'POST', body: JSON.stringify({ source: data.get('source'), name: data.get('name'), phone: data.get('phone'), message: data.get('message'), consent: data.get('consent') === 'on', submissionKey }) });
      if (admin) { form.reset(); setKey(''); toast('Lead saved.'); onSaved?.(); } else setDone(true);
    } catch (error) { toast((error as Error).message, true); } finally { setBusy(false); }
  }}>
    <label className="field">Where did you find us?<select name="source" defaultValue={source}><option>Facebook</option><option>TikTok</option></select></label>
    <label className="field">Name<input name="name" required minLength={2} maxLength={80} autoComplete="name" /></label>
    <label className="field">Mobile number<input name="phone" type="tel" required maxLength={20} autoComplete="tel" placeholder="01XXXXXXXXX" /></label>
    <label className="field">Which pieces are you interested in?<textarea name="message" required minLength={3} maxLength={1500} rows={4} /></label>
    <label className="checkbox-field"><input name="consent" type="checkbox" required />{admin ? 'The customer agreed to be contacted about this enquiry.' : 'I agree to be contacted by ChuriCanvas about this enquiry.'}</label>
    <button className="primary" disabled={busy}>{busy ? 'Saving…' : admin ? 'Save lead' : 'Send enquiry'}</button>
  </form>;
}
