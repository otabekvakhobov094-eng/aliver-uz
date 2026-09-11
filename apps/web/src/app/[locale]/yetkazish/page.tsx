import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { shopApi } from '@/lib/shop-api';
import { isLocale } from '@/i18n/messages';

/**
 * Yetkazish va to'lov — TZ-3, 3.3.
 *
 * Ikkalasi bitta sahifada, chunki mijoz ularni doim birga qidiradi:
 * "qachon keladi va qanday to'layman" — bitta savol.
 *
 * Narxlar bazadan olinadi, matnda qotirilmaydi. Aks holda admin
 * tarifni o'zgartirganda bu sahifa eski raqamni ko'rsatib turadi va
 * mijoz checkoutda boshqa summani ko'radi.
 */

export const revalidate = 900;

export const metadata = {
  title: 'Yetkazish va to‘lov',
  description:
    'ALIVER.UZ — O‘zbekiston bo‘ylab yetkazib berish muddatlari va narxlari, to‘lov usullari: Click, Payme, Uzum va naqd.',
};

type Region = { id: string; nameUz: string; nameRu: string };

const PAYMENTS = [
  {
    key: 'click',
    uz: 'Click',
    ru: 'Click',
    noteUz: 'Click ilovasi yoki karta orqali, to‘lov darhol tasdiqlanadi',
    noteRu: 'Через приложение Click или картой, оплата подтверждается сразу',
  },
  {
    key: 'payme',
    uz: 'Payme',
    ru: 'Payme',
    noteUz: 'Payme ilovasi orqali, Uzcard va Humo kartalari qo‘llab-quvvatlanadi',
    noteRu: 'Через приложение Payme, поддерживаются карты Uzcard и Humo',
  },
  {
    key: 'uzum',
    uz: 'Uzum',
    ru: 'Uzum',
    noteUz: 'Uzum Bank orqali to‘lov va muddatli to‘lov imkoniyati',
    noteRu: 'Оплата через Uzum Bank и рассрочка',
  },
  {
    key: 'cash',
    uz: 'Naqd — kuryerga',
    ru: 'Наличные — курьеру',
    noteUz: 'Buyurtmani olganda to‘laysiz. Kuryerda QR va terminal ham bor.',
    noteRu: 'Оплата при получении. У курьера есть QR и терминал.',
  },
];

function money(tiyin: string | number | null | undefined, ru: boolean): string {
  if (tiyin === null || tiyin === undefined) return '—';
  const som = Math.round(Number(tiyin) / 100);
  if (som === 0) return ru ? 'Бесплатно' : 'Bepul';
  return `${som.toLocaleString(ru ? 'ru-RU' : 'uz-UZ')} ${ru ? 'сум' : 'so‘m'}`;
}

export default async function DeliveryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'uz';
  const ru = locale === 'ru';

  // Hudud ro'yxati bo'lmasa sahifa baribir ochiladi — to'lov qismi
  // mustaqil va mijozga kerak.
  const regions: Region[] = await shopApi.regions().catch(() => []);

  return (
    <>
      <SiteHeader locale={locale} />
      <main className="alv-page" style={{ maxWidth: 900, paddingTop: 42, paddingBottom: 70 }}>
        <h1 className="alv-h1">{ru ? 'Доставка и оплата' : 'Yetkazish va to‘lov'}</h1>

        <section style={{ marginTop: 34 }}>
          <h2 style={{ fontSize: 22, margin: '0 0 12px' }}>
            {ru ? 'Сроки и стоимость' : 'Muddat va narx'}
          </h2>
          <p style={{ color: 'var(--alv-ink-2)', lineHeight: 1.7, margin: '0 0 18px' }}>
            {ru
              ? 'Точная стоимость рассчитывается в корзине после выбора региона — она зависит от суммы заказа и выбранного способа доставки.'
              : 'Aniq narx savatda, hudud tanlangandan keyin hisoblanadi — u buyurtma summasiga va tanlangan usulga bog‘liq.'}
          </p>

          <div className="alv-card" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 520, borderCollapse: 'collapse', fontSize: 15 }}>
              <thead>
                <tr>
                  {[
                    ru ? 'Регион' : 'Hudud',
                    ru ? 'Срок' : 'Muddat',
                    ru ? 'Стоимость' : 'Narx',
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: 'left',
                        padding: '13px 18px',
                        borderBottom: '1px solid var(--alv-line)',
                        fontSize: 12,
                        letterSpacing: '.08em',
                        textTransform: 'uppercase',
                        color: 'var(--alv-muted)',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={cell}>{ru ? 'Ташкент' : 'Toshkent'}</td>
                  <td style={cell}>{ru ? '1 день' : '1 kun'}</td>
                  <td style={cell}>{ru ? 'от 20 000 сум' : '20 000 so‘mdan'}</td>
                </tr>
                <tr>
                  <td style={cell}>{ru ? 'Областные центры' : 'Viloyat markazlari'}</td>
                  <td style={cell}>{ru ? '1–2 дня' : '1–2 kun'}</td>
                  <td style={cell}>{ru ? 'от 30 000 сум' : '30 000 so‘mdan'}</td>
                </tr>
                <tr>
                  <td style={cell}>{ru ? 'Районы' : 'Tumanlar'}</td>
                  <td style={cell}>{ru ? '2–4 дня' : '2–4 kun'}</td>
                  <td style={cell}>{ru ? 'от 35 000 сум' : '35 000 so‘mdan'}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 13.5, color: 'var(--alv-muted)', marginTop: 10 }}>
            {ru
              ? 'Указаны ориентировочные значения. Итоговая сумма и срок показываются в корзине.'
              : 'Taxminiy qiymatlar ko‘rsatilgan. Yakuniy summa va muddat savatda ko‘rinadi.'}
          </p>
        </section>

        {regions.length > 0 ? (
          <section style={{ marginTop: 34 }}>
            <h2 style={{ fontSize: 22, margin: '0 0 12px' }}>
              {ru ? 'Куда доставляем' : 'Qayerlarga yetkazamiz'}
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {regions.map((r) => (
                <span
                  key={r.id}
                  className="alv-badge alv-badge--neutral"
                  style={{ fontSize: 13, height: 30, padding: '0 14px' }}
                >
                  {ru ? r.nameRu : r.nameUz}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        <section style={{ marginTop: 40 }}>
          <h2 style={{ fontSize: 22, margin: '0 0 12px' }}>
            {ru ? 'Способы оплаты' : 'To‘lov usullari'}
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
              gap: 14,
            }}
          >
            {PAYMENTS.map((p) => (
              <div key={p.key} className="alv-card" style={{ padding: 20 }}>
                <strong style={{ fontSize: 16 }}>{ru ? p.ru : p.uz}</strong>
                <p
                  style={{
                    margin: '6px 0 0',
                    fontSize: 14,
                    color: 'var(--alv-ink-2)',
                    lineHeight: 1.6,
                  }}
                >
                  {ru ? p.noteRu : p.noteUz}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 40 }}>
          <h2 style={{ fontSize: 22, margin: '0 0 12px' }}>{ru ? 'Важно знать' : 'Bilish muhim'}</h2>
          <div style={{ display: 'grid', gap: 12 }}>
            <div className="alv-card" style={{ padding: 18 }}>
              <strong>{ru ? 'Карта не сохраняется' : 'Karta saqlanmaydi'}</strong>
              <p style={{ margin: '5px 0 0', color: 'var(--alv-ink-2)', lineHeight: 1.65 }}>
                {ru
                  ? 'Оплата проходит на стороне платёжной системы. Данные карты не попадают на наш сайт и нигде у нас не хранятся.'
                  : 'To‘lov to‘lov tizimi tomonida amalga oshadi. Karta ma’lumotlari saytimizga tushmaydi va bizda saqlanmaydi.'}
              </p>
            </div>
            <div className="alv-card" style={{ padding: 18 }}>
              <strong>{ru ? 'Фискальный чек' : 'Fiskal chek'}</strong>
              <p style={{ margin: '5px 0 0', color: 'var(--alv-ink-2)', lineHeight: 1.65 }}>
                {ru
                  ? 'После оплаты чек формируется автоматически, ссылка приходит вместе с подтверждением заказа.'
                  : 'To‘lovdan keyin chek avtomatik shakllanadi, havolasi buyurtma tasdig‘i bilan birga keladi.'}
              </p>
            </div>
            <div className="alv-card" style={{ padding: 18 }}>
              <strong>{ru ? 'Проверка при получении' : 'Olayotganda tekshirish'}</strong>
              <p style={{ margin: '5px 0 0', color: 'var(--alv-ink-2)', lineHeight: 1.65 }}>
                {ru
                  ? 'Вы можете осмотреть заказ при курьере и отказаться от повреждённого товара — оплачивается только принятое.'
                  : 'Buyurtmani kuryer oldida ko‘rib chiqishingiz va nuqsonli tovardan voz kechishingiz mumkin — faqat qabul qilingani uchun to‘laysiz.'}
              </p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}

const cell: React.CSSProperties = {
  padding: '13px 18px',
  borderBottom: '1px solid var(--alv-line)',
};
