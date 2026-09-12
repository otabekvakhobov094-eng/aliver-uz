'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { t } from '@/lib/i18n';
import { Badge, Button } from '@aliver/ui';
import { AdminShell } from '@/components/AdminShell';
import { DataList, type BulkAction, type DataColumn } from '@/components/DataList';
import {
  adminApi,
  type LowStockRow,
  type StockImportResult,
  type StockMovement,
} from '@/lib/api';
import { fmtDateTime } from '@/lib/order-labels';

const REASONS = [
  { value: 'PURCHASE_IN', label: 'Kirim (yetkazib beruvchidan)' },
  { value: 'ADJUSTMENT', label: 'Inventarizatsiya tuzatishi' },
  { value: 'LOSS', label: 'Yo‘qotish / buzilish' },
];

const MOVEMENT_LABEL: Record<string, string> = {
  PURCHASE_IN: 'Kirim',
  ORDER_SHIP: 'Jo‘natildi',
  RETURN_IN: 'Qaytarildi',
  RETURN_SCRAP: 'Qaytarildi (yaroqsiz)',
  ADJUSTMENT: 'Tuzatish',
  LOSS: 'Yo‘qotish',
  TRANSFER_IN: 'Ombordan kirim',
  TRANSFER_OUT: 'Omborga chiqim',
};

/**
 * Ombor.
 *
 * Ikki narsani ko'rsatadi: qoldig'i kam mahsulotlar va tanlangan variant
 * bo'yicha harakatlar jurnali. Qoldiq faqat harakat orqali o'zgaradi —
 * "shunchaki sonni tahrirlash" imkoni ataylab yo'q (ekspertiza A-6).
 */
/**
 * Ro'yxat ustunlari.
 *
 * Ombor ro'yxati platformaga eng oxirida o'tkazildi, chunki avval
 * uning ommaviy amali nimaligini bilish kerak edi. Qoldiqni O'ZINI
 * ommaviy o'zgartirish MA'NOSIZ: turli SKU ni bir xil songa surish
 * hech qanday haqiqiy amalga mos kelmaydi va har bir o'zgarish sababi
 * bilan jurnalga yozilishi shart.
 *
 * Ma'noli ommaviy amal — kam qoldiq OSTONASI. U sukut bo'yicha hamma
 * uchun 10, amalda esa mahsulotlar turlicha aylanadi va ostonani
 * 500 ta SKU da bittalab to'g'rilab bo'lmaydi.
 */
const COLUMNS: Array<DataColumn<LowStockRow>> = [
  {
    key: 'product',
    label: 'Mahsulot',
    locked: true,
    minWidth: 220,
    render: (r) => (
      <>
        <div style={{ fontWeight: 600 }}>{r.productName}</div>
        <div style={{ fontSize: 12, color: 'var(--alv-muted)' }}>
          {[Object.values(r.options ?? {}).join(' / '), r.sku].filter(Boolean).join(' · ')}
        </div>
      </>
    ),
  },
  {
    key: 'available',
    label: 'Mavjud',
    align: 'right',
    render: (r) => <Badge tone={r.available === 0 ? 'low' : 'neutral'}>{r.available}</Badge>,
  },
  {
    key: 'threshold',
    label: 'Chegara',
    align: 'right',
    render: (r) => <span style={{ color: 'var(--alv-muted)' }}>{r.threshold}</span>,
  },
  {
    key: 'sku',
    label: 'SKU',
    defaultVisible: false,
    render: (r) => <code style={{ fontSize: 12 }}>{r.sku}</code>,
  },
];

const EMPTY_FILTERS = { q: '', onlyZero: '' };

export default function InventoryPage() {
  const [stockFile, setStockFile] = useState<File | null>(null);
  const [stockResult, setStockResult] = useState<StockImportResult | null>(null);
  const [stockBusy, setStockBusy] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);

  const [filters, setFilters] = useState<Record<string, unknown>>(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<LowStockRow[]>([]);
  const [selected, setSelected] = useState<LowStockRow | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState(REASONS[0]!.value);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await adminApi.lowStock());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const open = async (row: LowStockRow) => {
    setSelected(row);
    setDelta('');
    setComment('');
    setNotice(null);
    setMovements(await adminApi.stockMovements(row.variantId).catch(() => []));
  };

  const submit = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await adminApi.adjustStock(selected.variantId, Number(delta), reason, comment.trim());
      setNotice('Qoldiq yangilandi va harakatlar jurnaliga yozildi.');
      setDelta('');
      setComment('');
      setMovements(await adminApi.stockMovements(selected.variantId));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Qoldiqni o‘zgartirib bo‘lmadi');
    } finally {
      setBusy(false);
    }
  };

  const expire = async () => {
    setBusy(true);
    try {
      const res = await adminApi.expireReservations();
      setNotice(
        `Tekshirildi: ${res.checked} ta buyurtma, ${res.cancelled} tasi bekor qilinib rezervi bo‘shatildi.`,
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xatolik');
    } finally {
      setBusy(false);
    }
  };

  /**
   * Ro'yxat serverdan to'liq keladi (500 tagacha), shuning uchun filtr
   * mijozda: qo'shimcha so'rov yubormaydi va darhol ishlaydi.
   */
  const shown = useMemo(() => {
    const f = filters as Record<string, string>;
    const needle = (f.q ?? '').trim().toLowerCase();
    return rows.filter((r) => {
      if (f.onlyZero === 'yes' && r.available !== 0) return false;
      if (!needle) return true;
      return (
        r.productName.toLowerCase().includes(needle) || r.sku.toLowerCase().includes(needle)
      );
    });
  }, [rows, filters]);

  const bulkActions: BulkAction[] = useMemo(
    () => [
      {
        key: 'threshold',
        label: 'Chegarani o‘zgartirish',
        run: async (ids) => {
          const raw = window.prompt('Yangi kam qoldiq chegarasi (0 dan katta yoki teng):')?.trim();
          if (raw === undefined || raw === '') return 'Chegara kiritilmadi.';
          const value = Number(raw);
          if (!Number.isInteger(value) || value < 0) return 'Chegara butun va manfiy bo‘lmagan son bo‘lishi kerak.';
          const res = await adminApi.bulkThreshold(ids, value);
          // Farqni yashirmaymiz: ba'zi variantda ombor yozuvi bo'lmasligi
          // mumkin va operator 10 tadan 7 tasi o'zgarganini bilishi kerak.
          if (res.updated === res.requested) {
            return `${res.updated} ta variant chegarasi ${res.threshold} ga o‘zgartirildi.`;
          }
          return (
            `${res.updated} ta variant o‘zgartirildi (${res.requested} tadan). ` +
            'Qolganlarida ombor yozuvi topilmadi.'
          );
        },
      },
    ],
    [],
  );

  const canSubmit =
    !busy &&
    selected !== null &&
    Number(delta) !== 0 &&
    !Number.isNaN(Number(delta)) &&
    comment.trim().length >= 3;

  return (
    <AdminShell title={t("Ombor")}>
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: 18,
        }}
      >
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--alv-muted)', flexGrow: 1 }}>
          {t("Qoldig‘i chegaradan past mahsulotlar")}
          {rows.length > 0 ? (
            <>
              {' — '}
              <b style={{ color: 'var(--alv-ink)' }}>{rows.length} {t("ta")}</b>
              {rows.length >= 500 ? t(" (birinchi 500 tasi)") : ''}
            </>
          ) : null}
          {t(". Qoldiq faqat harakat orqali o‘zgaradi.")}
        </p>
        <Button variant="outline" disabled={busy} onClick={() => void expire()}>
          {t("Muddati o‘tgan rezervlarni bo‘shatish")}
        </Button>
      </div>

      {/*
        FAYLDAN QOLDIQ KIRITISH.
        556 ta mahsulotga qoldiqni bittalab kiritib bo'lmaydi: xodim
        buni boshlaydi va tashlab yuboradi, katalog esa «Tugagan»
        bo'lib qolaveradi. Shuning uchun fayl — yagona amaldagi yo'l.
      */}
      <section
        className="alv-card"
        style={{ padding: 18, marginBottom: 18, display: 'grid', gap: 12 }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 16 }}>{t("Fayldan qoldiq kiritish")}</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--alv-muted)', maxWidth: '72ch' }}>
            {t("CSV fayl:")} <code>SKU</code> {t("va")} <code>{t("Qoldiq")}</code> {t("ustunlari. Ma’no —")}{' '}
            <b>{t("«shu son bo‘lsin»")}</b>{t(", qo‘shish emas: faylni ikki marta yuklasangiz qoldiq ikki barobar bo‘lib ketmaydi. Har bir o‘zgarish ombor harakati sifatida yoziladi.")}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <label className="alv-btn alv-btn--outline alv-btn--md" style={{ cursor: 'pointer' }}>
            {stockFile ? stockFile.name : t("Fayl tanlash")}
            <input
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                // Maydon tozalanadi: bir xil faylni qayta tanlash
                // mumkin bo'lishi kerak, aks holda `change` hodisasi
                // ikkinchi marta umuman kelmaydi.
                e.target.value = '';
                setStockFile(f);
                setStockResult(null);
                setStockError(null);
              }}
            />
          </label>

          <Button
            variant="outline"
            disabled={!stockFile || stockBusy}
            onClick={() => {
              if (!stockFile) return;
              setStockBusy(true);
              setStockError(null);
              void adminApi
                .bulkStock(stockFile, { dryRun: true })
                .then(setStockResult)
                .catch((e: unknown) => setStockError(e instanceof Error ? e.message : 'Xatolik'))
                .finally(() => setStockBusy(false));
            }}
          >
            {stockBusy ? t("Tekshirilmoqda…") : t("Ko‘rib chiqish")}
          </Button>

          {/* Yozish tugmasi FAQAT ko'rib chiqilgandan keyin ochiladi:
              omborni ko'rmasdan o'zgartirish eng qimmat xato. */}
          <Button
            variant="primary"
            disabled={!stockFile || stockBusy || !stockResult?.dryRun || stockResult.updated === 0}
            onClick={() => {
              if (!stockFile) return;
              if (!window.confirm(`${stockResult?.updated ?? 0} ta variantda qoldiq o‘zgartiriladi. Davom etamizmi?`))
                return;
              setStockBusy(true);
              setStockError(null);
              void adminApi
                .bulkStock(stockFile, { dryRun: false })
                .then((res) => {
                  setStockResult(res);
                  void load();
                })
                .catch((e: unknown) => setStockError(e instanceof Error ? e.message : 'Xatolik'))
                .finally(() => setStockBusy(false));
            }}
          >
            {t("Yozish")}
          </Button>
        </div>

        {stockError ? (
          <p role="alert" style={{ margin: 0, color: 'var(--alv-danger)', fontSize: 13.5 }}>
            {stockError}
          </p>
        ) : null}

        {stockResult ? (
          <div style={{ fontSize: 13.5, lineHeight: 1.7 }}>
            <b>
              {stockResult.dryRun
                ? `Ko‘rib chiqish: ${stockResult.updated} ta o‘zgaradi`
                : `Yozildi: ${stockResult.updated} ta variant`}
            </b>
            {stockResult.unchanged > 0 ? `, ${stockResult.unchanged} tasi o‘zgarishsiz` : ''}
            {stockResult.parse ? ` — faylda ${stockResult.parse.total} qator` : ''}

            {stockResult.changes.length > 0 ? (
              <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                {stockResult.changes.slice(0, 12).map((c) => (
                  <li key={c.sku}>
                    <code>{c.sku}</code>: {c.from} → <b>{c.to}</b>
                  </li>
                ))}
                {stockResult.changes.length > 12 ? (
                  <li style={{ color: 'var(--alv-muted)' }}>
                    {t("va yana")} {stockResult.changes.length - 12} {t("ta")}
                  </li>
                ) : null}
              </ul>
            ) : null}

            {stockResult.unknownSkus.length > 0 ? (
              <p style={{ margin: '8px 0 0', color: 'var(--alv-warn)' }}>
                {t("Topilmadi yoki o‘tkazib yuborildi:")} {stockResult.unknownSkus.slice(0, 8).join(', ')}
                {stockResult.unknownSkus.length > 8
                  ? ` va yana ${stockResult.unknownSkus.length - 8} ta`
                  : ''}
              </p>
            ) : null}

            {stockResult.parse && stockResult.parse.problems.length > 0 ? (
              <ul style={{ margin: '8px 0 0', paddingLeft: 18, color: 'var(--alv-warn)' }}>
                {stockResult.parse.problems.slice(0, 6).map((p) => (
                  <li key={p.line}>
                    {p.line}{t("-qator:")} {p.reason}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </section>

      {error ? (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            borderRadius: 14,
            background: 'var(--alv-danger-soft)',
            color: 'var(--alv-danger)',
            fontWeight: 600,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      ) : null}

      {notice ? (
        <div
          role="status"
          style={{
            padding: '12px 16px',
            borderRadius: 14,
            background: 'var(--alv-mint-soft)',
            color: 'var(--alv-mint)',
            fontWeight: 600,
            marginBottom: 16,
          }}
        >
          {notice}
        </div>
      ) : null}

      <div className="alv-admin-cols">
        <div>
          <DataList<LowStockRow>
            storageKey="inventory"
            columns={COLUMNS}
            rows={shown}
            rowKey={(r) => r.variantId}
            filters={filters}
            onFiltersChange={setFilters}
            loading={loading}
            bulkActions={bulkActions}
            onDone={load}
            onClearFilters={() => setFilters(EMPTY_FILTERS)}
            onRowClick={(r) => void open(r)}
            emptyTitle={t("Qoldig‘i kam mahsulot yo‘q")}
            emptyHint={t("Hammasi chegaradan yuqori — bu yaxshi xabar.")}
            noResultsTitle={t("Bu shartlarga mos mahsulot topilmadi")}
            filterBar={
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                <input
                  type="search"
                  value={(filters as Record<string, string>).q ?? ''}
                  onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                  placeholder={t("Mahsulot nomi yoki SKU")}
                  aria-label={t("Ombor qidirish")}
                  style={{ ...field, minHeight: 38, flex: '1 1 220px', maxWidth: 320 }}
                />
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13.5 }}>
                  <input
                    type="checkbox"
                    checked={(filters as Record<string, string>).onlyZero === 'yes'}
                    onChange={(e) =>
                      setFilters({ ...filters, onlyZero: e.target.checked ? 'yes' : '' })
                    }
                  />
                  {t("Faqat tugaganlari")}
                </label>
              </div>
            }
          />
        </div>

        <section
          style={{
            background: 'var(--alv-surface)',
            borderRadius: 'var(--alv-radius-lg)',
            padding: 18,
            boxShadow: 'var(--alv-shadow-sm)',
            display: 'grid',
            gap: 12,
          }}
        >
          <h2 style={{ fontFamily: 'var(--alv-font-display)', fontSize: 16, margin: 0 }}>
            {selected ? selected.productName : t("Variantni tanlang")}
          </h2>

          {selected ? (
            <>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--alv-ink-2)' }}>
                  {t("O‘zgarish (musbat — kirim, manfiy — chiqim)")}
                </span>
                <input
                  value={delta}
                  onChange={(e) => setDelta(e.target.value.replace(/[^\d-]/g, ''))}
                  inputMode="numeric"
                  placeholder="+20"
                  style={field}
                />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--alv-ink-2)' }}>
                  {t("Sabab")}
                </span>
                <select value={reason} onChange={(e) => setReason(e.target.value)} style={field}>
                  {REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {t(r.label)}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--alv-ink-2)' }}>
                  {t("Izoh (majburiy, kamida 3 belgi)")}
                </span>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={2}
                  placeholder={t("Masalan: 12.09 sanadagi yetkazib berish, hujjat №442")}
                  style={{ ...field, resize: 'vertical' }}
                />
              </label>

              <Button variant="primary" disabled={!canSubmit} onClick={() => void submit()}>
                {t("Qoldiqni o‘zgartirish")}
              </Button>

              <div style={{ height: 1, background: 'var(--alv-line)' }} />

              <h3 style={{ fontSize: 14, margin: 0 }}>{t("Harakatlar jurnali")}</h3>
              {movements.length === 0 ? (
                <p style={{ color: 'var(--alv-muted)', fontSize: 13.5, margin: 0 }}>
                  {t("Harakatlar yo‘q.")}
                </p>
              ) : (
                <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
                  {movements.map((m) => (
                    <li key={m.id} style={{ fontSize: 13 }}>
                      <div style={{ fontWeight: 700 }}>
                        {m.delta > 0 ? `+${m.delta}` : m.delta} ·{' '}
                        {t(MOVEMENT_LABEL[m.reason] ?? m.reason)}
                      </div>
                      <div style={{ color: 'var(--alv-muted)', fontSize: 12.5 }}>
                        {fmtDateTime(m.createdAt)}
                        {m.admin ? ` · ${m.admin.fullName}` : ''}
                        {m.comment ? ` · ${m.comment}` : ''}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </>
          ) : (
            <p style={{ color: 'var(--alv-muted)', fontSize: 13.5, margin: 0 }}>
              {t("Chapdagi ro‘yxatdan mahsulotni tanlang — qoldiqni o‘zgartirish va harakatlar jurnali shu yerda ochiladi.")}
            </p>
          )}
        </section>
      </div>
    </AdminShell>
  );
}

const field: React.CSSProperties = {
  width: '100%',
  minHeight: 44,
  padding: '10px 12px',
  borderRadius: 12,
  border: 0,
  boxShadow: 'inset 0 0 0 1.5px var(--alv-line-2)',
  font: 'inherit',
  background: 'var(--alv-surface)',
};
