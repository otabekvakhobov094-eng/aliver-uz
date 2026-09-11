'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button, formatPrice } from '@aliver/ui';
import { AccountAlert, AccountCard, accountField } from './AccountShell';
import { ShopError, shopApi, type ConsentState, type Profile } from '@/lib/shop-api';
import type { Locale } from '@/i18n/messages';

const MARKETING: Array<{ type: string; uz: string; ru: string }> = [
  { type: 'MARKETING_SMS', uz: 'Aksiyalar haqida SMS', ru: 'SMS об акциях' },
  { type: 'MARKETING_TELEGRAM', uz: 'Telegram xabarlari', ru: 'Сообщения в Telegram' },
];

export function AccountProfile({ locale }: { locale: Locale }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [consents, setConsents] = useState<ConsentState | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([shopApi.profile(), shopApi.consents()])
      .then(([p, c]) => {
        setProfile(p);
        setConsents(c);
        setFirstName(p.firstName ?? '');
        setLastName(p.lastName ?? '');
        setEmail(p.email ?? '');
      })
      .catch((e) =>
        setError(
          e instanceof ShopError && e.status === 401
            ? locale === 'ru'
              ? 'Войдите в кабинет'
              : 'Kabinetga kiring'
            : e instanceof ShopError
              ? e.message
              : 'Xatolik',
        ),
      );
  }, [locale]);

  const save = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await shopApi.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
      });
      setProfile(updated);
      setNotice(locale === 'ru' ? 'Сохранено' : 'Saqlandi');
    } catch (e) {
      setError(e instanceof ShopError ? e.message : 'Xatolik');
    } finally {
      setBusy(false);
    }
  };

  const toggleConsent = async (type: string, granted: boolean) => {
    setError(null);
    try {
      setConsents(await shopApi.setConsent(type, granted));
    } catch (e) {
      setError(e instanceof ShopError ? e.message : 'Xatolik');
    }
  };

  const download = async () => {
    try {
      const data = await shopApi.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'aliver-mening-malumotlarim.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof ShopError ? e.message : 'Xatolik');
    }
  };

  const connectTelegram = async () => {
    setError(null);
    try {
      const result = await shopApi.telegramLink();
      if (!result.url) throw new Error(locale === 'ru' ? 'Telegram-бот ещё не настроен' : 'Telegram bot hali sozlanmagan');
      window.open(result.url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setError(e instanceof ShopError || e instanceof Error ? e.message : 'Xatolik');
    }
  };

  if (error && !profile) {
    return (
      <AccountCard>
        <AccountAlert tone="danger">{error}</AccountAlert>
        <Link href={`/${locale}/kirish`}>
          <Button variant="primary">{locale === 'ru' ? 'Войти' : 'Kirish'}</Button>
        </Link>
      </AccountCard>
    );
  }

  if (!profile) {
    return (
      <p style={{ color: 'var(--alv-muted)' }}>{locale === 'ru' ? 'Загрузка…' : 'Yuklanmoqda…'}</p>
    );
  }

  const granted = (type: string) =>
    consents?.current.find((c) => c.type === type)?.granted ?? false;

  return (
    <>
      <AccountCard>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Stat
            label={locale === 'ru' ? 'Заказов' : 'Buyurtmalar'}
            value={String(profile.stats.ordersCount)}
          />
          <Stat
            label={locale === 'ru' ? 'Потрачено' : 'Sarflangan'}
            value={formatPrice(profile.stats.totalSpent, locale === 'ru' ? 'RU' : 'UZ')}
          />
          <Stat
            label={locale === 'ru' ? 'Избранное' : 'Sevimlilar'}
            value={String(profile.stats.wishlistCount)}
          />
        </div>
      </AccountCard>

      <AccountCard title={locale === 'ru' ? 'Данные' : 'Ma’lumotlar'}>
        {notice ? <AccountAlert tone="mint">{notice}</AccountAlert> : null}
        {error ? <AccountAlert tone="danger">{error}</AccountAlert> : null}

        <div className="alv-field-row">
          <Field
            label={locale === 'ru' ? 'Имя' : 'Ism'}
            value={firstName}
            onChange={setFirstName}
          />
          <Field
            label={locale === 'ru' ? 'Фамилия' : 'Familiya'}
            value={lastName}
            onChange={setLastName}
          />
        </div>

        <Field label="Email" value={email} onChange={setEmail} type="email" />

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--alv-ink-2)' }}>
            {locale === 'ru' ? 'Телефон' : 'Telefon'}
          </span>
          <input value={profile.phone} readOnly style={{ ...accountField, opacity: 0.7 }} />
          <span style={{ fontSize: 12, color: 'var(--alv-muted)' }}>
            {locale === 'ru'
              ? 'Телефон — основной идентификатор. Для смены обратитесь в поддержку.'
              : 'Telefon — asosiy identifikator. O‘zgartirish uchun qo‘llab-quvvatlashga murojaat qiling.'}
          </span>
        </label>

        <Button variant="primary" disabled={busy} onClick={() => void save()}>
          {locale === 'ru' ? 'Сохранить' : 'Saqlash'}
        </Button>
      </AccountCard>

      <AccountCard title={locale === 'ru' ? 'Рассылки' : 'Xabarnomalar'}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--alv-muted)', lineHeight: 1.55 }}>
          {locale === 'ru'
            ? 'Уведомления о статусе заказа приходят всегда — это часть обслуживания. Здесь только реклама.'
            : 'Buyurtma holati haqidagi xabarlar har doim keladi — bu xizmatning bir qismi. Bu yerda faqat reklama.'}
        </p>

        {MARKETING.map((m) => (
          <label
            key={m.type}
            style={{ display: 'flex', gap: 12, alignItems: 'center', minHeight: 44, fontSize: 14 }}
          >
            <input
              type="checkbox"
              checked={granted(m.type)}
              onChange={(e) => void toggleConsent(m.type, e.target.checked)}
              style={{ width: 20, height: 20, accentColor: 'var(--alv-brand)' }}
            />
            <span>{locale === 'ru' ? m.ru : m.uz}</span>
          </label>
        ))}
        <div style={{ borderTop: '1px solid var(--alv-line)', paddingTop: 14 }}>
          <Button variant="outline" onClick={() => void connectTelegram()}>
            {profile.telegramLinked
              ? locale === 'ru' ? 'Telegram подключён' : 'Telegram ulangan'
              : locale === 'ru' ? 'Подключить Telegram' : 'Telegramni ulash'}
          </Button>
        </div>
      </AccountCard>

      <AccountCard title={locale === 'ru' ? 'Мои данные' : 'Mening ma’lumotlarim'}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--alv-muted)', lineHeight: 1.55 }}>
          {locale === 'ru'
            ? 'Выгрузка всех данных, которые мы о вас храним: профиль, заказы, адреса, согласия.'
            : 'Biz sizda saqlaydigan barcha ma’lumotlar: profil, buyurtmalar, manzillar, roziliklar.'}
        </p>
        <Button variant="ghost" onClick={() => void download()}>
          {locale === 'ru' ? 'Скачать (JSON)' : 'Yuklab olish (JSON)'}
        </Button>
      </AccountCard>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--alv-ink-2)' }}>{label}</span>
      <input
        value={value}
        type={type}
        onChange={(e) => onChange(e.target.value)}
        style={accountField}
      />
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 120 }}>
      <div style={{ fontSize: 12.5, color: 'var(--alv-muted)', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 2 }}>{value}</div>
    </div>
  );
}
