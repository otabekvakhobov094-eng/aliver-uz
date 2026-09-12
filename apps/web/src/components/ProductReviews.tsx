'use client';

import { useCallback, useEffect, useState } from 'react';
import { fmtDate } from '@/lib/format-date';
import { Rating } from '@aliver/ui';
import type { Locale } from '@/i18n/messages';

/**
 * Mahsulot sharhlari — TZ 51, TZ-3.
 *
 * Bu blok butunlay yangi: saytda sharhlar UMUMAN ko'rsatilmasdi,
 * faqat umumiy reyting raqami turardi. Adminkada moderatsiya bor edi,
 * ya'ni tizim bir uchi ulanmagan holda ishlab turgandi.
 *
 * «Menga o'xshaganlar» filtri (TZ-3) shu yerda birga quriladi va
 * fasetlar BARCHA sharhlardan sanaladi: «quruq teri» ni tanlagach
 * qolgan filtrlar nolga tushib qolmasligi kerak, aks holda mijoz
 * filtrni almashtira olmay qoladi.
 */

interface Bucket {
  value: string;
  count: number;
}
interface Summary {
  count: number;
  avg: number;
  stars: Record<string, number>;
  skin: Bucket[];
  hair: Bucket[];
  age: Bucket[];
  withPhoto: number;
  verified: number;
}
interface Item {
  id: string;
  rating: number;
  body: string | null;
  mediaUrls: string[];
  isVerified: boolean;
  adminReply: string | null;
  createdAt: string;
  skinType: string | null;
  hairType: string | null;
  ageBand: string | null;
  source?: 'SITE' | 'UZUM' | 'IMPORT';
  author: string;
}
type LabelMap = Record<string, { uz: string; ru: string }>;
interface Response {
  summary: Summary;
  total: number;
  page: number;
  perPage: number;
  labels: { skin: LabelMap; hair: LabelMap; age: LabelMap };
  items: Item[];
}

const T = {
  title: { uz: 'Sharhlar', ru: 'Отзывы' },
  none: { uz: 'Bu mahsulotga hali sharh yo‘q.', ru: 'Пока нет отзывов.' },
  noneHint: {
    uz: 'Birinchi bo‘lib yozing — buyurtmangiz yetkazilgach sharh qoldirish mumkin.',
    ru: 'Будьте первым — отзыв можно оставить после доставки заказа.',
  },
  noMatch: { uz: 'Bu shartlarga mos sharh topilmadi.', ru: 'Нет отзывов по этим условиям.' },
  clear: { uz: 'Filtrlarni tozalash', ru: 'Сбросить фильтры' },
  likeMe: { uz: 'Menga o‘xshaganlar', ru: 'Похожие на меня' },
  withPhoto: { uz: 'Rasm bilan', ru: 'С фото' },
  verified: { uz: 'Tasdiqlangan xarid', ru: 'Подтверждённая покупка' },
  more: { uz: 'Yana ko‘rsatish', ru: 'Показать ещё' },
  loading: { uz: 'Yuklanmoqda…', ru: 'Загрузка…' },
  failed: { uz: 'Sharhlarni yuklab bo‘lmadi.', ru: 'Не удалось загрузить отзывы.' },
  retry: { uz: 'Qayta urinish', ru: 'Повторить' },
  of: { uz: 'ta sharh', ru: 'отзывов' },
  reply: { uz: 'ALIVER javobi', ru: 'Ответ ALIVER' },
  fromUzum: { uz: 'Uzum’dagi do‘konimizdan', ru: 'Из нашего магазина на Uzum' },
};

interface Props {
  slug: string;
  locale: Locale;
  /**
   * Mijoz profilidagi atributlar. Berilgan bo'lsa «Menga o'xshaganlar»
   * tugmasi paydo bo'ladi — u aynan shu qiymatlarni filtrga qo'yadi.
   */
  me?: { skinType?: string | null; hairType?: string | null; ageBand?: string | null };
}

export function ProductReviews({ slug, locale, me }: Props) {
  const ru = locale === 'ru';
  const t = (k: keyof typeof T) => (ru ? T[k].ru : T[k].uz);

  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [page, setPage] = useState(1);
  const [f, setF] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const qs = new URLSearchParams({ page: String(page) });
      for (const [k, v] of Object.entries(f)) if (v) qs.set(k, v);
      const res = await fetch(`/api/catalog/reviews/${encodeURIComponent(slug)}?${qs}`);
      if (!res.ok) throw new Error(String(res.status));
      setData((await res.json()) as Response);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [slug, page, f]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggle(key: string, value: string) {
    setPage(1);
    setF((prev) => ({ ...prev, [key]: prev[key] === value ? '' : value }));
  }

  const active = Object.values(f).some(Boolean);

  /** Profil atributlarini bir bosishda filtrga qo'yadi. */
  function applyLikeMe() {
    setPage(1);
    setF({
      skinType: me?.skinType ?? '',
      hairType: me?.hairType ?? '',
      ageBand: me?.ageBand ?? '',
    });
  }

  const hasProfile = Boolean(me?.skinType || me?.hairType || me?.ageBand);

  if (failed) {
    return (
      <section style={{ marginTop: 48 }}>
        <h2 className="alv-h2">{t('title')}</h2>
        <p style={{ color: 'var(--alv-ink-2)' }}>{t('failed')}</p>
        <button type="button" onClick={() => void load()} style={ghost}>
          {t('retry')}
        </button>
      </section>
    );
  }

  if (loading && !data) {
    return (
      <section style={{ marginTop: 48 }}>
        <h2 className="alv-h2">{t('title')}</h2>
        <p style={{ color: 'var(--alv-muted)' }}>{t('loading')}</p>
      </section>
    );
  }

  if (!data) return null;

  const s = data.summary;

  // Umuman sharh yo'q — filtrdan bo'lgan bo'shlik bilan aralashtirilmaydi.
  if (s.count === 0) {
    return (
      <section style={{ marginTop: 48 }}>
        <h2 className="alv-h2" style={{ marginBottom: 10 }}>
          {t('title')}
        </h2>
        <div className="alv-card" style={{ padding: 24 }}>
          <strong style={{ display: 'block', marginBottom: 6 }}>{t('none')}</strong>
          <span style={{ color: 'var(--alv-ink-2)', fontSize: 14.5 }}>{t('noneHint')}</span>
        </div>
      </section>
    );
  }

  const label = (map: LabelMap, key: string) => (ru ? map[key]?.ru : map[key]?.uz) ?? key;

  return (
    <section style={{ marginTop: 48 }}>
      <h2 className="alv-h2" style={{ marginBottom: 16 }}>
        {t('title')}
      </h2>

      {/* Xulosa */}
      <div
        className="alv-card"
        style={{
          padding: 20,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 24,
          marginBottom: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 40, fontWeight: 700, lineHeight: 1.1 }}>
            {s.avg.toFixed(1)}
          </div>
          <Rating value={s.avg} count={s.count} size={15} />
          <div style={{ marginTop: 8, fontSize: 13.5, color: 'var(--alv-ink-2)' }}>
            {s.verified} · {t('verified')}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 5, alignContent: 'center' }}>
          {[5, 4, 3, 2, 1].map((star) => {
            const n = Number(s.stars[String(star)] ?? 0);
            const pct = s.count === 0 ? 0 : Math.round((n / s.count) * 100);
            const on = f.rating === String(star);
            return (
              <button
                key={star}
                type="button"
                onClick={() => toggle('rating', String(star))}
                aria-pressed={on}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '28px 1fr 34px',
                  gap: 8,
                  alignItems: 'center',
                  background: 'none',
                  border: 'none',
                  padding: '2px 0',
                  cursor: 'pointer',
                  font: 'inherit',
                  color: 'inherit',
                  textAlign: 'left',
                  opacity: n === 0 ? 0.45 : 1,
                }}
              >
                <span style={{ fontSize: 13 }}>{star}★</span>
                <span
                  style={{
                    height: 7,
                    borderRadius: 4,
                    background: 'var(--alv-line)',
                    overflow: 'hidden',
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      width: `${pct}%`,
                      height: '100%',
                      background: on ? 'var(--alv-brand)' : 'var(--alv-gold)',
                    }}
                  />
                </span>
                <span
                  style={{
                    fontSize: 12.5,
                    color: 'var(--alv-muted)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {n}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fasetlar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {hasProfile ? (
          <button type="button" onClick={applyLikeMe} style={{ ...chip(false), fontWeight: 700 }}>
            ✦ {t('likeMe')}
          </button>
        ) : null}

        {s.skin.map((b) => (
          <button
            key={b.value}
            type="button"
            onClick={() => toggle('skinType', b.value)}
            aria-pressed={f.skinType === b.value}
            style={chip(f.skinType === b.value)}
          >
            {label(data.labels.skin, b.value)} <span style={dim}>{b.count}</span>
          </button>
        ))}
        {s.hair.map((b) => (
          <button
            key={b.value}
            type="button"
            onClick={() => toggle('hairType', b.value)}
            aria-pressed={f.hairType === b.value}
            style={chip(f.hairType === b.value)}
          >
            {label(data.labels.hair, b.value)} <span style={dim}>{b.count}</span>
          </button>
        ))}
        {s.age.map((b) => (
          <button
            key={b.value}
            type="button"
            onClick={() => toggle('ageBand', b.value)}
            aria-pressed={f.ageBand === b.value}
            style={chip(f.ageBand === b.value)}
          >
            {label(data.labels.age, b.value)} <span style={dim}>{b.count}</span>
          </button>
        ))}

        {s.withPhoto > 0 ? (
          <button
            type="button"
            onClick={() => toggle('withPhoto', 'true')}
            aria-pressed={f.withPhoto === 'true'}
            style={chip(f.withPhoto === 'true')}
          >
            {t('withPhoto')} <span style={dim}>{s.withPhoto}</span>
          </button>
        ) : null}

        {active ? (
          <button
            type="button"
            onClick={() => {
              setF({});
              setPage(1);
            }}
            style={{ ...chip(false), color: 'var(--alv-brand)' }}
          >
            ✕ {t('clear')}
          </button>
        ) : null}
      </div>

      {/* Ro'yxat */}
      {data.items.length === 0 ? (
        <div className="alv-card" style={{ padding: 22 }}>
          <strong style={{ display: 'block', marginBottom: 6 }}>{t('noMatch')}</strong>
          <button
            type="button"
            onClick={() => {
              setF({});
              setPage(1);
            }}
            style={ghost}
          >
            {t('clear')}
          </button>
        </div>
      ) : (
        <>
          <p style={{ margin: '0 0 12px', fontSize: 13.5, color: 'var(--alv-muted)' }}>
            {data.total} {t('of')}
          </p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
            {data.items.map((r) => (
              <li key={r.id} className="alv-card" style={{ padding: 18 }}>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 10,
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <Rating value={r.rating} size={13} />
                  <strong style={{ fontSize: 14 }}>{r.author}</strong>
                  {r.isVerified ? (
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: 'var(--alv-mint)',
                        background: 'var(--alv-mint-soft)',
                        padding: '2px 8px',
                        borderRadius: 999,
                      }}
                    >
                      ✓ {t('verified')}
                    </span>
                  ) : null}

                  {/*
                    Manba YASHIRILMAYDI. Uzum'dagi do'konimizdan olingan
                    sharh shu saytda qilingan xarid emas va uni belgisiz
                    ko'rsatish mijozga shunday deb aytardi. Belgisi
                    bo'lgani esa aksincha — ishonchni oshiradi, chunki
                    sharhni Uzum'da tekshirish mumkin.
                  */}
                  {r.source === 'UZUM' ? (
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: 'var(--alv-ink-2)',
                        background: 'var(--alv-surface-2)',
                        padding: '2px 8px',
                        borderRadius: 999,
                      }}
                    >
                      {t('fromUzum')}
                    </span>
                  ) : null}
                  <span style={{ marginLeft: 'auto', fontSize: 12.5, color: 'var(--alv-muted)' }}>
                    {fmtDate(r.createdAt)}
                  </span>
                </div>

                {/* Atributlar — sharhning kimdan kelganini aytadi. */}
                {r.skinType || r.hairType || r.ageBand ? (
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 6,
                      marginBottom: 10,
                      fontSize: 12.5,
                      color: 'var(--alv-ink-2)',
                    }}
                  >
                    {r.skinType ? <span style={tag}>{label(data.labels.skin, r.skinType)}</span> : null}
                    {r.hairType ? <span style={tag}>{label(data.labels.hair, r.hairType)}</span> : null}
                    {r.ageBand ? <span style={tag}>{label(data.labels.age, r.ageBand)}</span> : null}
                  </div>
                ) : null}

                {r.body ? (
                  <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.65 }}>{r.body}</p>
                ) : null}

                {r.mediaUrls.length > 0 ? (
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    {r.mediaUrls.slice(0, 6).map((url) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={url}
                        src={url}
                        alt=""
                        loading="lazy"
                        style={{
                          width: 72,
                          height: 72,
                          objectFit: 'cover',
                          borderRadius: 8,
                          border: '1px solid var(--alv-line)',
                        }}
                      />
                    ))}
                  </div>
                ) : null}

                {r.adminReply ? (
                  <div
                    style={{
                      marginTop: 12,
                      paddingLeft: 14,
                      borderLeft: '3px solid var(--alv-brand)',
                    }}
                  >
                    <strong style={{ fontSize: 13 }}>{t('reply')}</strong>
                    <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--alv-ink-2)' }}>
                      {r.adminReply}
                    </p>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>

          {data.page * data.perPage < data.total ? (
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={loading}
              style={{ ...ghost, marginTop: 14 }}
            >
              {loading ? t('loading') : t('more')}
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}

const chip = (on: boolean): React.CSSProperties => ({
  padding: '7px 14px',
  borderRadius: 999,
  border: `1px solid ${on ? 'var(--alv-ink)' : 'var(--alv-line-2)'}`,
  background: on ? 'var(--alv-ink)' : 'var(--alv-surface)',
  color: on ? '#fff' : 'var(--alv-ink)',
  fontSize: 13.5,
  cursor: 'pointer',
  font: 'inherit',
  fontWeight: on ? 600 : 400,
  whiteSpace: 'nowrap',
});

const dim: React.CSSProperties = { opacity: 0.6, fontSize: 12.5, marginLeft: 2 };

const tag: React.CSSProperties = {
  background: 'var(--alv-surface-2)',
  padding: '2px 9px',
  borderRadius: 999,
};

const ghost: React.CSSProperties = {
  padding: '9px 18px',
  borderRadius: 10,
  border: '1px solid var(--alv-line-2)',
  background: 'var(--alv-surface)',
  color: 'var(--alv-ink)',
  fontSize: 14,
  cursor: 'pointer',
  font: 'inherit',
};
