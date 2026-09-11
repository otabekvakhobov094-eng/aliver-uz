'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Umumiy ro'yxat platformasi — TZ-2, 4.2-bo'lim.
 *
 * Bu komponent ataylab **bir marta** yoziladi va har bir ro'yxatga
 * qo'llaniladi. Har sahifada takrorlansa, saqlangan ko'rinish bir joyda
 * ishlab, boshqa joyda ishlamay qoladi va xodim qaysi ro'yxatda nima
 * borligini eslab yurishga majbur bo'ladi.
 *
 * Nima beradi:
 *   — saqlangan ko'rinishlar (filtr + ustunlar bitta tab ostida)
 *   — ustunlarni ko'rsatish/yashirish va tartibini o'zgartirish
 *   — ommaviy tanlash va yopishgan amal paneli
 *   — "yozuv yo'q" va "filtrga mos natija yo'q" — ikki xil bo'sh ekran
 *   — yuklanayotganda skelet qatorlar
 *
 * Ko'rinishlar hozircha brauzerda saqlanadi. Bu ongli cheklov: server
 * tomonida saqlash uchun yangi jadval va migratsiya kerak, va u
 * ko'rinishlarni xodimlar o'rtasida ULASHISH imkoniyati bilan birga
 * qilinishi kerak — aks holda ikki marta qayta yoziladi.
 */

export interface DataColumn<T> {
  key: string;
  label: string;
  render: (row: T) => React.ReactNode;
  /** Standart holatda ko'rinadimi. */
  defaultVisible?: boolean;
  /** Yashirib bo'lmaydigan ustun (masalan buyurtma raqami). */
  locked?: boolean;
  minWidth?: number;
  align?: 'left' | 'right';
}

export interface BulkAction {
  key: string;
  label: string;
  tone?: 'danger';
  /** Tasdiq so'raladimi va qanday matn bilan. */
  confirm?: (count: number) => string;
  /**
   * Natijada matn qaytarsa, u ro'yxat ustida ko'rsatiladi. Bu ommaviy
   * amallar uchun muhim: 40 tadan 3 tasi o'tmasa, "bajarildi" deyish
   * yolg'on bo'ladi — qaysi biri va nega o'tmagani ko'rinishi kerak.
   */
  run: (ids: string[]) => Promise<string | void | unknown>;
}

interface SavedView {
  id: string;
  name: string;
  filters: Record<string, unknown>;
  columns: string[];
}

interface Props<T> {
  /** Saqlash kaliti — ro'yxatga xos va barqaror bo'lishi kerak. */
  storageKey: string;
  columns: Array<DataColumn<T>>;
  rows: T[];
  rowKey: (row: T) => string;
  /** Joriy filtr holati — ko'rinish shu bilan birga saqlanadi. */
  filters: Record<string, unknown>;
  onFiltersChange: (next: Record<string, unknown>) => void;
  /** Filtr boshqaruvlari (tanlagichlar, qidiruv). */
  filterBar?: React.ReactNode;
  bulkActions?: BulkAction[];
  loading?: boolean;
  /** Hech qanday yozuv yo'q (filtrsiz ham). */
  emptyTitle: string;
  emptyHint?: string;
  /** Filtr natija bermadi. */
  noResultsTitle: string;
  onClearFilters?: () => void;
  onDone?: () => void | Promise<void>;
  /** Jadval ostidagi joy — odatda sahifalash. */
  footer?: React.ReactNode;
}

function readViews(key: string): SavedView[] {
  // localStorage maxfiy oynada va bloklangan holatda xato tashlaydi.
  try {
    const raw = window.localStorage.getItem(`alv.views.${key}`);
    return raw ? (JSON.parse(raw) as SavedView[]) : [];
  } catch {
    return [];
  }
}

function writeViews(key: string, views: SavedView[]): void {
  try {
    window.localStorage.setItem(`alv.views.${key}`, JSON.stringify(views));
  } catch {
    /* saqlash imkoni bo'lmasa ro'yxat baribir ishlayveradi */
  }
}

export function DataList<T>({
  storageKey,
  columns,
  rows,
  rowKey,
  filters,
  onFiltersChange,
  filterBar,
  bulkActions = [],
  loading = false,
  emptyTitle,
  emptyHint,
  noResultsTitle,
  onClearFilters,
  onDone,
  footer,
}: Props<T>) {
  const [views, setViews] = useState<SavedView[]>([]);
  const [activeView, setActiveView] = useState<string>('');
  const [order, setOrder] = useState<string[]>(() => columns.map((c) => c.key));
  const [visible, setVisible] = useState<Set<string>>(
    () => new Set(columns.filter((c) => c.defaultVisible !== false).map((c) => c.key)),
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showColumns, setShowColumns] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setViews(readViews(storageKey));
  }, [storageKey]);

  // Ro'yxat yangilanganda tanlov tozalanadi: ko'rinmaydigan qatorlar
  // ustidan amal bajarish eng xavfli xato.
  useEffect(() => {
    setSelected(new Set());
  }, [rows]);

  const ordered = useMemo(
    () =>
      order
        .map((k) => columns.find((c) => c.key === k))
        .filter((c): c is DataColumn<T> => Boolean(c) && visible.has(c!.key)),
    [order, columns, visible],
  );

  const hasFilters = useMemo(
    () => Object.values(filters).some((v) => v !== undefined && v !== '' && v !== null),
    [filters],
  );

  function applyView(view: SavedView) {
    setActiveView(view.id);
    setVisible(new Set(view.columns));
    onFiltersChange(view.filters);
  }

  function saveView() {
    const name = nameRef.current?.value.trim();
    if (!name) return;
    const view: SavedView = {
      id: `${Date.now()}`,
      name,
      filters,
      columns: [...visible],
    };
    const next = [...views, view];
    setViews(next);
    writeViews(storageKey, next);
    setActiveView(view.id);
    if (nameRef.current) nameRef.current.value = '';
  }

  function removeView(id: string) {
    const next = views.filter((v) => v.id !== id);
    setViews(next);
    writeViews(storageKey, next);
    if (activeView === id) setActiveView('');
  }

  function move(key: string, delta: number) {
    setOrder((prev) => {
      const i = prev.indexOf(key);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(i, 1);
      next.splice(j, 0, item as string);
      return next;
    });
  }

  const allIds = useMemo(() => rows.map(rowKey), [rows, rowKey]);
  const allSelected = allIds.length > 0 && selected.size === allIds.length;

  const runBulk = useCallback(
    async (action: BulkAction) => {
      const ids = [...selected];
      if (ids.length === 0) return;
      if (action.confirm && !window.confirm(action.confirm(ids.length))) return;
      setBusy(true);
      setError('');
      setNotice('');
      try {
        const result = await action.run(ids);
        if (typeof result === 'string' && result) setNotice(result);
        setSelected(new Set());
        await onDone?.();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [selected, onDone],
  );

  const th: React.CSSProperties = {
    textAlign: 'left',
    padding: '12px 16px',
    borderBottom: '1px solid var(--alv-line)',
    fontSize: 11,
    letterSpacing: '.1em',
    textTransform: 'uppercase',
    color: 'var(--alv-muted)',
    whiteSpace: 'nowrap',
  };
  const td: React.CSSProperties = {
    padding: '13px 16px',
    borderBottom: '1px solid var(--alv-line)',
    verticalAlign: 'top',
  };
  const chip = (on: boolean): React.CSSProperties => ({
    padding: '7px 14px',
    borderRadius: 999,
    border: '1px solid var(--alv-line)',
    background: on ? 'var(--alv-ink)' : 'var(--alv-surface)',
    color: on ? '#fff' : 'var(--alv-ink)',
    fontSize: 13.5,
    fontWeight: 600,
    cursor: 'pointer',
  });

  return (
    <div>
      {/* Saqlangan ko'rinishlar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <button type="button" onClick={() => setActiveView('')} style={chip(activeView === '')}>
          Hammasi
        </button>
        {views.map((v) => (
          <span key={v.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <button type="button" onClick={() => applyView(v)} style={chip(activeView === v.id)}>
              {v.name}
            </button>
            <button
              type="button"
              onClick={() => removeView(v.id)}
              aria-label={`${v.name} ko‘rinishini o‘chirish`}
              title="Ko‘rinishni o‘chirish"
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                border: '1px solid var(--alv-line)',
                background: 'transparent',
                color: 'var(--alv-muted)',
                cursor: 'pointer',
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </span>
        ))}
        <div style={{ flex: 1 }} />
        <button type="button" onClick={() => setShowColumns((v) => !v)} style={chip(showColumns)}>
          Ustunlar
        </button>
      </div>

      {filterBar ? <div style={{ marginBottom: 12 }}>{filterBar}</div> : null}

      {/* Saqlash maydoni faqat filtr qo'llanganda chiqadi: saqlash uchun
          hech narsa yo'q bo'lganda u shunchaki shovqin. */}
      {hasFilters ? (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        <input
          ref={nameRef}
          placeholder="Joriy filtrni ko‘rinish sifatida saqlash — nom bering"
          aria-label="Yangi ko‘rinish nomi"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              saveView();
            }
          }}
          style={{
            flex: '1 1 260px',
            padding: '8px 12px',
            borderRadius: 10,
            border: '1px solid var(--alv-line)',
            fontSize: 13.5,
            background: 'var(--alv-surface)',
            color: 'var(--alv-ink)',
          }}
        />
        <button
          type="button"
          onClick={saveView}
          style={{
            padding: '8px 18px',
            borderRadius: 10,
            border: '1px solid var(--alv-line)',
            background: 'transparent',
            color: 'var(--alv-ink)',
            fontWeight: 600,
            fontSize: 13.5,
            cursor: 'pointer',
          }}
        >
          Saqlash
        </button>
      </div>
      ) : null}

      {showColumns ? (
        <div className="alv-card" style={{ padding: 16, marginBottom: 14 }}>
          <strong style={{ fontSize: 14, display: 'block', marginBottom: 10 }}>
            Ustunlar — ko‘rinishi va tartibi
          </strong>
          <div style={{ display: 'grid', gap: 6 }}>
            {order.map((key, i) => {
              const col = columns.find((c) => c.key === key);
              if (!col) return null;
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="checkbox"
                    id={`col-${storageKey}-${key}`}
                    checked={visible.has(key)}
                    disabled={col.locked}
                    onChange={() =>
                      setVisible((prev) => {
                        const next = new Set(prev);
                        if (next.has(key)) next.delete(key);
                        else next.add(key);
                        return next;
                      })
                    }
                    style={{ width: 16, height: 16, accentColor: 'var(--alv-brand)' }}
                  />
                  <label htmlFor={`col-${storageKey}-${key}`} style={{ flex: 1, fontSize: 14 }}>
                    {col.label}
                    {col.locked ? (
                      <span style={{ color: 'var(--alv-muted)', fontSize: 12.5 }}> · doimiy</span>
                    ) : null}
                  </label>
                  <button
                    type="button"
                    onClick={() => move(key, -1)}
                    disabled={i === 0}
                    aria-label={`${col.label} ustunini yuqoriga`}
                    style={arrowBtn}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(key, 1)}
                    disabled={i === order.length - 1}
                    aria-label={`${col.label} ustunini pastga`}
                    style={arrowBtn}
                  >
                    ↓
                  </button>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              setOrder(columns.map((c) => c.key));
              setVisible(new Set(columns.filter((c) => c.defaultVisible !== false).map((c) => c.key)));
            }}
            style={{
              marginTop: 12,
              padding: '7px 16px',
              borderRadius: 9,
              border: '1px solid var(--alv-line)',
              background: 'transparent',
              color: 'var(--alv-ink)',
              cursor: 'pointer',
              fontSize: 13.5,
            }}
          >
            Dastlabki holatga qaytarish
          </button>
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="alv-card"
          style={{ padding: 14, marginBottom: 12, borderLeft: '3px solid var(--alv-danger)' }}
        >
          {error}
        </div>
      ) : null}
      {notice ? (
        <div
          role="status"
          className="alv-card"
          style={{ padding: 14, marginBottom: 12, borderLeft: '3px solid var(--alv-mint)' }}
        >
          {notice}
        </div>
      ) : null}

      {/* Ommaviy amal paneli — faqat tanlov bo'lganda */}
      {selected.size > 0 && bulkActions.length > 0 ? (
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 5,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            marginBottom: 12,
            background: 'var(--alv-ink)',
            color: '#fff',
            borderRadius: 12,
          }}
        >
          <strong style={{ fontSize: 14 }}>{selected.size} ta tanlandi</strong>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            style={{
              padding: '5px 12px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,.35)',
              background: 'transparent',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            Bekor qilish
          </button>
          <div style={{ flex: 1 }} />
          {bulkActions.map((a) => (
            <button
              key={a.key}
              type="button"
              disabled={busy}
              onClick={() => void runBulk(a)}
              style={{
                padding: '8px 18px',
                borderRadius: 9,
                border: 'none',
                background: a.tone === 'danger' ? 'var(--alv-danger)' : 'var(--alv-brand)',
                color: '#fff',
                fontWeight: 600,
                fontSize: 13.5,
                cursor: busy ? 'wait' : 'pointer',
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="alv-card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: 640, borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr>
              {bulkActions.length > 0 ? (
                <th style={{ ...th, width: 44 }}>
                  <input
                    type="checkbox"
                    aria-label="Hammasini tanlash"
                    checked={allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(allIds))}
                    style={{ width: 16, height: 16, accentColor: 'var(--alv-brand)' }}
                  />
                </th>
              ) : null}
              {ordered.map((c) => (
                <th key={c.key} style={{ ...th, textAlign: c.align ?? 'left', minWidth: c.minWidth }}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? // Spinner emas, skelet: qatorlarning kelishi ko'rinib turadi
                // va jadval balandligi sakramaydi.
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`sk-${i}`}>
                    {bulkActions.length > 0 ? <td style={td} /> : null}
                    {ordered.map((c) => (
                      <td key={c.key} style={td}>
                        <span
                          style={{
                            display: 'block',
                            height: 12,
                            borderRadius: 6,
                            background: 'var(--alv-line)',
                            width: `${50 + ((i * 13 + c.key.length * 7) % 40)}%`,
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              : rows.map((row) => {
                  const id = rowKey(row);
                  const on = selected.has(id);
                  return (
                    <tr key={id} style={on ? { background: 'var(--alv-brand-soft)' } : undefined}>
                      {bulkActions.length > 0 ? (
                        <td style={td}>
                          <input
                            type="checkbox"
                            aria-label="Qatorni tanlash"
                            checked={on}
                            onChange={() =>
                              setSelected((prev) => {
                                const next = new Set(prev);
                                if (next.has(id)) next.delete(id);
                                else next.add(id);
                                return next;
                              })
                            }
                            style={{ width: 16, height: 16, accentColor: 'var(--alv-brand)' }}
                          />
                        </td>
                      ) : null}
                      {ordered.map((c) => (
                        <td key={c.key} style={{ ...td, textAlign: c.align ?? 'left' }}>
                          {c.render(row)}
                        </td>
                      ))}
                    </tr>
                  );
                })}

            {!loading && rows.length === 0 ? (
              <tr>
                <td
                  colSpan={ordered.length + (bulkActions.length > 0 ? 1 : 0)}
                  style={{ padding: 40, textAlign: 'center' }}
                >
                  {/* Ikki xil bo'sh holat — ular turli ish talab qiladi:
                      birinchisida yozuv yaratish kerak, ikkinchisida
                      filtrni tozalash. Bitta matn ikkalasiga ham
                      yaramaydi. */}
                  {hasFilters ? (
                    <>
                      <strong style={{ display: 'block', marginBottom: 8 }}>{noResultsTitle}</strong>
                      {onClearFilters ? (
                        <button
                          type="button"
                          onClick={onClearFilters}
                          style={{
                            padding: '8px 18px',
                            borderRadius: 10,
                            border: '1px solid var(--alv-line)',
                            background: 'transparent',
                            color: 'var(--alv-ink)',
                            cursor: 'pointer',
                          }}
                        >
                          Filtrni tozalash
                        </button>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <strong style={{ display: 'block', marginBottom: 6 }}>{emptyTitle}</strong>
                      {emptyHint ? (
                        <span style={{ color: 'var(--alv-muted)', fontSize: 14 }}>{emptyHint}</span>
                      ) : null}
                    </>
                  )}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {footer ? <div style={{ marginTop: 14 }}>{footer}</div> : null}
    </div>
  );
}

const arrowBtn: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 8,
  border: '1px solid var(--alv-line)',
  background: 'transparent',
  color: 'var(--alv-ink)',
  cursor: 'pointer',
  lineHeight: 1,
};
