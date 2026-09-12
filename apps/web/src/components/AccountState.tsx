'use client';

import Link from 'next/link';
import { Button } from '@aliver/ui';
import { AccountCard } from './AccountShell';
import type { AccountState as State } from './useAccountData';
import type { Locale } from '@/i18n/messages';

/**
 * Kabinetdagi yuklash va xato ekranlari — bir joyda.
 *
 * Har bir holat uchun AMAL taklif qilinadi. Faqat xato matnini
 * ko'rsatish foydalanuvchini boshi berk ko'chaga olib boradi: u
 * sahifani qayta yuklaydi va yana o'sha yozuvni ko'radi.
 */
export function AccountStateView({
  state,
  locale,
  onRetry,
}: {
  state: State;
  locale: Locale;
  onRetry: () => void;
}) {
  const ru = locale === 'ru';
  const t = (uz: string, rus: string) => (ru ? rus : uz);

  if (state.status === 'loading') {
    return (
      <div style={{ display: 'grid', gap: 8 }}>
        <p style={{ color: 'var(--alv-muted)', margin: 0 }}>
          {t('Yuklanmoqda…', 'Загрузка…')}
        </p>
        {/*
          Sekin javob — bu xato emas, lekin jim turish ham to'g'ri emas.
          Render'ning bepul serveri uxlab qolgan bo'lsa, birinchi so'rov
          bir daqiqagacha cho'zilishi mumkin.
        */}
        {state.slow ? (
          <p style={{ color: 'var(--alv-muted)', margin: 0, fontSize: 13, maxWidth: 420, lineHeight: 1.6 }}>
            {t(
              'Server uyg‘onmoqda — bu bir daqiqagacha davom etishi mumkin. Sahifani yopmang.',
              'Сервер просыпается — это может занять до минуты. Не закрывайте страницу.',
            )}
          </p>
        ) : null}
      </div>
    );
  }

  if (state.status === 'auth') {
    return (
      <AccountCard>
        <p style={{ margin: '0 0 12px', color: 'var(--alv-ink-2)', lineHeight: 1.6 }}>
          {t(
            'Kabinetni ko‘rish uchun telefon raqamingiz bilan kiring.',
            'Чтобы открыть кабинет, войдите по номеру телефона.',
          )}
        </p>
        {/* Tugma o'z kengligida qolsin: karta `grid` va usiz u butun
            qatorni egallab, «katta qizil chiziq» bo'lib ko'rinadi. */}
        <div style={{ display: 'flex' }}>
          <Link href={`/${locale}/kirish`} className="alv-btn alv-btn--primary alv-btn--md">
            {t('Kirish', 'Войти')}
          </Link>
        </div>
      </AccountCard>
    );
  }

  if (state.status === 'offline') {
    return (
      <AccountCard>
        <p style={{ margin: '0 0 12px', color: 'var(--alv-ink-2)', lineHeight: 1.6 }}>
          {state.kind === 'timeout'
            ? t(
                'Server javob bermadi. Bir oz kutib, qayta urinib ko‘ring.',
                'Сервер не ответил. Подождите немного и попробуйте снова.',
              )
            : t(
                'Internetga ulanib bo‘lmadi. Ulanishni tekshiring.',
                'Нет соединения с интернетом. Проверьте подключение.',
              )}
        </p>
        <div style={{ display: 'flex' }}>
          <Button variant="outline" onClick={onRetry}>
            {t('Qayta urinish', 'Повторить')}
          </Button>
        </div>
      </AccountCard>
    );
  }

  if (state.status === 'error') {
    return (
      <AccountCard>
        <p style={{ margin: '0 0 12px', color: 'var(--alv-danger)', lineHeight: 1.6 }}>
          {state.message}
        </p>
        <div style={{ display: 'flex' }}>
          <Button variant="outline" onClick={onRetry}>
            {t('Qayta urinish', 'Повторить')}
          </Button>
        </div>
      </AccountCard>
    );
  }

  return null;
}
