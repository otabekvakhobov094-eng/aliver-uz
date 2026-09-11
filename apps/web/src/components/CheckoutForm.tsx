'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, formatPrice } from '@aliver/ui';
import { useCart } from './CartProvider';
import {
  ShopError,
  newIdempotencyKey,
  shopApi,
  type DeliveryQuote,
  type DeliveryRegion,
} from '@/lib/shop-api';
import type { Locale } from '@/i18n/messages';

const money = (v: string, locale: Locale) => formatPrice(v, locale === 'ru' ? 'RU' : 'UZ');

type Payment = 'CLICK' | 'PAYME' | 'CASH_ON_DELIVERY';

/**
 * Checkout.
 *
 * Uchta qoida bu yerda ko'rinadi:
 *  1. Yetkazish narxi hududga qarab SERVERDAN olinadi — ekspress faqat
 *     u ochilgan hududlarda tanlanadi (prototip sharhidagi xato).
 *  2. Rozilik belgisi oldindan BELGILANMAGAN bo'ladi.
 *  3. Har yuborishda bitta `idempotencyKey` — tugmani ikki marta bosish
 *     ikkita buyurtma yaratmaydi (ekspertiza A-7).
 */
export function CheckoutForm({ locale }: { locale: Locale }) {
  const router = useRouter();
  const { cart, ready, refresh } = useCart();

  const [regions, setRegions] = useState<DeliveryRegion[]>([]);
  const [quotes, setQuotes] = useState<DeliveryQuote[]>([]);

  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [regionId, setRegionId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [landmark, setLandmark] = useState('');
  const [methodCode, setMethodCode] = useState('');
  const [payment, setPayment] = useState<Payment>('CLICK');
  const [comment, setComment] = useState('');
  const [accept, setAccept] = useState(false);

  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Kalit forma ochilganda bir marta yaratiladi va muvaffaqiyatsiz
  // urinishlarda ham o'zgarmaydi — takroriy yuborish xavfsiz bo'lishi uchun.
  const [idempotencyKey, setIdempotencyKey] = useState(() => newIdempotencyKey());

  useEffect(() => {
    shopApi
      .regions()
      .then(setRegions)
      .catch(() => setRegions([]));
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  // Hudud yoki savat summasi o'zgarganda yetkazish narxlari qayta so'raladi.
  useEffect(() => {
    if (!regionId || !cart) {
      setQuotes([]);
      return;
    }
    let cancelled = false;
    shopApi
      .quotes({ regionId, subtotal: cart.grandTotal, freeShipping: cart.freeShipping })
      .then((rows) => {
        if (cancelled) return;
        setQuotes(rows);
        const available = rows.filter((q) => q.available);
        setMethodCode((current) =>
          available.some((q) => q.code === current) ? current : (available[0]?.code ?? ''),
        );
      })
      .catch(() => {
        if (!cancelled) setQuotes([]);
      });
    return () => {
      cancelled = true;
    };
  }, [regionId, cart]);

  const region = regions.find((r) => r.id === regionId);
  const quote = quotes.find((q) => q.code === methodCode);
  const needsAddress = quote?.type !== 'PICKUP';

  const grandTotal = useMemo(() => {
    if (!cart) return 0n;
    return BigInt(cart.grandTotal) + BigInt(quote?.price ?? '0');
  }, [cart, quote]);

  if (!ready) {
    return (
      <p style={{ color: 'var(--alv-muted)' }}>{locale === 'ru' ? 'Загрузка…' : 'Yuklanmoqda…'}</p>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 16px' }}>
        <p style={{ marginBottom: 16, color: 'var(--alv-muted)' }}>
          {locale === 'ru' ? 'Корзина пуста.' : 'Savat bo‘sh.'}
        </p>
        <Link href={`/${locale}/katalog`}>
          <Button variant="primary">{locale === 'ru' ? 'В каталог' : 'Katalogga'}</Button>
        </Link>
      </div>
    );
  }

  const codNeedsOtp = payment === 'CASH_ON_DELIVERY';

  const canSubmit =
    !submitting &&
    phone.replace(/\D/g, '').length >= 9 &&
    firstName.trim().length >= 2 &&
    Boolean(regionId) &&
    Boolean(methodCode) &&
    (!needsAddress || addressLine.trim().length >= 5) &&
    accept &&
    (!codNeedsOtp || otpCode.length >= 4);

  const sendOtp = async () => {
    setError(null);
    try {
      const res = await shopApi.requestOrderOtp(phone);
      setOtpSent(true);
      setResendIn(res.resendAfterSeconds ?? 60);
    } catch (e) {
      setError(e instanceof ShopError ? e.message : 'Kod yuborilmadi');
    }
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const order = await shopApi.createOrder({
        phone,
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        regionId,
        districtId: districtId || undefined,
        addressLine: needsAddress ? addressLine.trim() : (quote?.nameUz ?? 'Olib ketish punkti'),
        landmark: landmark.trim() || undefined,
        deliveryMethodCode: methodCode,
        paymentProvider: payment,
        otpCode: codNeedsOtp ? otpCode : undefined,
        comment: comment.trim() || undefined,
        acceptOffer: accept,
        idempotencyKey,
      });
      await refresh();

      // Onlayn to'lovda mijoz darhol to'lov sahifasiga yuboriladi.
      // Havola olinmasa ham buyurtma YARATILGAN — shuning uchun
      // xatoga tushirmaymiz, faqat buyurtma sahifasiga o'tamiz, u yerdan
      // to'lovni qayta boshlash mumkin.
      if (payment !== 'CASH_ON_DELIVERY') {
        try {
          const link = await shopApi.startPayment(order.id, payment);
          if (link.url) {
            window.location.href = link.url;
            return;
          }
        } catch {
          // pastdagi o'tish ishlaydi
        }
      }

      router.push(`/${locale}/buyurtma/${order.id}`);
    } catch (e) {
      const err = e instanceof ShopError ? e : null;
      setError(err?.message ?? 'Buyurtma yaratilmadi');

      // Qoldiq yoki chegirma o'zgargan bo'lsa savat yangilanadi va mijoz
      // nima o'zgarganini ko'radi.
      if (
        err?.code === 'OUT_OF_STOCK' ||
        err?.code === 'STOCK_CHANGED' ||
        err?.code === 'COUPON_CHANGED'
      ) {
        await refresh();
      }
      // Kalit "band" bo'lib qolmasligi uchun tekshiruv xatolaridan keyin
      // yangi kalit beriladi (buyurtma yaratilmagani aniq).
      if (err && err.status >= 400 && err.status < 500 && err.code !== 'OUT_OF_STOCK') {
        setIdempotencyKey(newIdempotencyKey());
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="alv-shop-grid">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) void submit();
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
      >
        <Section title={locale === 'ru' ? '1. Контакты' : '1. Aloqa'}>
          <div className="alv-field-row">
            <Field
              label={locale === 'ru' ? 'Имя' : 'Ism'}
              value={firstName}
              onChange={setFirstName}
              required
              autoComplete="given-name"
            />
            <Field
              label={locale === 'ru' ? 'Фамилия' : 'Familiya'}
              value={lastName}
              onChange={setLastName}
              autoComplete="family-name"
            />
          </div>
          <Field
            label={locale === 'ru' ? 'Телефон' : 'Telefon raqami'}
            value={phone}
            onChange={setPhone}
            required
            type="tel"
            placeholder="+998 90 123 45 67"
            autoComplete="tel"
            hint={
              locale === 'ru'
                ? 'На этот номер курьер позвонит перед доставкой.'
                : 'Yetkazishdan oldin kuryer shu raqamga qo‘ng‘iroq qiladi.'
            }
          />
        </Section>

        <Section title={locale === 'ru' ? '2. Доставка' : '2. Yetkazib berish'}>
          <div className="alv-field-row">
            <Select
              label={locale === 'ru' ? 'Область' : 'Viloyat'}
              value={regionId}
              onChange={(v) => {
                setRegionId(v);
                setDistrictId('');
              }}
              required
              options={[
                { value: '', label: locale === 'ru' ? 'Выберите область' : 'Viloyatni tanlang' },
                ...regions.map((r) => ({
                  value: r.id,
                  label: locale === 'ru' ? r.nameRu : r.nameUz,
                })),
              ]}
            />
            <Select
              label={locale === 'ru' ? 'Район' : 'Tuman'}
              value={districtId}
              onChange={setDistrictId}
              disabled={!region || region.districts.length === 0}
              options={[
                { value: '', label: locale === 'ru' ? 'Выберите район' : 'Tumanni tanlang' },
                ...(region?.districts ?? []).map((d) => ({
                  value: d.id,
                  label: locale === 'ru' ? d.nameRu : d.nameUz,
                })),
              ]}
            />
          </div>

          {regionId ? (
            <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 10 }}>
              <legend
                style={{ fontSize: 13, fontWeight: 700, color: 'var(--alv-ink-2)', padding: 0 }}
              >
                {locale === 'ru' ? 'Способ доставки' : 'Yetkazish usuli'}
              </legend>
              {quotes.map((q) => {
                const on = q.code === methodCode;
                const reason = locale === 'ru' ? q.unavailableReasonRu : q.unavailableReasonUz;
                return (
                  <label
                    key={q.code}
                    style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                      minHeight: 56,
                      padding: '14px 16px',
                      borderRadius: 16,
                      cursor: q.available ? 'pointer' : 'not-allowed',
                      background: on ? 'var(--alv-brand-soft)' : 'var(--alv-surface)',
                      boxShadow: on
                        ? 'inset 0 0 0 2px var(--alv-brand)'
                        : 'inset 0 0 0 1.5px var(--alv-line-2)',
                      opacity: q.available ? 1 : 0.55,
                    }}
                  >
                    <input
                      type="radio"
                      name="delivery"
                      value={q.code}
                      checked={on}
                      disabled={!q.available}
                      onChange={() => setMethodCode(q.code)}
                      style={{
                        marginTop: 3,
                        width: 20,
                        height: 20,
                        accentColor: 'var(--alv-brand)',
                      }}
                    />
                    <span style={{ flexGrow: 1 }}>
                      <span style={{ display: 'block', fontWeight: 700, fontSize: 14.5 }}>
                        {locale === 'ru' ? q.nameRu : q.nameUz}
                      </span>
                      <span
                        style={{
                          display: 'block',
                          fontSize: 12.5,
                          color: 'var(--alv-muted)',
                          marginTop: 2,
                        }}
                      >
                        {reason ??
                          (locale === 'ru'
                            ? `${q.daysMin}–${q.daysMax} дн.`
                            : `${q.daysMin}–${q.daysMax} kun`)}
                      </span>
                      {q.amountToFree && BigInt(q.amountToFree) > 0n && q.freeThreshold ? (
                        <span
                          style={{
                            display: 'block',
                            fontSize: 12.5,
                            color: 'var(--alv-brand)',
                            marginTop: 4,
                          }}
                        >
                          {locale === 'ru'
                            ? `До бесплатной доставки — ${money(q.amountToFree, locale)}`
                            : `Bepul yetkazishgacha — ${money(q.amountToFree, locale)}`}
                        </span>
                      ) : null}
                    </span>
                    <span style={{ fontWeight: 800, fontSize: 14.5, whiteSpace: 'nowrap' }}>
                      {q.isFree
                        ? locale === 'ru'
                          ? 'Бесплатно'
                          : 'Bepul'
                        : money(q.price, locale)}
                    </span>
                  </label>
                );
              })}
            </fieldset>
          ) : null}

          {needsAddress ? (
            <>
              <Field
                label={locale === 'ru' ? 'Адрес' : 'Manzil'}
                value={addressLine}
                onChange={setAddressLine}
                required
                autoComplete="street-address"
                placeholder={
                  locale === 'ru'
                    ? 'ул. Амира Темура 84, кв. 12'
                    : 'Amir Temur ko‘chasi 84-uy, 12-xonadon'
                }
              />
              <Field
                label={locale === 'ru' ? 'Ориентир' : 'Mo‘ljal'}
                value={landmark}
                onChange={setLandmark}
                placeholder={locale === 'ru' ? 'Рядом с метро' : 'Metro yonida'}
              />
            </>
          ) : null}
        </Section>

        <Section title={locale === 'ru' ? '3. Оплата' : '3. To‘lov'}>
          <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 10 }}>
            <legend
              style={{
                position: 'absolute',
                width: 1,
                height: 1,
                overflow: 'hidden',
                clip: 'rect(0 0 0 0)',
              }}
            >
              {locale === 'ru' ? 'Способ оплаты' : 'To‘lov usuli'}
            </legend>
            {(
              [
                { v: 'CLICK', uz: 'Click', ru: 'Click' },
                { v: 'PAYME', uz: 'Payme', ru: 'Payme' },
                {
                  v: 'CASH_ON_DELIVERY',
                  uz: 'Yetkazilganda naqd',
                  ru: 'Наличными при получении',
                },
              ] as Array<{ v: Payment; uz: string; ru: string }>
            ).map((p) => {
              const on = payment === p.v;
              return (
                <label
                  key={p.v}
                  style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                    minHeight: 56,
                    padding: '14px 16px',
                    borderRadius: 16,
                    cursor: 'pointer',
                    background: on ? 'var(--alv-brand-soft)' : 'var(--alv-surface)',
                    boxShadow: on
                      ? 'inset 0 0 0 2px var(--alv-brand)'
                      : 'inset 0 0 0 1.5px var(--alv-line-2)',
                  }}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={p.v}
                    checked={on}
                    onChange={() => setPayment(p.v)}
                    style={{ width: 20, height: 20, accentColor: 'var(--alv-brand)' }}
                  />
                  <span style={{ fontWeight: 700, fontSize: 14.5 }}>
                    {locale === 'ru' ? p.ru : p.uz}
                  </span>
                </label>
              );
            })}
          </fieldset>

          {codNeedsOtp ? (
            <div
              style={{
                display: 'grid',
                gap: 10,
                padding: 16,
                borderRadius: 16,
                background: 'var(--alv-surface-2)',
              }}
            >
              <p style={{ margin: 0, fontSize: 13, color: 'var(--alv-ink-2)', lineHeight: 1.5 }}>
                {locale === 'ru'
                  ? 'Для оплаты наличными подтвердите номер телефона кодом из SMS.'
                  : 'Naqd to‘lov uchun telefon raqamini SMS-kod bilan tasdiqlang.'}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flexGrow: 1, minWidth: 140 }}>
                  <Field
                    label={locale === 'ru' ? 'Код из SMS' : 'SMS-kod'}
                    value={otpCode}
                    onChange={(v) => setOtpCode(v.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                  />
                </div>
                <Button
                  variant="ghost"
                  disabled={resendIn > 0 || phone.replace(/\D/g, '').length < 9}
                  onClick={() => void sendOtp()}
                >
                  {resendIn > 0
                    ? `${resendIn} s`
                    : otpSent
                      ? locale === 'ru'
                        ? 'Отправить снова'
                        : 'Qayta yuborish'
                      : locale === 'ru'
                        ? 'Получить код'
                        : 'Kodni olish'}
                </Button>
              </div>
            </div>
          ) : null}

          <Field
            label={locale === 'ru' ? 'Комментарий к заказу' : 'Buyurtmaga izoh'}
            value={comment}
            onChange={setComment}
            multiline
          />
        </Section>

        <label
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
            minHeight: 44,
            fontSize: 13.5,
            lineHeight: 1.5,
            color: 'var(--alv-ink-2)',
          }}
        >
          {/* Belgi ATAYLAB oldindan qo'yilmagan — rozilik ongli bo'lishi kerak. */}
          <input
            type="checkbox"
            checked={accept}
            onChange={(e) => setAccept(e.target.checked)}
            required
            style={{ width: 20, height: 20, marginTop: 2, accentColor: 'var(--alv-brand)' }}
          />
          <span>
            {locale === 'ru' ? 'Я согласен с ' : 'Men '}
            <Link href={`/${locale}/oferta`} style={{ textDecoration: 'underline' }}>
              {locale === 'ru' ? 'публичной офертой' : 'ommaviy oferta'}
            </Link>
            {locale === 'ru' ? ' и ' : ' va '}
            <Link href={`/${locale}/maxfiylik`} style={{ textDecoration: 'underline' }}>
              {locale === 'ru' ? 'политикой конфиденциальности' : 'maxfiylik siyosati'}
            </Link>
            {locale === 'ru' ? '.' : ' shartlariga roziman.'}
          </span>
        </label>

        {/* Savatdagi promo-kod muammosi CHECKOUT da ham ko'rinadi: aks holda
            mijoz chegirmani ko'rib turib, chegirmasiz to'lab qo'yardi. */}
        {cart.couponError ? (
          <div
            role="alert"
            style={{
              padding: '12px 16px',
              borderRadius: 14,
              background: 'var(--alv-warn-soft)',
              color: 'var(--alv-warn)',
              fontSize: 13.5,
              fontWeight: 600,
            }}
          >
            {locale === 'ru' ? 'Промокод не применён: ' : 'Promo-kod qo‘llanmadi: '}
            {cart.couponError}
          </div>
        ) : null}

        {error ? (
          <div
            role="alert"
            style={{
              padding: '12px 16px',
              borderRadius: 14,
              background: 'var(--alv-danger-soft)',
              color: 'var(--alv-danger)',
              fontSize: 13.5,
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        ) : null}

        <Button type="submit" variant="primary" size="lg" disabled={!canSubmit} fullWidth>
          {submitting
            ? locale === 'ru'
              ? 'Оформляем…'
              : 'Rasmiylashtirilmoqda…'
            : locale === 'ru'
              ? 'Подтвердить заказ'
              : 'Buyurtmani tasdiqlash'}
        </Button>
      </form>

      <aside
        style={{
          background: 'var(--alv-surface)',
          borderRadius: 'var(--alv-radius-xl)',
          padding: 20,
          boxShadow: 'var(--alv-shadow-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          position: 'sticky',
          top: 16,
        }}
      >
        <h2 style={{ fontFamily: 'var(--alv-font-display)', fontSize: 18, margin: 0 }}>
          {locale === 'ru' ? 'Ваш заказ' : 'Buyurtmangiz'}
        </h2>

        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
          {cart.items.map((i) => (
            <li key={i.itemId} style={{ display: 'flex', gap: 10, fontSize: 13.5 }}>
              <span style={{ flexGrow: 1, color: 'var(--alv-ink-2)' }}>
                {locale === 'ru' ? i.nameRu : i.nameUz} × {i.quantity}
              </span>
              <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                {money(i.lineTotal, locale)}
              </span>
            </li>
          ))}
        </ul>

        <div style={{ height: 1, background: 'var(--alv-line)' }} />

        <SumRow
          label={locale === 'ru' ? 'Товары' : 'Mahsulotlar'}
          value={money(cart.subtotal, locale)}
        />
        {BigInt(cart.discountTotal) > 0n ? (
          <SumRow
            label={locale === 'ru' ? 'Скидка' : 'Chegirma'}
            value={`−${money(cart.discountTotal, locale)}`}
          />
        ) : null}
        <SumRow
          label={locale === 'ru' ? 'Доставка' : 'Yetkazib berish'}
          value={
            !quote
              ? locale === 'ru'
                ? 'выберите область'
                : 'viloyatni tanlang'
              : quote.isFree
                ? locale === 'ru'
                  ? 'Бесплатно'
                  : 'Bepul'
                : money(quote.price, locale)
          }
        />
        <div style={{ height: 1, background: 'var(--alv-line)' }} />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: 12,
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 15 }}>
            {locale === 'ru' ? 'К оплате' : 'To‘lov uchun'}
          </span>
          <span style={{ fontWeight: 800, fontSize: 22, whiteSpace: 'nowrap' }}>
            {money(grandTotal.toString(), locale)}
          </span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--alv-muted)', margin: 0, lineHeight: 1.5 }}>
          {locale === 'ru'
            ? 'Товар резервируется на складе сразу после оформления. При онлайн-оплате резерв держится 30 минут.'
            : 'Buyurtma berilishi bilan tovar omborda band qilinadi. Onlayn to‘lovda rezerv 30 daqiqa saqlanadi.'}
        </p>
      </aside>
    </div>
  );
}

/* ------------------------------ Yordamchilar ------------------------------ */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        background: 'var(--alv-surface)',
        borderRadius: 'var(--alv-radius-xl)',
        padding: 20,
        boxShadow: 'var(--alv-shadow-sm)',
        display: 'grid',
        gap: 14,
      }}
    >
      <h2 style={{ fontFamily: 'var(--alv-font-display)', fontSize: 17, margin: 0 }}>{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = 'text',
  placeholder,
  hint,
  multiline,
  inputMode,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
  hint?: string;
  multiline?: boolean;
  inputMode?: 'numeric' | 'tel' | 'text';
  autoComplete?: string;
}) {
  const style: React.CSSProperties = {
    width: '100%',
    minHeight: 48,
    padding: '12px 14px',
    borderRadius: 12,
    border: 0,
    boxShadow: 'inset 0 0 0 1.5px var(--alv-line-2)',
    font: 'inherit',
    background: 'var(--alv-surface)',
  };
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--alv-ink-2)' }}>
        {label}
        {required ? <span style={{ color: 'var(--alv-brand)' }}> *</span> : null}
      </span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder={placeholder}
          style={{ ...style, resize: 'vertical' }}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          placeholder={placeholder}
          style={style}
        />
      )}
      {hint ? <span style={{ fontSize: 12, color: 'var(--alv-muted)' }}>{hint}</span> : null}
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  required,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--alv-ink-2)' }}>
        {label}
        {required ? <span style={{ color: 'var(--alv-brand)' }}> *</span> : null}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        style={{
          width: '100%',
          minHeight: 48,
          padding: '12px 14px',
          borderRadius: 12,
          border: 0,
          boxShadow: 'inset 0 0 0 1.5px var(--alv-line-2)',
          font: 'inherit',
          background: 'var(--alv-surface)',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SumRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13.5 }}>
      <span style={{ color: 'var(--alv-ink-2)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  );
}
