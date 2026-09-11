'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, formatPrice } from '@aliver/ui';
import { AccountAlert, AccountCard, accountField } from './AccountShell';
import { ShopError, shopApi, type ReturnEligibility } from '@/lib/shop-api';
import type { Locale } from '@/i18n/messages';

const NOT_ELIGIBLE: Record<string, { uz: string; ru: string }> = {
  NOT_DELIVERED: {
    uz: 'Buyurtma hali yetkazilmagan — qaytarish yetkazilgandan keyin mumkin.',
    ru: 'Заказ ещё не доставлен — возврат возможен после доставки.',
  },
  WINDOW_EXPIRED: {
    uz: 'Qaytarish muddati tugagan.',
    ru: 'Срок возврата истёк.',
  },
  ALREADY_RETURNED: {
    uz: 'Bu buyurtma bo‘yicha qaytarish so‘rovi allaqachon ochilgan.',
    ru: 'По этому заказу уже открыт возврат.',
  },
  NOTHING_TO_RETURN: {
    uz: 'Qaytarish mumkin bo‘lgan pozitsiya qolmagan.',
    ru: 'Не осталось позиций, доступных к возврату.',
  },
};

/**
 * Qaytarish so'rovi.
 *
 * Sahifa OLDIN "qaytarish mumkinmi" degan savolni beradi va javobga
 * qarab forma yoki sababni ko'rsatadi — mijoz forma to'ldirib bo'lgach
 * "muddat tugagan" degan xabar olmasligi kerak.
 */
export function ReturnRequest({ orderId, locale }: { orderId: string; locale: Locale }) {
  const router = useRouter();
  const [check, setCheck] = useState<ReturnEligibility | null>(null);
  const [reasons, setReasons] = useState<Array<{ code: string; uz: string; ru: string }>>([]);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [reasonCode, setReasonCode] = useState('NOT_SUITABLE');
  const [comment, setComment] = useState('');
  const [opened, setOpened] = useState(false);
  const [phone, setPhone] = useState('');
  const [needsPhone, setNeedsPhone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([shopApi.returnEligibility(orderId), shopApi.returnReasons()])
      .then(([e, r]) => {
        setCheck(e);
        setReasons(r.reasons);
        // Egalik aniqlanmagan bo'lsa server pozitsiyalarni bermaydi —
        // mehmondan telefon so'raymiz.
        if (e.eligible && e.lines.length === 0) setNeedsPhone(true);
      })
      .catch((e) => {
        const err = e instanceof ShopError ? e : null;
        if (err?.status === 403) setNeedsPhone(true);
        else setError(err?.message ?? 'Xatolik');
      });
  }, [orderId]);

  /** Mehmon telefonini kiritgach pozitsiyalar qayta so'raladi. */
  const confirmPhone = async () => {
    setBusy(true);
    setError(null);
    try {
      setCheck(await shopApi.returnEligibility(orderId, phone.trim()));
      setNeedsPhone(false);
    } catch (e) {
      setError(
        e instanceof ShopError && e.status === 403
          ? locale === 'ru'
            ? 'Телефон не совпадает с заказом'
            : 'Telefon buyurtmaga mos kelmadi'
          : e instanceof ShopError
            ? e.message
            : 'Xatolik',
      );
    } finally {
      setBusy(false);
    }
  };

  const total = useMemo(() => {
    if (!check) return 0n;
    return check.lines.reduce((sum, l) => {
      const q = qty[l.orderItemId] ?? 0;
      return sum + BigInt(l.refundPerUnit) * BigInt(q);
    }, 0n);
  }, [check, qty]);

  const selected = Object.entries(qty).filter(([, q]) => q > 0);

  const ourFault = ['WRONG_ITEM', 'DAMAGED', 'QUALITY'].includes(reasonCode);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const created = await shopApi.createReturn({
        orderId,
        phone: needsPhone ? phone.trim() : undefined,
        reasonCode,
        comment: comment.trim() || undefined,
        opened,
        items: selected.map(([orderItemId, quantity]) => ({ orderItemId, quantity })),
      });
      router.push(`/${locale}/kabinet/qaytarishlar?yangi=${created.number}`);
    } catch (e) {
      const err = e instanceof ShopError ? e : null;
      // Mehmon bo'lsa server telefonni so'raydi.
      if (err?.status === 403 && !needsPhone) {
        setNeedsPhone(true);
        setError(
          locale === 'ru'
            ? 'Укажите телефон, на который был оформлен заказ'
            : 'Buyurtma berilgan telefon raqamini kiriting',
        );
      } else {
        setError(err?.message ?? 'Xatolik');
      }
      setBusy(false);
    }
  };

  if (error && !check) {
    return (
      <AccountCard>
        <AccountAlert tone="danger">{error}</AccountAlert>
      </AccountCard>
    );
  }
  if (!check) {
    return (
      <p style={{ color: 'var(--alv-muted)' }}>{locale === 'ru' ? 'Загрузка…' : 'Yuklanmoqda…'}</p>
    );
  }

  // Mehmon: avval telefonni tasdiqlaydi, keyin pozitsiyalarni ko'radi.
  if (needsPhone && check.lines.length === 0) {
    return (
      <AccountCard title={locale === 'ru' ? 'Подтвердите заказ' : 'Buyurtmani tasdiqlang'}>
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--alv-ink-2)', lineHeight: 1.55 }}>
          {locale === 'ru'
            ? 'Введите телефон, на который оформлен заказ.'
            : 'Buyurtma berilgan telefon raqamini kiriting.'}
        </p>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          type="tel"
          placeholder="+998 90 123 45 67"
          style={accountField}
        />
        {error ? <AccountAlert tone="danger">{error}</AccountAlert> : null}
        <Button
          variant="primary"
          disabled={busy || phone.replace(/\D/g, '').length < 9}
          onClick={() => void confirmPhone()}
        >
          {locale === 'ru' ? 'Продолжить' : 'Davom etish'}
        </Button>
      </AccountCard>
    );
  }

  if (!check.eligible) {
    const msg = NOT_ELIGIBLE[check.reason];
    return (
      <AccountCard>
        <AccountAlert tone="warn">
          {msg ? (locale === 'ru' ? msg.ru : msg.uz) : check.reason}
        </AccountAlert>
        {check.openReturn ? (
          <Link
            href={`/${locale}/kabinet/qaytarishlar`}
            style={{ color: 'var(--alv-brand)', fontWeight: 700 }}
          >
            {locale === 'ru' ? 'Открыть возврат' : 'Qaytarishni ochish'} {check.openReturn.number} →
          </Link>
        ) : (
          <Link
            href={`/${locale}/kabinet/buyurtmalar`}
            style={{ color: 'var(--alv-muted)', fontSize: 13.5 }}
          >
            ← {locale === 'ru' ? 'К заказам' : 'Buyurtmalarga'}
          </Link>
        )}
      </AccountCard>
    );
  }

  return (
    <>
      <AccountCard>
        <AccountAlert tone="mint">
          {locale === 'ru'
            ? `Возврат возможен ещё ${check.daysLeft} дн.`
            : `Qaytarish uchun yana ${check.daysLeft} kun bor.`}
        </AccountAlert>
      </AccountCard>

      <AccountCard title={locale === 'ru' ? '1. Что возвращаете' : '1. Nimani qaytarasiz'}>
        {check.lines.map((l) => (
          <div
            key={l.orderItemId}
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              flexWrap: 'wrap',
              padding: '10px 0',
              borderTop: '1px solid var(--alv-line)',
            }}
          >
            <div style={{ flex: '1 1 200px', minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{l.productName}</div>
              <div style={{ fontSize: 12.5, color: 'var(--alv-muted)' }}>
                {[l.variantName, l.sku].filter(Boolean).join(' · ')} ·{' '}
                {locale === 'ru' ? 'доступно' : 'mavjud'}: {l.returnableQuantity}
              </div>
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 44,
                borderRadius: 999,
                boxShadow: 'inset 0 0 0 1.5px var(--alv-line-2)',
                overflow: 'hidden',
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setQty((q) => ({
                    ...q,
                    [l.orderItemId]: Math.max(0, (q[l.orderItemId] ?? 0) - 1),
                  }))
                }
                aria-label={locale === 'ru' ? 'Меньше' : 'Kamaytirish'}
                style={{ width: 44, height: 44, border: 0, background: 'none', cursor: 'pointer' }}
              >
                −
              </button>
              <span style={{ minWidth: 32, textAlign: 'center', fontWeight: 700 }}>
                {qty[l.orderItemId] ?? 0}
              </span>
              <button
                type="button"
                onClick={() =>
                  setQty((q) => ({
                    ...q,
                    [l.orderItemId]: Math.min(l.returnableQuantity, (q[l.orderItemId] ?? 0) + 1),
                  }))
                }
                aria-label={locale === 'ru' ? 'Больше' : 'Ko‘paytirish'}
                style={{ width: 44, height: 44, border: 0, background: 'none', cursor: 'pointer' }}
              >
                +
              </button>
            </div>

            <strong style={{ minWidth: 110, textAlign: 'right' }}>
              {formatPrice(l.refundPerUnit, locale === 'ru' ? 'RU' : 'UZ')}
            </strong>
          </div>
        ))}
      </AccountCard>

      <AccountCard title={locale === 'ru' ? '2. Причина' : '2. Sabab'}>
        <select
          value={reasonCode}
          onChange={(e) => setReasonCode(e.target.value)}
          style={accountField}
          aria-label={locale === 'ru' ? 'Причина возврата' : 'Qaytarish sababi'}
        >
          {reasons.map((r) => (
            <option key={r.code} value={r.code}>
              {locale === 'ru' ? r.ru : r.uz}
            </option>
          ))}
        </select>

        <label
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
            fontSize: 13.5,
            minHeight: 44,
          }}
        >
          <input
            type="checkbox"
            checked={opened}
            onChange={(e) => setOpened(e.target.checked)}
            style={{ width: 20, height: 20, marginTop: 2, accentColor: 'var(--alv-brand)' }}
          />
          <span>
            {locale === 'ru' ? 'Упаковка вскрыта' : 'Qadoq ochilgan'}
            {opened && !ourFault ? (
              <span
                style={{
                  display: 'block',
                  color: 'var(--alv-warn)',
                  fontWeight: 600,
                  marginTop: 4,
                }}
              >
                {locale === 'ru'
                  ? 'Вскрытая косметика надлежащего качества возврату не подлежит. Если товар с дефектом — выберите другую причину.'
                  : 'Ochilgan, sifatli kosmetika qaytarilmaydi. Tovar nuqsonli bo‘lsa — boshqa sababni tanlang.'}
              </span>
            ) : null}
          </span>
        </label>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder={
            locale === 'ru' ? 'Опишите проблему (необязательно)' : 'Muammoni yozing (ixtiyoriy)'
          }
          style={{ ...accountField, resize: 'vertical' }}
        />
      </AccountCard>

      {needsPhone ? (
        <AccountCard title={locale === 'ru' ? 'Подтверждение' : 'Tasdiqlash'}>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            placeholder="+998 90 123 45 67"
            style={accountField}
          />
        </AccountCard>
      ) : null}

      <AccountCard>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontWeight: 700 }}>
            {locale === 'ru' ? 'К возврату (примерно)' : 'Qaytariladi (taxminan)'}
          </span>
          <strong style={{ fontSize: 22 }}>
            {formatPrice(total.toString(), locale === 'ru' ? 'RU' : 'UZ')}
          </strong>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--alv-muted)', lineHeight: 1.55 }}>
          {locale === 'ru'
            ? 'Точная сумма подтверждается после проверки товара. Доставка возвращается, только если ошиблись мы и возвращается весь заказ.'
            : 'Aniq summa tovar tekshirilgach tasdiqlanadi. Yetkazib berish narxi faqat bizning aybimiz bilan va butun buyurtma qaytarilganda qaytariladi.'}
        </p>

        {error ? <AccountAlert tone="danger">{error}</AccountAlert> : null}

        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={
            busy || selected.length === 0 || (needsPhone && phone.replace(/\D/g, '').length < 9)
          }
          onClick={() => void submit()}
        >
          {busy
            ? locale === 'ru'
              ? 'Отправляем…'
              : 'Yuborilmoqda…'
            : locale === 'ru'
              ? 'Отправить запрос'
              : 'So‘rov yuborish'}
        </Button>
      </AccountCard>
    </>
  );
}
