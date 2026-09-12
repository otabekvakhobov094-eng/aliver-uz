'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Locale } from '@/i18n/messages';

/**
 * Mahsulot tanlagich — TZ-3.
 *
 * Mijozning haqiqiy savoli «qaysi kategoriya?» emas, «menga nima
 * kerak?». Katalog filtri birinchi savolga javob beradi, bu esa
 * ikkinchisiga: bir necha oddiy savoldan keyin tayyor tanlov chiqadi.
 *
 * Uchta qaror ataylab:
 *
 *   1. Savol soni UCHTA. Har bir qo'shimcha qadam tashlab ketishni
 *      oshiradi va to'rtinchi savol aniqlikni sezilarli oshirmaydi.
 *   2. Har bir savolni O'TKAZIB YUBORISH mumkin. Majburiy savol
 *      «bilmayman» deydigan mijozni to'xtatib qo'yadi.
 *   3. Natija katalogga havola bo'lib chiqadi, alohida ro'yxat emas —
 *      shunda mijoz filtrni yana o'zgartira oladi va natija odatdagi
 *      katalog sahifasi bo'lib qoladi.
 */

type Answers = Record<string, string>;

interface Option {
  value: string;
  uz: string;
  ru: string;
  /** Bu javob katalog so'roviga nima qo'shadi. */
  query: Record<string, string>;
}

interface Step {
  key: string;
  uz: string;
  ru: string;
  options: Option[];
}

const STEPS: Step[] = [
  {
    key: 'area',
    uz: 'Nimani parvarish qilmoqchisiz?',
    ru: 'Что вы хотите ухаживать?',
    options: [
      { value: 'hair', uz: 'Soch', ru: 'Волосы', query: { category: 'soch-parvarishi' } },
      { value: 'face', uz: 'Yuz', ru: 'Лицо', query: { category: 'yuz-parvarishi' } },
      { value: 'body', uz: 'Tana', ru: 'Тело', query: { category: 'tana-parvarishi' } },
      { value: 'nails', uz: 'Tirnoq', ru: 'Ногти', query: { category: 'tirnoq' } },
    ],
  },
  {
    key: 'concern',
    uz: 'Asosiy muammo nima?',
    ru: 'Какая основная задача?',
    options: [
      { value: 'dry', uz: 'Quruqlik', ru: 'Сухость', query: { tags: 'namlantirish' } },
      { value: 'damage', uz: 'Shikastlanish', ru: 'Повреждение', query: { tags: 'tiklash' } },
      { value: 'oily', uz: 'Yog‘lilik', ru: 'Жирность', query: { tags: 'yogni-kamaytirish' } },
      { value: 'sensitive', uz: 'Sezgirlik', ru: 'Чувствительность', query: { tags: 'sezgir-teri' } },
      { value: 'shine', uz: 'Yorqinlik', ru: 'Блеск', query: { tags: 'yorqinlik' } },
    ],
  },
  {
    key: 'budget',
    uz: 'Byudjetingiz qanday?',
    ru: 'Какой бюджет?',
    options: [
      { value: 'low', uz: '100 000 so‘mgacha', ru: 'До 100 000 сум', query: { maxPrice: '100000' } },
      {
        value: 'mid',
        uz: '100–300 ming',
        ru: '100–300 тысяч',
        query: { minPrice: '100000', maxPrice: '300000' },
      },
      { value: 'high', uz: '300 mingdan yuqori', ru: 'Более 300 тысяч', query: { minPrice: '300000' } },
    ],
  },
];

export function ProductFinder({ locale }: { locale: Locale }) {
  const ru = locale === 'ru';
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});

  const query = useMemo(() => {
    const q: Record<string, string> = { inStock: 'true' };
    for (const s of STEPS) {
      const picked = answers[s.key];
      if (!picked) continue;
      const opt = s.options.find((o) => o.value === picked);
      if (opt) Object.assign(q, opt.query);
    }
    return q;
  }, [answers]);

  const done = step >= STEPS.length;

  function choose(key: string, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setStep((s) => s + 1);
  }

  function finish() {
    const qs = new URLSearchParams(query);
    router.push(`/${locale}/katalog?${qs.toString()}`);
  }

  if (done) {
    const chosen = STEPS.map((s) => {
      const opt = s.options.find((o) => o.value === answers[s.key]);
      return opt ? (ru ? opt.ru : opt.uz) : null;
    }).filter(Boolean);

    return (
      <div className="alv-card" style={{ padding: 26, maxWidth: 620 }}>
        <h2 style={{ margin: '0 0 10px', fontSize: 20 }}>
          {ru ? 'Готово' : 'Tayyor'}
        </h2>
        <p style={{ margin: '0 0 18px', color: 'var(--alv-ink-2)', lineHeight: 1.65 }}>
          {chosen.length > 0
            ? (ru ? 'Ваш выбор: ' : 'Tanlovingiz: ') + chosen.join(' · ')
            : ru
              ? 'Вы пропустили все вопросы — покажем весь каталог.'
              : 'Barcha savollarni o‘tkazib yubordingiz — butun katalogni ko‘rsatamiz.'}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <button type="button" onClick={finish} className="alv-btn alv-btn--primary alv-btn--md">
            {ru ? 'Показать товары' : 'Mahsulotlarni ko‘rsatish'}
          </button>
          <button
            type="button"
            onClick={() => {
              setAnswers({});
              setStep(0);
            }}
            className="alv-btn alv-btn--outline alv-btn--md"
          >
            {ru ? 'Начать заново' : 'Boshidan'}
          </button>
        </div>
      </div>
    );
  }

  const current = STEPS[step]!;

  return (
    <div className="alv-card" style={{ padding: 26, maxWidth: 620 }}>
      {/* Qadam ko'rsatkichi: mijoz jarayon qancha qolganini bilishi
          kerak, aks holda u istalgan qadamda tashlab ketadi. */}
      <p
        style={{
          margin: '0 0 6px',
          fontSize: 12.5,
          letterSpacing: '.08em',
          textTransform: 'uppercase',
          color: 'var(--alv-muted)',
          fontWeight: 600,
        }}
      >
        {ru ? 'Шаг' : 'Qadam'} {step + 1} / {STEPS.length}
      </p>

      <h2 style={{ margin: '0 0 18px', fontSize: 21, textWrap: 'balance' }}>
        {ru ? current.ru : current.uz}
      </h2>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
        {current.options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => choose(current.key, o.value)}
            style={{
              padding: '11px 18px',
              borderRadius: 999,
              border: '1.5px solid var(--alv-line-2)',
              background: 'var(--alv-surface)',
              color: 'var(--alv-ink)',
              fontSize: 14.5,
              cursor: 'pointer',
              font: 'inherit',
            }}
          >
            {ru ? o.ru : o.uz}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        {/* O'tkazib yuborish MAJBURIY: «bilmayman» deydigan mijozni
            to'xtatib qo'ymaslik kerak. */}
        <button
          type="button"
          onClick={() => setStep((s) => s + 1)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--alv-muted)',
            fontSize: 14,
            cursor: 'pointer',
            font: 'inherit',
            textDecoration: 'underline',
            padding: 0,
          }}
        >
          {ru ? 'Пропустить' : 'O‘tkazib yuborish'}
        </button>
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--alv-muted)',
              fontSize: 14,
              cursor: 'pointer',
              font: 'inherit',
              padding: 0,
            }}
          >
            ← {ru ? 'Назад' : 'Orqaga'}
          </button>
        ) : null}
      </div>
    </div>
  );
}
