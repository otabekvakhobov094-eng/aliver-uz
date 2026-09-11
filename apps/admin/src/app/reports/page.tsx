'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { adminApi, type ReportOverview } from '@/lib/api';

function money(value: string | null) { return `${(Number(value ?? 0) / 100).toLocaleString('uz-UZ')} so‘m`; }
export default function ReportsPage() {
  const [report, setReport] = useState<ReportOverview | null>(null);
  useEffect(() => { void adminApi.reportOverview().then(setReport); }, []);
  if (!report) return <AdminShell title="Hisobotlar"><p>Yuklanmoqda…</p></AdminShell>;
  const cards = [['Buyurtmalar', report.orders.count], ['Tushum', money(report.orders.revenue)], ['Yangi mijozlar', report.newCustomers], ['Chegirmalar', money(report.orders.discount)]];
  return <AdminShell title="Hisobotlar"><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 14 }}>{cards.map(([label,value]) => <div className="alv-card" style={{ padding: 20 }} key={label}><div style={{ color: 'var(--alv-muted)', fontSize: 13 }}>{label}</div><strong style={{ fontSize: 24 }}>{value}</strong></div>)}</div><h2 style={{ marginTop: 30 }}>Top mahsulotlar</h2><div className="alv-card">{report.topProducts.map((p) => <div key={p.productName} style={{ display: 'flex', justifyContent: 'space-between', padding: 14, borderBottom: '1px solid var(--alv-line)' }}><span>{p.productName}</span><strong>{p._sum.quantity ?? 0} dona · {money(p._sum.lineTotal)}</strong></div>)}</div><h2 style={{ marginTop: 30 }}>Marketing atributsiyasi</h2><div className="alv-card">{report.attribution.map((row) => <div key={row.utmSource ?? 'direct'} style={{ display: 'flex', justifyContent: 'space-between', padding: 14, borderBottom: '1px solid var(--alv-line)' }}><span>{row.utmSource ?? 'direct'}</span><strong>{row._count} ta · {money(row._sum.grandTotal)}</strong></div>)}</div></AdminShell>;
}
