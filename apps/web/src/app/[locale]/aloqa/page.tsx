import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { ContactForm } from '@/components/ContactForm';
import { isLocale } from '@/i18n/messages';
import { getStoreSettings, telHref, telegramHandle } from '@/lib/store-settings';

/**
 * Kontaktlar — TZ-3, 3.4.
 *
 * Hamma ma'lumot ADMIN PANELDAN keladi.
 *
 * Ilgari ular shu faylda qo'lda yozilgan edi, sahifaning oxirida esa
 * «Ma'lumotlar admin paneldagi Sozlamalar bo'limida to'ldiriladi»
 * degan yozuv turardi. Ya'ni sahifa o'zi yolg'on aytardi: xodim
 * adminda raqamni o'zgartirar, saqlanardi, saytda esa eski raqam
 * qolaverardi. Hech qayerda xato chiqmasdi.
 *
 * Yuridik ma'lumotlar (nom, STIR) to'ldirilmagan bo'lsa — ular
 * UMUMAN ko'rsatilmaydi. O'ylab topilgan rekvizit ishonch uchun emas,
 * aksincha zarar uchun ishlaydi.
 */

export const metadata = {
  title: 'Aloqa',
  description: 'ALIVER.UZ bilan bog‘lanish: telefon, Telegram, manzil va murojaat formasi.',
};

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'uz';
  const ru = locale === 'ru';
  const store = await getStoreSettings();

  const address = ru ? store.addressRu : store.addressUz;

  const channels: Array<{ label: string; value: string; href: string; note: string }> = [];
  if (store.phone) {
    channels.push({
      label: ru ? 'Телефон' : 'Telefon',
      value: store.phone,
      href: telHref(store.phone),
      note: store.workHours
        ? ru
          ? `Ежедневно ${store.workHours}`
          : `Har kuni ${store.workHours}`
        : '',
    });
  }
  if (store.telegram) {
    const tg = telegramHandle(store.telegram);
    channels.push({
      label: 'Telegram',
      value: tg.handle,
      href: tg.href,
      note: ru ? 'Быстрее всего отвечаем здесь' : 'Eng tez javob shu yerda',
    });
  }
  if (store.email) {
    channels.push({
      label: ru ? 'E-mail' : 'E-pochta',
      value: store.email,
      href: `mailto:${store.email}`,
      note: ru ? 'Партнёрство и официальные обращения' : 'Hamkorlik va rasmiy murojaatlar',
    });
  }

  // To'ldirilgan yuridik maydonlar. Bo'shlari qatorga ham qo'shilmaydi:
  // «STIR: —» degan yozuv ma'lumot bermaydi, faqat savol tug'diradi.
  const legal: Array<[string, string]> = [];
  if (store.legalName) legal.push([ru ? 'Название' : 'Nomi', store.legalName]);
  if (store.tin) legal.push([ru ? 'ИНН' : 'STIR', store.tin]);
  if (address) legal.push([ru ? 'Адрес' : 'Manzil', address]);
  if (store.workHours) legal.push([ru ? 'Часы работы' : 'Ish vaqti', store.workHours]);

  return (
    <>
      <SiteHeader locale={locale} />
      <main className="alv-page" style={{ maxWidth: 900, paddingTop: 42, paddingBottom: 70 }}>
        <h1 className="alv-h1">{ru ? 'Контакты' : 'Aloqa'}</h1>
        <p style={{ color: 'var(--alv-ink-2)', lineHeight: 1.7, margin: '10px 0 0', maxWidth: '62ch' }}>
          {ru
            ? 'Напишите нам о заказе, доставке или сотрудничестве — мы отвечаем в рабочее время.'
            : 'Buyurtma, yetkazish yoki hamkorlik bo‘yicha yozing — ish vaqtida javob beramiz.'}
        </p>

        {channels.length > 0 ? (
          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
              gap: 14,
              marginTop: 28,
            }}
          >
            {channels.map((c) => (
              <a
                key={c.value}
                href={c.href}
                className="alv-card"
                style={{ padding: 20, display: 'grid', gap: 4, textDecoration: 'none' }}
              >
                <span style={{ fontSize: 12.5, color: 'var(--alv-muted)' }}>{c.label}</span>
                <strong style={{ fontSize: 17, color: 'var(--alv-ink)' }}>{c.value}</strong>
                {c.note ? (
                  <span style={{ fontSize: 13.5, color: 'var(--alv-muted)' }}>{c.note}</span>
                ) : null}
              </a>
            ))}
          </section>
        ) : null}

        <section style={{ marginTop: 40 }}>
          <h2 style={{ fontSize: 22, margin: '0 0 14px' }}>
            {ru ? 'Написать нам' : 'Bizga yozing'}
          </h2>
          <ContactForm ru={ru} />
        </section>

        {legal.length > 0 ? (
          <section style={{ marginTop: 40 }}>
            <h2 style={{ fontSize: 22, margin: '0 0 14px' }}>
              {ru ? 'Реквизиты' : 'Yuridik ma’lumotlar'}
            </h2>
            <div className="alv-card" style={{ padding: 22, display: 'grid', gap: 10 }}>
              {legal.map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0,140px) minmax(0,1fr)',
                    gap: 14,
                    fontSize: 15,
                  }}
                >
                  <span style={{ color: 'var(--alv-muted)' }}>{label}</span>
                  <span>{value}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
