import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { ContactForm } from '@/components/ContactForm';
import { isLocale } from '@/i18n/messages';

/**
 * Kontaktlar — TZ-3, 3.4.
 *
 * Yuridik ma'lumotlar (MCHJ nomi, STIR, manzil) ataylab ko'rsatiladi:
 * O'zbekiston bozorida onlayn do'konga ishonchning eng oddiy belgisi
 * shu — mijoz kim bilan ish ko'rayotganini bilishi kerak.
 */

export const metadata = {
  title: 'Aloqa',
  description: 'ALIVER.UZ bilan bog‘lanish: telefon, Telegram, manzil va murojaat formasi.',
};

const CHANNELS = [
  {
    labelUz: 'Telefon',
    labelRu: 'Телефон',
    value: '+998 71 200 00 00',
    href: 'tel:+998712000000',
    noteUz: 'Har kuni 9:00–20:00',
    noteRu: 'Ежедневно 9:00–20:00',
  },
  {
    labelUz: 'Telegram',
    labelRu: 'Telegram',
    value: '@aliver_uz',
    href: 'https://t.me/aliver_uz',
    noteUz: 'Eng tez javob shu yerda',
    noteRu: 'Быстрее всего отвечаем здесь',
  },
  {
    labelUz: 'E-pochta',
    labelRu: 'E-mail',
    value: 'info@aliver.uz',
    href: 'mailto:info@aliver.uz',
    noteUz: 'Hamkorlik va rasmiy murojaatlar',
    noteRu: 'Партнёрство и официальные обращения',
  },
];

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'uz';
  const ru = locale === 'ru';

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

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: 14,
            marginTop: 28,
          }}
        >
          {CHANNELS.map((c) => (
            <a
              key={c.value}
              href={c.href}
              className="alv-card"
              style={{ padding: 20, display: 'grid', gap: 4, textDecoration: 'none' }}
            >
              <span style={{ fontSize: 12.5, color: 'var(--alv-muted)' }}>
                {ru ? c.labelRu : c.labelUz}
              </span>
              <strong style={{ fontSize: 17, color: 'var(--alv-ink)' }}>{c.value}</strong>
              <span style={{ fontSize: 13.5, color: 'var(--alv-muted)' }}>
                {ru ? c.noteRu : c.noteUz}
              </span>
            </a>
          ))}
        </section>

        <section style={{ marginTop: 40 }}>
          <h2 style={{ fontSize: 22, margin: '0 0 14px' }}>
            {ru ? 'Написать нам' : 'Bizga yozing'}
          </h2>
          <ContactForm ru={ru} />
        </section>

        <section style={{ marginTop: 40 }}>
          <h2 style={{ fontSize: 22, margin: '0 0 14px' }}>
            {ru ? 'Реквизиты' : 'Yuridik ma’lumotlar'}
          </h2>
          <div className="alv-card" style={{ padding: 22, display: 'grid', gap: 10 }}>
            {[
              [ru ? 'Название' : 'Nomi', 'MCHJ «ALIVER UZ»'],
              [ru ? 'ИНН' : 'STIR', '—'],
              [
                ru ? 'Адрес' : 'Manzil',
                ru ? 'г. Ташкент, Узбекистан' : 'Toshkent shahri, O‘zbekiston',
              ],
              [ru ? 'Часы работы' : 'Ish vaqti', ru ? 'Пн–Вс, 9:00–20:00' : 'Du–Ya, 9:00–20:00'],
            ].map(([label, value]) => (
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
          <p style={{ fontSize: 13, color: 'var(--alv-muted)', marginTop: 10 }}>
            {ru
              ? 'Реквизиты заполняются в админ-панели, в разделе «Настройки».'
              : 'Ma’lumotlar admin paneldagi «Sozlamalar» bo‘limida to‘ldiriladi.'}
          </p>
        </section>
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
