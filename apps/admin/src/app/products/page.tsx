'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, formatTiyin } from '@aliver/ui';
import { AdminShell } from '@/components/AdminShell';
import { DataList, type DataColumn } from '@/components/DataList';
import { adminApi, type AdminProduct } from '@/lib/api';
import { fmtDate } from '@/lib/order-labels';

/**
 * Mahsulotlar ro'yxati — TZ-2, 4.4.
 *
 * Ro'yxat mexanikasi (saqlangan ko'rinishlar, ustun sozlamalari,
 * ommaviy amallar, bo'sh holatlar) `DataList` da: u bir marta yozilgan
 * va boshqa ro'yxatlarga ham shu ko'rinishda qo'llaniladi. Bu sahifada
 * faqat MAHSULOTGA xos narsa qoladi — qaysi ustunlar bor va ular nima
 * ko'rsatadi.
 */

const STATUS_TONE: Record<string, 'mint' | 'neutral' | 'low' | 'new'> = {
  ACTIVE: 'mint',
  DRAFT: 'neutral',
  HIDDEN: 'neutral',
  OUT_OF_STOCK: 'low',
  ARCHIVED: 'neutral',
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Faol',
  DRAFT: 'Qoralama',
  HIDDEN: 'Yashirilgan',
  OUT_OF_STOCK: 'Tugagan',
  ARCHIVED: 'Arxiv',
};

const STATUS_FILTERS = [
  { value: '', label: 'Hammasi' },
  { value: 'ACTIVE', label: 'Faol' },
  { value: 'DRAFT', label: 'Qoralama' },
  { value: 'HIDDEN', label: 'Yashirilgan' },
  { value: 'OUT_OF_STOCK', label: 'Tugagan' },
];

const COLUMNS: Array<DataColumn<AdminProduct>> = [
  {
    key: 'name',
    label: 'Mahsulot',
    locked: true,
    minWidth: 260,
    render: (p) => (
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
        {p.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.imageUrl}
            alt=""
            width={40}
            height={40}
            style={{ borderRadius: 8, objectFit: 'cover', flex: 'none' }}
          />
        ) : (
          <span
            aria-hidden
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: 'var(--alv-line)',
              flex: 'none',
            }}
          />
        )}
        <div style={{ minWidth: 0 }}>
          {/* Nom — tahrirlash sahifasiga havola. Ilgari ro'yxat "o'lik"
              edi: mahsulotni ochishning yo'li yo'q edi. */}
          <Link
            href={`/products/${p.id}`}
            style={{
              display: 'block',
              fontWeight: 700,
              color: 'var(--alv-brand)',
              overflowWrap: 'break-word',
            }}
          >
            {p.nameUz}
          </Link>
          <span style={{ color: 'var(--alv-muted)', fontSize: 13 }}>/{p.slug}</span>
        </div>
      </div>
    ),
  },
  {
    key: 'status',
    label: 'Holat',
    render: (p) => <Badge tone={STATUS_TONE[p.status] ?? 'neutral'}>{STATUS_LABEL[p.status] ?? p.status}</Badge>,
  },
  {
    key: 'price',
    label: 'Narx',
    align: 'right',
    render: (p) => (
      <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
        {p.minPrice === p.maxPrice
          ? formatTiyin(p.minPrice)
          : `${formatTiyin(p.minPrice)} – ${formatTiyin(p.maxPrice)}`}
        {p.hasSale ? (
          <span style={{ color: 'var(--alv-brand)', marginLeft: 6, fontSize: 12.5 }}>chegirma</span>
        ) : null}
      </span>
    ),
  },
  {
    key: 'stock',
    label: 'Ombor',
    render: (p) => (
      <span style={{ color: p.inStock ? 'var(--alv-mint)' : 'var(--alv-brand-deep)' }}>
        {p.inStock ? 'Bor' : 'Tugagan'}
      </span>
    ),
  },
  {
    key: 'variants',
    label: 'Variant',
    align: 'right',
    render: (p) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{p.variantsCount}</span>,
  },
  {
    key: 'ikpu',
    // Fiskal chek uchun majburiy. Standart holatda yashirin, lekin
    // buxgalter uni bitta bosish bilan ochib, bo'sh qolganlarini
    // ko'ra oladi — bu odatda relizdan oldin eslanadi.
    label: 'IKPU',
    defaultVisible: false,
    render: (p) =>
      p.ikpuCode ? (
        <code style={{ fontSize: 12.5 }}>{p.ikpuCode}</code>
      ) : (
        <span style={{ color: 'var(--alv-amber, #9a6200)' }}>yo‘q</span>
      ),
  },
  {
    key: 'vat',
    label: 'QQS',
    defaultVisible: false,
    align: 'right',
    render: (p) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{p.vatRate}%</span>,
  },
  {
    key: 'updated',
    label: 'Yangilangan',
    defaultVisible: false,
    render: (p) => (
      <span style={{ color: 'var(--alv-muted)', whiteSpace: 'nowrap' }}>
        {fmtDate(p.updatedAt)}
      </span>
    ),
  },
];

export default function ProductsPage() {
  const [items, setItems] = useState<AdminProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<Record<string, unknown>>({ q: '', status: '' });
  /*
   * O'chirilganlar ro'yxati ALOHIDA: ro'yxat ularni doim yashirardi,
   * tiklash yo'li esa serverda bor edi — ya'ni bitta noto'g'ri bosishda
   * mahsulot adminkadan butunlay yo'qolardi.
   */
  const [showDeleted, setShowDeleted] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const q = (filters.q as string) ?? '';
  const status = (filters.status as string) ?? '';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.products({
        q: q || undefined,
        status: showDeleted ? undefined : status || undefined,
        deleted: showDeleted || undefined,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setLoading(false);
    }
  }, [q, status, showDeleted]);

  /**
   * O'chirilganlar ro'yxati boshqa ustunlar bilan ko'rsatiladi: narx
   * va ombor bu yerda ma'nosiz, kerak bo'lgani — qachon o'chirilgani
   * va tiklash tugmasi.
   */
  const DELETED_COLUMNS = useMemo<Array<DataColumn<AdminProduct>>>(
    () => [
      COLUMNS[0]!,
      {
        key: 'deletedAt',
        label: 'O‘chirilgan',
        render: (p) => (
          <span style={{ color: 'var(--alv-muted)', whiteSpace: 'nowrap' }}>
            {fmtDate(p.deletedAt ?? null)}
          </span>
        ),
      },
      {
        key: 'restore',
        label: '',
        align: 'right',
        locked: true,
        render: (p) => (
          <button
            type="button"
            disabled={restoring === p.id}
            onClick={() => {
              setRestoring(p.id);
              adminApi
                .restoreProduct(p.id)
                .then(() => load())
                .catch((e: Error) => setError(e.message))
                .finally(() => setRestoring(null));
            }}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: '1px solid var(--alv-line)',
              background: 'transparent',
              color: 'var(--alv-ink)',
              cursor: restoring === p.id ? 'wait' : 'pointer',
              fontSize: 13,
              whiteSpace: 'nowrap',
            }}
          >
            {restoring === p.id ? 'Tiklanmoqda…' : 'Tiklash'}
          </button>
        ),
      },
    ],
    [restoring, load],
  );

  useEffect(() => {
    // Qidiruvda har bosilgan harf uchun so'rov yubormaslik.
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);

  const bulkActions = useMemo(
    () => [
      {
        key: 'activate',
        label: 'Faollashtirish',
        run: (ids: string[]) => adminApi.bulkStatus(ids, 'ACTIVE'),
      },
      {
        key: 'hide',
        label: 'Yashirish',
        run: (ids: string[]) => adminApi.bulkStatus(ids, 'HIDDEN'),
      },
      {
        key: 'archive',
        label: 'Arxivlash',
        tone: 'danger' as const,
        // Ommaviy va qaytarish qiyin bo'lgan amal sonini aytib tasdiqlaydi.
        confirm: (n: number) => `${n} ta mahsulot arxivlansinmi?`,
        run: (ids: string[]) => adminApi.bulkStatus(ids, 'ARCHIVED'),
      },
    ],
    [],
  );

  const input: React.CSSProperties = {
    padding: '9px 12px',
    borderRadius: 10,
    border: '1px solid var(--alv-line)',
    fontSize: 14,
    background: 'var(--alv-surface)',
    color: 'var(--alv-ink)',
    minWidth: 0,
  };

  return (
    <AdminShell title="Mahsulotlar">
      {error ? (
        <div
          role="alert"
          className="alv-card"
          style={{ padding: 14, marginBottom: 14, borderLeft: '3px solid var(--alv-danger)' }}
        >
          {error}
        </div>
      ) : null}

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between',
          margin: '0 0 14px',
        }}
      >
        <p style={{ margin: 0, color: 'var(--alv-muted)', fontSize: 14 }}>
          Jami {total} ta mahsulot
        </p>
        <Link
          href="/products/yangi"
          style={{
            padding: '9px 18px',
            borderRadius: 10,
            background: 'var(--alv-ink)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          + Yangi mahsulot
        </Link>
      </div>

      <DataList<AdminProduct>
        storageKey="products"
        columns={showDeleted ? DELETED_COLUMNS : COLUMNS}
        rows={items}
        rowKey={(p) => p.id}
        filters={filters}
        onFiltersChange={setFilters}
        loading={loading}
        bulkActions={bulkActions}
        onDone={load}
        onClearFilters={() => {
          setFilters({ q: '', status: '' });
          setShowDeleted(false);
        }}
        emptyTitle="Hali mahsulot qo‘shilmagan"
        emptyHint="Excel orqali import qiling yoki qo‘lda yarating."
        noResultsTitle="Bu so‘rovga mos mahsulot topilmadi"
        filterBar={
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <input
              type="search"
              value={q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              placeholder="Nom, SKU yoki barcode — kirill ham ishlaydi"
              aria-label="Mahsulot qidirish"
              style={{ ...input, flex: '1 1 280px' }}
            />
            <select
              value={status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              aria-label="Holat bo‘yicha filtr"
              disabled={showDeleted}
              style={input}
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13.5,
                color: 'var(--alv-muted)',
                whiteSpace: 'nowrap',
              }}
            >
              <input
                type="checkbox"
                checked={showDeleted}
                onChange={(e) => setShowDeleted(e.target.checked)}
              />
              O‘chirilganlar
            </label>
          </div>
        }
      />
    </AdminShell>
  );
}
