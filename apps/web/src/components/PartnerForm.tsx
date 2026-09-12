'use client';

import { FormEvent, useState } from 'react';
import { Button, Input } from '@aliver/ui';
import { api } from '@/lib/api';
import { t, type Locale, type MessageKey } from '@/i18n/messages';

const initial = { company: '', contactPerson: '', phone: '', telegram: '', city: '', businessType: '', monthlyVolume: '', comment: '' };
const fields: Array<{ key: keyof typeof initial; label: MessageKey; required?: boolean }> = [
  { key: 'company', label: 'partner.company', required: true },
  { key: 'contactPerson', label: 'partner.person', required: true },
  { key: 'phone', label: 'partner.phone', required: true },
  { key: 'telegram', label: 'partner.telegram' },
  { key: 'city', label: 'partner.city' },
  { key: 'businessType', label: 'partner.type' },
  { key: 'monthlyVolume', label: 'partner.volume' },
];

/**
 * Hamkorlik arizasi. Sahifaning o'zi server komponenti bo'lib qoldi —
 * sarlavha menyuni bazadan o'qiydi va buni faqat serverda qila oladi.
 * Mijoz tomonida esa faqat shu forma qoladi.
 */
export function PartnerForm({ locale }: { locale: Locale }) {
  const [form, setForm] = useState(initial);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setError('');
    try {
      await api.createB2bLead(form);
      setDone(true);
      setForm(initial);
    } catch {
      setError(t(locale, 'common.error'));
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="alv-card" style={{ padding: 32 }} role="status">
        <h1 className="alv-h1">{t(locale, 'partner.doneTitle')}</h1>
        <p>{t(locale, 'partner.doneText')}</p>
      </div>
    );
  }

  return (
    <>
      <h1 className="alv-h1">{t(locale, 'partner.title')}</h1>
      <p style={{ color: 'var(--alv-muted)' }}>{t(locale, 'partner.subtitle')}</p>
      <form
        onSubmit={submit}
        className="alv-card"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 16, padding: 24, marginTop: 24 }}
      >
        {fields.map(({ key, label, required }) => (
          <label key={key} style={{ display: 'grid', gap: 6, fontWeight: 600, fontSize: 13 }}>
            {t(locale, label)}
            <Input
              required={required}
              value={form[key]}
              onChange={(event) => setForm((value) => ({ ...value, [key]: event.target.value }))}
            />
          </label>
        ))}
        <label style={{ display: 'grid', gap: 6, gridColumn: '1/-1', fontWeight: 600, fontSize: 13 }}>
          {t(locale, 'partner.comment')}
          <textarea
            rows={4}
            value={form.comment}
            onChange={(event) => setForm((value) => ({ ...value, comment: event.target.value }))}
            style={{ padding: 12, border: '1px solid var(--alv-line)', borderRadius: 10, font: 'inherit', resize: 'vertical' }}
          />
        </label>
        {error ? <p role="alert" style={{ color: 'var(--alv-danger)', gridColumn: '1/-1' }}>{error}</p> : null}
        <div>
          <Button disabled={sending}>{t(locale, sending ? 'partner.sending' : 'partner.send')}</Button>
        </div>
      </form>
    </>
  );
}
