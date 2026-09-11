'use client';

import { FormEvent, useState } from 'react';
import { Button, Input } from '@aliver/ui';
import { api } from '@/lib/api';

const initial = { company: '', contactPerson: '', phone: '', telegram: '', city: '', businessType: '', monthlyVolume: '', comment: '' };

export default function PartnershipPage() {
  const [form, setForm] = useState(initial);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); setSending(true); setError('');
    try { await api.createB2bLead(form); setDone(true); setForm(initial); }
    catch (e) { setError((e as Error).message); } finally { setSending(false); }
  }
  if (done) return <main className="alv-page" style={{ maxWidth: 680, paddingTop: 70 }}><div className="alv-card" style={{ padding: 32 }}><h1 className="alv-h1">Arizangiz qabul qilindi</h1><p>Mutaxassisimiz siz bilan bog‘lanadi.</p></div></main>;
  return <main className="alv-page" style={{ maxWidth: 760, paddingTop: 48, paddingBottom: 70 }}><h1 className="alv-h1">ALIVER hamkori bo‘ling</h1><p style={{ color: 'var(--alv-muted)' }}>Ulgurji xarid, dilerlik va korporativ buyurtmalar uchun ariza qoldiring.</p><form onSubmit={submit} className="alv-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 16, padding: 24, marginTop: 24 }}>{Object.entries({ company: 'Kompaniya', contactPerson: 'Kontakt shaxs', phone: 'Telefon', telegram: 'Telegram', city: 'Shahar', businessType: 'Biznes turi', monthlyVolume: 'Oylik hajm' }).map(([key, label]) => <label key={key} style={{ display: 'grid', gap: 6, fontWeight: 600, fontSize: 13 }}>{label}<Input required={['company','contactPerson','phone'].includes(key)} value={form[key as keyof typeof form]} onChange={(e) => setForm((v) => ({ ...v, [key]: e.target.value }))} /></label>)}<label style={{ display: 'grid', gap: 6, gridColumn: '1/-1', fontWeight: 600, fontSize: 13 }}>Izoh<textarea rows={4} value={form.comment} onChange={(e) => setForm((v) => ({ ...v, comment: e.target.value }))} style={{ padding: 12, border: '1px solid var(--alv-line)', borderRadius: 10, font: 'inherit' }} /></label>{error ? <p role="alert" style={{ color: '#b42318', gridColumn: '1/-1' }}>{error}</p> : null}<div><Button disabled={sending}>{sending ? 'Yuborilmoqda…' : 'Ariza yuborish'}</Button></div></form></main>;
}
