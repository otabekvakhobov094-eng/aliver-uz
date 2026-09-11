'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@aliver/ui';
import { AdminShell } from '@/components/AdminShell';
import { adminApi, type B2bLead } from '@/lib/api';

const statuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'PARTNER', 'REJECTED'];
export default function B2bPage() {
  const [items, setItems] = useState<B2bLead[]>([]); const [filter, setFilter] = useState(''); const [error, setError] = useState('');
  const load = useCallback(async () => { try { setItems(await adminApi.b2bLeads(filter || undefined)); } catch (e) { setError((e as Error).message); } }, [filter]);
  useEffect(() => { void load(); }, [load]);
  async function change(item: B2bLead, status: string) { await adminApi.updateB2bLead(item.id, { status }); await load(); }
  return <AdminShell title="B2B lidlar"><div style={{ marginBottom: 18 }}><select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: 10, borderRadius: 10 }}><option value="">Barcha holatlar</option>{statuses.map((s) => <option key={s}>{s}</option>)}</select></div>{error ? <p role="alert">{error}</p> : null}<div className="alv-card" style={{ overflow: 'hidden' }}>{items.map((item, i) => <div key={item.id} style={{ padding: 18, borderTop: i ? '1px solid var(--alv-line)' : undefined, display: 'grid', gridTemplateColumns: '2fr 1.3fr 1fr', gap: 14, alignItems: 'center' }}><div><strong>{item.company}</strong><div style={{ color: 'var(--alv-muted)', fontSize: 13 }}>{item.contactPerson} · {item.phone} · {item.city}</div></div><Badge tone={item.status === 'PARTNER' ? 'mint' : 'neutral'}>{item.status}</Badge><select aria-label="Lid holati" value={item.status} onChange={(e) => void change(item, e.target.value)}>{statuses.map((s) => <option key={s}>{s}</option>)}</select></div>)}</div></AdminShell>;
}
