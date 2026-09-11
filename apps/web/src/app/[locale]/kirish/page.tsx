'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Card, Input, OtpInput } from '@aliver/ui';
import { ApiRequestError, api } from '@/lib/api';
import { isLocale, t } from '@/i18n/messages';

/**
 * Kirish / OTP — prototipdagi "Kirish / OTP" maketi.
 * Ikki qadam: telefon -> kod. Parol yo'q (TZ 43).
 */
export default function LoginPage() {
  const router = useRouter();
  const routeParams = useParams<{ locale: string }>();
  const lang = isLocale(routeParams.locale) ? routeParams.locale : 'uz';

  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState('+998 ');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  // Kod to'lganda avtomatik tasdiqlaymiz — bitta ortiqcha bosishni olib tashlaydi.
  useEffect(() => {
    if (step === 2 && code.length === 5 && !busy) void confirm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, step]);

  async function requestCode() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.requestOtp(phone);
      setCooldown(res.resendAfterSeconds);
      setStep(2);
      setCode('');
    } catch (e) {
      if (e instanceof ApiRequestError) {
        setError(e.message);
        if (e.retryAfterSeconds) setCooldown(e.retryAfterSeconds);
      } else {
        setError(t(lang, 'common.error'));
      }
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await api.verifyOtp(phone, code);
      router.push(`/${lang}`);
    } catch (e) {
      setError(e instanceof ApiRequestError ? e.message : t(lang, 'common.error'));
      setCode('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '48px 20px' }}>
      <Card style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {step === 1 ? (
          <>
            <h1 style={{ fontFamily: 'var(--alv-font-display)', fontSize: 26, margin: 0 }}>
              {t(lang, 'auth.title')}
            </h1>
            <p style={{ color: 'var(--alv-muted)', margin: 0, lineHeight: 1.6, fontSize: 14 }}>
              {t(lang, 'auth.subtitle')}
            </p>
            <Input
              name="phone"
              label={t(lang, 'auth.phone')}
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              error={error ?? undefined}
            />
            <Button variant="primary" size="lg" fullWidth disabled={busy} onClick={requestCode}>
              {busy ? t(lang, 'common.loading') : t(lang, 'auth.getCode')}
            </Button>
            <p style={{ fontSize: 12, color: 'var(--alv-muted)', margin: 0, lineHeight: 1.5 }}>
              {t(lang, 'auth.consent')}
            </p>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep(1)}
              style={{ alignSelf: 'flex-start', padding: 0 }}
            >
              ← {t(lang, 'auth.changePhone')}
            </Button>
            <h1 style={{ fontFamily: 'var(--alv-font-display)', fontSize: 26, margin: 0 }}>
              {t(lang, 'auth.codeTitle')}
            </h1>
            <p style={{ color: 'var(--alv-muted)', margin: 0, fontSize: 14 }}>
              {t(lang, 'auth.codeSent', { phone })}
            </p>
            <OtpInput value={code} onChange={setCode} autoFocus disabled={busy} />
            {error ? (
              <p
                role="alert"
                style={{ color: 'var(--alv-brand-deep)', fontSize: 13, margin: 0, fontWeight: 600 }}
              >
                {error}
              </p>
            ) : null}
            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={busy || code.length < 5}
              onClick={confirm}
            >
              {t(lang, 'auth.confirm')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              fullWidth
              disabled={cooldown > 0 || busy}
              onClick={requestCode}
            >
              {cooldown > 0
                ? t(lang, 'auth.resendIn', { seconds: cooldown })
                : t(lang, 'auth.resend')}
            </Button>
            <p style={{ fontSize: 12, color: 'var(--alv-muted)', margin: 0, lineHeight: 1.5 }}>
              {t(lang, 'auth.limitHint')}
            </p>
          </>
        )}
      </Card>
    </main>
  );
}
