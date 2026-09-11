'use client';

import { use, useEffect, useState } from 'react';
import { formatTiyin } from '@aliver/ui';
import { adminApi } from '@/lib/api';

interface Waybill {
  number: string;
  placedAt: string;
  customer: { name: string; phone: string };
  address: {
    region: string | null;
    district: string | null;
    line: string | null;
    landmark: string | null;
  };
  delivery: {
    method: string;
    etaFrom: string | null;
    etaTo: string | null;
    carrier: string | null;
    courierName: string | null;
    courierPhone: string | null;
    trackingNo: string | null;
  };
  items: Array<{ name: string; sku: string; quantity: number; lineTotal: string }>;
  totals: { grandTotal: string; shippingTotal: string };
  collectCash: string | null;
  comment: string | null;
}

/**
 * Kuryer varaqasi.
 *
 * Sahifa chop etish uchun: oq fon, katta shrift, ortiqcha bezaksiz.
 * Eng muhim qator — "MIJOZDAN OLINSIN": naqd to'lovda kuryer qancha
 * pul olishi kerakligi. U ataylab eng ko'zga tashlanadigan joyda.
 */
export default function WaybillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<Waybill | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi
      .waybill(id)
      .then((res) => setData(res as unknown as Waybill))
      .catch((e) => setError(e instanceof Error ? e.message : 'Xatolik'));
  }, [id]);

  if (error) return <p style={{ padding: 24, color: '#c62134' }}>{error}</p>;
  if (!data) return <p style={{ padding: 24 }}>Yuklanmoqda…</p>;

  const address = [data.address.region, data.address.district, data.address.line]
    .filter(Boolean)
    .join(', ');

  return (
    <main
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: 24,
        background: '#fff',
        color: '#111',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 12mm; }
        }
      `}</style>

      <div className="no-print" style={{ marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => window.print()}
          style={{
            minHeight: 44,
            padding: '0 20px',
            borderRadius: 999,
            border: 0,
            background: '#e4175c',
            color: '#fff',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Chop etish
        </button>
      </div>

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>ALIVER.UZ</div>
          <div style={{ fontSize: 13, color: '#555' }}>Yetkazib berish varaqasi</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 20, fontWeight: 800 }}>{data.number}</div>
          <div style={{ fontSize: 12, color: '#555' }}>
            {new Date(data.placedAt).toLocaleString('ru-RU')}
          </div>
        </div>
      </header>

      <hr style={{ margin: '16px 0', border: 0, borderTop: '1px solid #ddd' }} />

      {data.collectCash ? (
        <div
          style={{
            border: '2px solid #111',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 16,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 13, letterSpacing: '0.06em' }}>MIJOZDAN OLINSIN</div>
          <div style={{ fontSize: 30, fontWeight: 800 }}>{formatTiyin(data.collectCash)} so‘m</div>
        </div>
      ) : (
        <div
          style={{
            border: '1px dashed #999',
            borderRadius: 8,
            padding: '10px 16px',
            marginBottom: 16,
            textAlign: 'center',
            fontSize: 14,
          }}
        >
          Oldindan to‘langan — kuryer pul olmaydi
        </div>
      )}

      <Section title="Mijoz">
        <Row k="Ism" v={data.customer.name} />
        <Row k="Telefon" v={data.customer.phone} />
        <Row k="Manzil" v={address || '—'} />
        {data.address.landmark ? <Row k="Mo‘ljal" v={data.address.landmark} /> : null}
      </Section>

      <Section title="Yetkazib berish">
        <Row k="Usul" v={data.delivery.method} />
        {data.delivery.courierName ? <Row k="Kuryer" v={data.delivery.courierName} /> : null}
        {data.delivery.courierPhone ? <Row k="Kuryer tel." v={data.delivery.courierPhone} /> : null}
        {data.delivery.trackingNo ? <Row k="Trek raqami" v={data.delivery.trackingNo} /> : null}
        {data.delivery.etaFrom ? (
          <Row
            k="Taxminiy sana"
            v={`${new Date(data.delivery.etaFrom).toLocaleDateString('ru-RU')} — ${
              data.delivery.etaTo ? new Date(data.delivery.etaTo).toLocaleDateString('ru-RU') : ''
            }`}
          />
        ) : null}
      </Section>

      <Section title="Tarkib">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
              <th style={{ padding: '6px 4px' }}>Mahsulot</th>
              <th style={{ padding: '6px 4px' }}>SKU</th>
              <th style={{ padding: '6px 4px', textAlign: 'right' }}>Soni</th>
              <th style={{ padding: '6px 4px', textAlign: 'right' }}>Summa</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((i, idx) => (
              <tr key={`${i.sku}-${idx}`} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '6px 4px' }}>{i.name}</td>
                <td style={{ padding: '6px 4px', color: '#666' }}>{i.sku}</td>
                <td style={{ padding: '6px 4px', textAlign: 'right' }}>{i.quantity}</td>
                <td style={{ padding: '6px 4px', textAlign: 'right' }}>
                  {formatTiyin(i.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div
          style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 14 }}
        >
          <span>Yetkazib berish</span>
          <span>{formatTiyin(data.totals.shippingTotal)}</span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 6,
            fontSize: 17,
            fontWeight: 800,
          }}
        >
          <span>Jami</span>
          <span>{formatTiyin(data.totals.grandTotal)} so‘m</span>
        </div>
      </Section>

      {data.comment ? (
        <Section title="Mijoz izohi">
          <p style={{ margin: 0, fontSize: 13 }}>{data.comment}</p>
        </Section>
      ) : null}

      <div style={{ display: 'flex', gap: 40, marginTop: 32, fontSize: 13 }}>
        <SignLine label="Kuryer imzosi" />
        <SignLine label="Mijoz imzosi" />
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 13, letterSpacing: '0.06em', color: '#666', margin: '0 0 8px' }}>
        {title.toUpperCase()}
      </h2>
      {children}
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', gap: 12, fontSize: 14, marginBottom: 4 }}>
      <span style={{ width: 120, color: '#666' }}>{k}</span>
      <strong>{v}</strong>
    </div>
  );
}

function SignLine({ label }: { label: string }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ borderBottom: '1px solid #111', height: 32 }} />
      <div style={{ color: '#666', marginTop: 4 }}>{label}</div>
    </div>
  );
}
