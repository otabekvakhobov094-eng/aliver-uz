import Link from 'next/link';
import type { Metadata } from 'next';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { contentApi } from '@/lib/content-api';
import { isLocale } from '@/i18n/messages';
import styles from './help.module.css';

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const ru = locale === 'ru';
  return {
    title: ru ? 'Помощь и частые вопросы' : 'Yordam va ko‘p so‘raladigan savollar',
    description: ru
      ? 'Доставка, оплата, возврат, бонусные баллы и оригинальность — ответы на частые вопросы ALIVER.UZ.'
      : 'Yetkazib berish, to‘lov, qaytarish, bonus ballar va originallik — ALIVER.UZ savollariga javoblar.',
  };
}

/**
 * Yordam bo'limi.
 *
 * Ilgari bu shunchaki savol-javob ro'yxati edi. Lekin menyudagi
 * «Yordam» ostida to'rtta bo'lim bor — yetkazish, kuzatuv, savollar,
 * aloqa — va ularning uchtasiga bu sahifadan YO'L YO'Q edi. Mijoz
 * «yordam» ni bosib, savollar ro'yxatiga tushardi va buyurtmasini
 * kuzatish uchun yana menyuni ochishi kerak bo'lardi.
 *
 * Shuning uchun sahifa endi ikki qismdan iborat: yuqorida — nima
 * qilmoqchi ekaningizni tanlaysiz, pastda — savollar MAVZU bo'yicha
 * guruhlangan holda. Guruhlash muhim: yigirmata savol bitta ro'yxatda
 * turgan paytda odam o'qimaydi, ko'z yugurtiradi va topolmaydi.
 */

const TASKS: Array<{
  href: string;
  uz: string;
  ru: string;
  noteUz: string;
  noteRu: string;
  icon: string;
}> = [
  {
    href: '/kuzatuv',
    uz: 'Buyurtmani kuzatish',
    ru: 'Отследить заказ',
    noteUz: 'Buyurtma raqami va telefon bo‘yicha',
    noteRu: 'По номеру заказа и телефону',
    icon: '◎',
  },
  {
    href: '/yetkazish',
    uz: 'Yetkazish va to‘lov',
    ru: 'Доставка и оплата',
    noteUz: 'Muddatlar, narxlar, to‘lov usullari',
    noteRu: 'Сроки, цены, способы оплаты',
    icon: '⇢',
  },
  {
    href: '/kabinet/qaytarishlar',
    uz: 'Qaytarish rasmiylashtirish',
    ru: 'Оформить возврат',
    noteUz: '14 kun ichida, ochilmagan mahsulot',
    noteRu: '14 дней, невскрытый товар',
    icon: '↺',
  },
  {
    href: '/aloqa',
    uz: 'Biz bilan bog‘lanish',
    ru: 'Связаться с нами',
    noteUz: 'Telefon, Telegram, xabar qoldirish',
    noteRu: 'Телефон, Telegram, сообщение',
    icon: '✆',
  },
];

/** Mavzu nomlari. Seed'dagi `category` qiymatlariga mos. */
const GROUPS: Array<{ key: string; uz: string; ru: string }> = [
  { key: 'yetkazish', uz: 'Yetkazib berish', ru: 'Доставка' },
  { key: 'tolov', uz: 'To‘lov', ru: 'Оплата' },
  { key: 'qaytarish', uz: 'Qaytarish', ru: 'Возврат' },
  { key: 'mahsulot', uz: 'Mahsulot', ru: 'Товар' },
  { key: 'ballar', uz: 'Bonus ballar', ru: 'Бонусные баллы' },
];

export default async function HelpPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : 'uz';
  const ru = locale === 'ru';
  const items = await contentApi.faqs().catch(() => []);

  const label = (uz: string, ruText: string) => (ru ? ruText : uz);

  /*
   * Guruhlanmagan savollar YO'QOLMAYDI.
   *
   * Adminda yangi mavzu yaratilsa (yoki `category` bo'sh qoldirilsa),
   * savol quyidagi ro'yxatga tushmasdi va saytda umuman ko'rinmasdi.
   * Shuning uchun oxirida «Boshqa savollar» guruhi turadi.
   */
  const known = new Set(GROUPS.map((g) => g.key));
  const grouped = GROUPS.map((g) => ({
    ...g,
    items: items.filter((i) => i.category === g.key),
  })).filter((g) => g.items.length > 0);
  const rest = items.filter((i) => !i.category || !known.has(i.category));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: ru ? item.questionRu : item.questionUz,
      acceptedAnswer: { '@type': 'Answer', text: ru ? item.answerRu : item.answerUz },
    })),
  };

  return (
    <>
      <SiteHeader locale={locale} />
      <main className="alv-page" style={{ paddingTop: 36, paddingBottom: 72, minHeight: '60vh' }}>
        {items.length > 0 ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        ) : null}

        <nav className="alv-breadcrumb" aria-label="breadcrumb">
          <Link href={`/${locale}`}>{label('Bosh sahifa', 'Главная')}</Link>
          <span>›</span>
          <span style={{ color: 'var(--alv-ink)', fontWeight: 600 }}>
            {label('Yordam', 'Помощь')}
          </span>
        </nav>

        <h1 className="alv-h1" style={{ marginTop: 14 }}>
          {label('Qanday yordam bera olamiz?', 'Чем можем помочь?')}
        </h1>
        <p className="alv-muted" style={{ marginTop: 10, maxWidth: 620, lineHeight: 1.65 }}>
          {label(
            'Ko‘p so‘raladigan savollarga javoblar quyida. Topa olmasangiz — yozing, ish kunlari ichida javob beramiz.',
            'Ответы на частые вопросы — ниже. Если не нашли нужное, напишите нам: отвечаем в рабочие дни.',
          )}
        </p>

        <div className={styles.tasks}>
          {TASKS.map((task) => (
            <Link key={task.href} href={`/${locale}${task.href}`} className={styles.task}>
              <span className={styles.taskIcon} aria-hidden>
                {task.icon}
              </span>
              <span className={styles.taskBody}>
                <strong>{label(task.uz, task.ru)}</strong>
                <span>{label(task.noteUz, task.noteRu)}</span>
              </span>
              <span className={styles.taskArrow} aria-hidden>
                →
              </span>
            </Link>
          ))}
        </div>

        {items.length === 0 ? (
          <div className="alv-card alv-empty" style={{ marginTop: 34 }}>
            <p className="alv-muted" style={{ margin: 0 }}>
              {label(
                'Savollar hali qo‘shilmagan. Savolingiz bo‘lsa, aloqa sahifasi orqali yozing.',
                'Вопросы пока не добавлены. Напишите нам через страницу контактов.',
              )}
            </p>
          </div>
        ) : (
          <div className={styles.groups}>
            {[
              ...grouped,
              ...(rest.length > 0
                ? [{ key: 'boshqa', uz: 'Boshqa savollar', ru: 'Другие вопросы', items: rest }]
                : []),
            ].map((group) => (
              <section key={group.key} className={styles.group}>
                <h2 className={styles.groupTitle}>{label(group.uz, group.ru)}</h2>
                <div className={styles.list}>
                  {group.items.map((item) => (
                    <details key={item.id} className={styles.qa}>
                      <summary>
                        <span>{ru ? item.questionRu : item.questionUz}</span>
                        <span className={styles.chevron} aria-hidden>
                          +
                        </span>
                      </summary>
                      <p>{ru ? item.answerRu : item.answerUz}</p>
                    </details>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <div className={styles.cta}>
          <div>
            <strong>{label('Javob topilmadimi?', 'Не нашли ответ?')}</strong>
            <p>
              {label(
                'Savolingizni yozing — ish kunlari 9:00 dan 18:00 gacha javob beramiz.',
                'Напишите нам — отвечаем в будни с 9:00 до 18:00.',
              )}
            </p>
          </div>
          <Link href={`/${locale}/aloqa`} className="alv-btn alv-btn--primary alv-btn--md">
            {label('Savol berish', 'Задать вопрос')}
          </Link>
        </div>
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
