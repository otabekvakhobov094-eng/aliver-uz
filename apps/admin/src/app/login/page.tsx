'use client';

import { useEffect, useRef, useState } from 'react';
import { LocaleSwitch } from '@/components/LocaleSwitch';
import { t } from '@/lib/i18n';
import { useRouter } from 'next/navigation';
import { Button, Card, Input } from '@aliver/ui';
import { AdminApiError, AdminNetworkError, adminApi } from '@/lib/api';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [needsTotp, setNeedsTotp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /**
   * Uzoq kutish haqidagi xabar.
   *
   * Render'ning bepul servisi 15 daqiqa trafiksiz qolsa uxlaydi va
   * uyg'onishi bir daqiqagacha ketadi. Bu paytda tugma shunchaki
   * «Tekshirilmoqda…» deb turardi va foydalanuvchi uchun bu SAYT
   * QOTIB QOLGAN degani edi — u kutmasdan sahifani yangilardi yoki
   * ketardi.
   */
  const [waking, setWaking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!busy) {
      setWaking(false);
      if (timer.current) clearTimeout(timer.current);
      return;
    }
    // To'rt soniya — oddiy javob shundan tez keladi, ya'ni xabar
    // faqat haqiqatan sekin bo'lganda chiqadi.
    timer.current = setTimeout(() => setWaking(true), 4000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [busy]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await adminApi.login(email, password, totp || undefined);

      /*
       * Sessiya HAQIQATAN ishlayotganini shu yerda tekshiramiz.
       *
       * Ilgari login 200 qaytarsa darhol panelga o'tilardi. Cookie
       * saqlanmagan bo'lsa (bu jimgina sodir bo'ladi), panel birinchi
       * so'rovda 401 olardi va yana shu sahifaga qaytarardi — natijada
       * ekran "ochilib yopilardi", xato esa ko'rinmasdi.
       *
       * Endi cookie ishlamasa foydalanuvchi login sahifasida qoladi va
       * sababini o'qiydi.
       */
      await adminApi.permissions();

      // `replace` — `push` emas: brauzerdagi "orqaga" tugmasi
      // foydalanuvchini login sahifasiga qaytarmasligi kerak.
      router.replace('/');
      router.refresh();
    } catch (err) {
      if (err instanceof AdminNetworkError) {
        setError(
          err.kind === 'timeout'
            ? 'Server javob bermadi. Bepul serverda birinchi kirish bir daqiqagacha ketishi ' +
              'mumkin — biroz kutib, «Kirish» ni yana bosing.'
            : 'Serverga ulanib bo‘lmadi. Internetni tekshirib, qayta urinib ko‘ring.',
        );
        return;
      }
      if (!(err instanceof AdminApiError)) {
        setError('Kutilmagan xatolik. Qayta urinib ko‘ring.');
        return;
      }
      if (err.message.includes('2FA')) {
        setNeedsTotp(true);
        setError(err.message);
        return;
      }
      setError(
        err.status === 401
          ? 'Email yoki parol noto‘g‘ri.'
          : err.status === 403
            ? 'Sessiya saqlanmadi. Brauzerda cookie’lar yoqilganini tekshiring.'
            : err.message,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      style={{
        display: 'grid',
        placeItems: 'center',
        minHeight: '100vh',
        padding: 20,
        // Konteyner ham kichraya olishi kerak, aks holda `100%`
        // kartochka uchun 400 px dan kichik bo'lmaydi.
        boxSizing: 'border-box',
      }}
    >
      {/*
        Kenglik QAT'IY emas.
        `width: 400` bo'lganda 375 px li telefonda kartochka ekrandan
        chiqib ketardi: maydonlarning o'ng cheti va «Kirish» tugmasi
        ko'rinmasdi, sahifa esa yon tomonga siljirdi. Admin telefondan
        ham ochiladi — kuryer va operator ko'pincha shunday ishlaydi.
      */}
      <div style={{ width: '100%', maxWidth: 400, display: 'grid', gap: 10 }}>
      {/*
        Til tanlash kirish ekranida ham kerak: rus tilida ishlaydigan
        xodim panelga KIRMASDAN oldin ham o'z tilini ko'rishi kerak.
      */}
      <div className="alv-adm__langHost--light" style={{ justifySelf: 'end' }}>
        <LocaleSwitch />
      </div>
      <Card style={{ width: '100%', padding: 28 }}>
        <h1 style={{ fontFamily: 'var(--alv-font-display)', fontSize: 24, margin: '0 0 6px' }}>
          {/*
            Rang paneldagidek: ish muhitida asosiy harakat qora,
            ko'k esa faqat HAVOLA uchun. Ilgari bu yerda havola rangi
            ishlatilgani uchun kirish ekrani ko'k, panelning o'zi
            qora bo'lib, bitta mahsulot ikki xil ko'rinardi.
          */}
          ALIVER<span style={{ color: 'var(--adm-muted)' }}>{t(".UZ")}</span> {t("Admin")}
        </h1>
        <p style={{ color: 'var(--alv-muted)', fontSize: 13, margin: '0 0 20px' }}>
          {t("Kirish uchun email va parolni kiriting.")}
        </p>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input
            name="email"
            type="email"
            label={t("Email")}
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            name="password"
            type="password"
            label={t("Parol")}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {needsTotp ? (
            <Input
              name="totp"
              label={t("2FA kodi")}
              inputMode="numeric"
              maxLength={6}
              value={totp}
              onChange={(e) => setTotp(e.target.value)}
            />
          ) : null}
          {waking ? (
            <p
              role="status"
              style={{ color: 'var(--alv-muted)', fontSize: 13, margin: 0, lineHeight: 1.6 }}
            >
              {t("Server uyg‘onmoqda — bu bir daqiqagacha ketishi mumkin. Sahifani yangilamang.")}
            </p>
          ) : null}

          {error ? (
            <p
              role="alert"
              style={{ color: 'var(--alv-brand-deep)', fontSize: 13, margin: 0, fontWeight: 600 }}
            >
              {error}
            </p>
          ) : null}
          <Button type="submit" variant="primary" size="lg" fullWidth disabled={busy}>
            {busy ? t("Tekshirilmoqda…") : t("Kirish")}
          </Button>
        </form>
      </Card>
      </div>
    </main>
  );
}
