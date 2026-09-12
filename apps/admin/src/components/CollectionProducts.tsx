'use client';

import { useCallback, useEffect, useState } from 'react';
import { t } from '@/lib/i18n';
import {
  adminApi,
  type AdminCollection,
  type AdminCollectionProduct,
  type AdminProduct,
} from '@/lib/api';

/**
 * Kolleksiya tarkibi.
 *
 * NEGA KERAK. Kolleksiya yaratish bor edi, mahsulot biriktirish esa
 * yo'q: xodim «Yangi kelganlar» ni yaratardi va u BO'SH qolardi.
 * Saytda esa bu bo'sh sahifa bo'lib chiqardi — xato bermay, shunchaki
 * hech narsa ko'rsatmay. Menyudagi bandlar aynan shu kolleksiyalarga
 * qarab turadi.
 *
 * Server tarkibni TO'LIQ almashtiradi, shuning uchun bu yerda avval
 * hozirgi ro'yxat yuklanadi va faqat «Saqlash» bosilganda yuboriladi.
 * Bo'shatish ataylab ikki bosqichli: bitta tasodifiy bosish butun
 * kolleksiyani yo'q qilmasligi kerak.
 */

const btn: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 8,
  border: '1px solid var(--alv-line)',
  background: 'transparent',
  color: 'var(--alv-ink)',
  cursor: 'pointer',
  fontSize: 13,
};

const row: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 0',
  borderBottom: '1px solid var(--alv-line)',
};

export function CollectionProducts({
  collection,
  onClose,
  onSaved,
}: {
  collection: AdminCollection;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [chosen, setChosen] = useState<AdminCollectionProduct[]>([]);
  const [found, setFound] = useState<AdminProduct[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    adminApi
      .collectionProducts(collection.id)
      .then((rows) => {
        if (alive) setChosen(rows);
      })
      .catch((e: Error) => {
        if (alive) setError(e.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [collection.id]);

  const search = useCallback(async (q: string) => {
    setError('');
    try {
      const res = await adminApi.products({ q: q.trim() || undefined, page: 1 });
      setFound(res.items);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  // Panel ochilganda ham qidiruv ishlaydi: bo'sh so'rov oxirgi
  // o'zgartirilgan mahsulotlarni beradi va qo'shish darrov mumkin.
  useEffect(() => {
    void search('');
  }, [search]);

  const has = (id: string) => chosen.some((p) => p.id === id);

  function add(p: AdminProduct) {
    if (has(p.id)) return;
    setConfirmEmpty(false);
    setChosen((list) => [
      ...list,
      { id: p.id, slug: p.slug, nameUz: p.nameUz, status: p.status, imageUrl: p.imageUrl },
    ]);
  }

  function move(index: number, by: number) {
    setChosen((list) => {
      const next = [...list];
      const to = index + by;
      if (to < 0 || to >= next.length) return list;
      [next[index], next[to]] = [next[to]!, next[index]!];
      return next;
    });
  }

  async function save() {
    if (chosen.length === 0 && !confirmEmpty) {
      setConfirmEmpty(true);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await adminApi.setCollectionProducts(
        collection.id,
        chosen.map((p) => p.id),
      );
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="alv-card" style={{ padding: 20, marginBottom: 22, display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <strong>«{collection.nameUz}{t("» tarkibi")}</strong>
        <span style={{ color: 'var(--alv-muted)', fontSize: 13 }}>
          {chosen.length} {t("ta mahsulot · tartib saytda shu ketma-ketlikda ko‘rinadi")}
        </span>
        <div style={{ flex: 1 }} />
        <button type="button" style={btn} onClick={onClose}>
          {t("Yopish")}
        </button>
      </div>

      {error ? (
        <div role="alert" style={{ color: 'var(--alv-danger,#C0392B)', fontSize: 13 }}>
          {error}
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 22 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--alv-muted)', marginBottom: 6 }}>
            {t("Kolleksiyada")}
          </div>
          {loading ? (
            <p style={{ color: 'var(--alv-muted)', fontSize: 13 }}>{t("Yuklanmoqda…")}</p>
          ) : chosen.length === 0 ? (
            <p style={{ color: 'var(--alv-muted)', fontSize: 13 }}>
              {t("Bo‘sh. Bo‘sh kolleksiya saytda bo‘sh sahifa bo‘lib ko‘rinadi.")}
            </p>
          ) : (
            chosen.map((p, i) => (
              <div key={p.id} style={row}>
                <span style={{ color: 'var(--alv-muted)', fontSize: 12, width: 22, fontVariantNumeric: 'tabular-nums' }}>
                  {i + 1}
                </span>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.nameUz}
                  {p.status !== 'ACTIVE' ? (
                    <span style={{ color: 'var(--alv-muted)', fontSize: 12 }}> · {p.status}</span>
                  ) : null}
                </span>
                <button type="button" style={btn} aria-label={t("Yuqoriga")} onClick={() => move(i, -1)}>
                  ↑
                </button>
                <button type="button" style={btn} aria-label={t("Pastga")} onClick={() => move(i, 1)}>
                  ↓
                </button>
                <button
                  type="button"
                  style={btn}
                  aria-label={t("Chiqarish")}
                  onClick={() => {
                    setChosen((list) => list.filter((x) => x.id !== p.id));
                  }}
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>

        <div>
          <div style={{ fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--alv-muted)', marginBottom: 6 }}>
            {t("Qo‘shish")}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void search(query);
            }}
            style={{ display: 'flex', gap: 8, marginBottom: 8 }}
          >
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("Mahsulot nomi")}
              style={{
                flex: 1,
                minWidth: 0,
                padding: '8px 12px',
                borderRadius: 10,
                border: '1px solid var(--alv-line)',
                background: 'var(--alv-surface)',
                color: 'var(--alv-ink)',
                fontSize: 14,
              }}
            />
            <button type="submit" style={btn}>
              {t("Qidirish")}
            </button>
          </form>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {found.map((p) => (
              <div key={p.id} style={row}>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.nameUz}
                </span>
                <button type="button" style={btn} disabled={has(p.id)} onClick={() => add(p)}>
                  {has(p.id) ? t("Bor") : t("+ Qo‘shish")}
                </button>
              </div>
            ))}
            {found.length === 0 ? (
              <p style={{ color: 'var(--alv-muted)', fontSize: 13 }}>{t("Topilmadi")}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          disabled={busy || loading}
          onClick={() => void save()}
          style={{
            padding: '10px 22px',
            borderRadius: 10,
            border: 'none',
            background: confirmEmpty ? 'var(--alv-danger,#C0392B)' : 'var(--alv-ink)',
            color: '#fff',
            fontWeight: 600,
            cursor: busy ? 'wait' : 'pointer',
          }}
        >
          {confirmEmpty ? t("Ha, tarkibni bo‘shatish") : t("Saqlash")}
        </button>
        {confirmEmpty ? (
          <span style={{ color: 'var(--alv-danger,#C0392B)', fontSize: 13 }}>
            {t("Ro‘yxat bo‘sh — saqlansa kolleksiyadagi barcha mahsulot chiqarib tashlanadi.")}
          </span>
        ) : null}
      </div>
    </div>
  );
}
