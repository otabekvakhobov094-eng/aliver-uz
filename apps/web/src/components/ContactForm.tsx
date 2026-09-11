'use client';

import { useState } from 'react';
import { apiBase } from '@/lib/api-base';

/**
 * Murojaat formasi — TZ 57.
 *
 * Yuborilgan xabar admin paneldagi qutiga tushadi. Muvaffaqiyat holati
 * alohida ekran bilan ko'rsatiladi: forma o'z joyida qolib, faqat
 * "yuborildi" degan yozuv chiqishi mijozni chalkashtiradi — u yana
 * bosadi va ikkita bir xil murojaat keladi.
 */
export function ContactForm({ ru }: { ru: boolean }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', subject: '', body: '' });
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');

  if (state === 'sent') {
    return (
      <div className="alv-card" style={{ padding: 26, display: 'grid', gap: 10 }}>
        <strong style={{ fontSize: 17 }}>{ru ? 'Сообщение отправлено' : 'Xabar yuborildi'}</strong>
        <p style={{ margin: 0, color: 'var(--alv-ink-2)', lineHeight: 1.65 }}>
          {ru
            ? 'Мы свяжемся с вами по указанному номеру в рабочее время.'
            : 'Ish vaqtida ko‘rsatilgan raqam orqali bog‘lanamiz.'}
        </p>
        <button
          type="button"
          onClick={() => {
            setForm({ name: '', phone: '', email: '', subject: '', body: '' });
            setState('idle');
          }}
          style={{
            justifySelf: 'start',
            padding: '9px 18px',
            borderRadius: 10,
            border: '1px solid var(--alv-line)',
            background: 'transparent',
            color: 'var(--alv-ink)',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          {ru ? 'Написать ещё' : 'Yana yozish'}
        </button>
      </div>
    );
  }

  const field: React.CSSProperties = {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 10,
    border: '1px solid var(--alv-line)',
    fontSize: 15,
    background: 'var(--alv-surface)',
    color: 'var(--alv-ink)',
    fontFamily: 'inherit',
  };

  return (
    <form
      className="alv-card"
      style={{ padding: 24, display: 'grid', gap: 14 }}
      onSubmit={async (e) => {
        e.preventDefault();
        setState('sending');
        setError('');
        try {
          const res = await fetch(`${apiBase()}/content/contact`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(form),
          });
          if (!res.ok) {
            const data = (await res.json().catch(() => null)) as { message?: string } | null;
            throw new Error(data?.message ?? (ru ? 'Не удалось отправить' : 'Yuborib bo‘lmadi'));
          }
          setState('sent');
        } catch (err) {
          setError((err as Error).message);
          setState('idle');
        }
      }}
    >
      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}
      >
        <label style={{ display: 'grid', gap: 5, fontSize: 13.5 }}>
          <span style={{ color: 'var(--alv-muted)' }}>{ru ? 'Имя' : 'Ism'}</span>
          <input
            required
            id="contact-name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            style={field}
          />
        </label>
        <label style={{ display: 'grid', gap: 5, fontSize: 13.5 }}>
          <span style={{ color: 'var(--alv-muted)' }}>{ru ? 'Телефон' : 'Telefon'}</span>
          <input
            required
            id="contact-phone"
            type="tel"
            inputMode="tel"
            placeholder="+998 __ ___ __ __"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            style={field}
          />
        </label>
        <label style={{ display: 'grid', gap: 5, fontSize: 13.5 }}>
          <span style={{ color: 'var(--alv-muted)' }}>
            {ru ? 'E-mail (необязательно)' : 'E-pochta (ixtiyoriy)'}
          </span>
          <input
            id="contact-email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            style={field}
          />
        </label>
        <label style={{ display: 'grid', gap: 5, fontSize: 13.5 }}>
          <span style={{ color: 'var(--alv-muted)' }}>{ru ? 'Тема' : 'Mavzu'}</span>
          <input
            id="contact-subject"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            style={field}
          />
        </label>
      </div>

      <label style={{ display: 'grid', gap: 5, fontSize: 13.5 }}>
        <span style={{ color: 'var(--alv-muted)' }}>{ru ? 'Сообщение' : 'Xabar'}</span>
        <textarea
          required
          id="contact-body"
          rows={5}
          minLength={10}
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          style={{ ...field, resize: 'vertical' }}
        />
      </label>

      {error ? (
        <p role="alert" style={{ margin: 0, color: 'var(--alv-danger, #C0392B)', fontSize: 14 }}>
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={state === 'sending'}
        style={{
          justifySelf: 'start',
          padding: '12px 28px',
          borderRadius: 999,
          border: 'none',
          background: 'var(--alv-brand)',
          color: '#fff',
          fontWeight: 600,
          fontSize: 15,
          cursor: state === 'sending' ? 'wait' : 'pointer',
        }}
      >
        {state === 'sending' ? (ru ? 'Отправляем…' : 'Yuborilmoqda…') : ru ? 'Отправить' : 'Yuborish'}
      </button>
    </form>
  );
}
