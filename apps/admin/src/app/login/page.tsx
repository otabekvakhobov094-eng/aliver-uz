'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Input } from '@aliver/ui';
import { AdminApiError, adminApi } from '@/lib/api';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [needsTotp, setNeedsTotp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await adminApi.login(email, password, totp || undefined);
      // Panelga o'tishdan avval cookie/sessiya haqiqatan ishlashini tekshiramiz.
      await adminApi.permissions();
      router.replace('/');
      router.refresh();
    } catch (err) {
      const msg =
        err instanceof AdminApiError && err.status === 401
          ? 'Email yoki parol noto‘g‘ri, yoxud login sessiyasi saqlanmadi.'
          : err instanceof AdminApiError
            ? err.message
            : 'Server bilan bog‘lanishda xatolik yuz berdi. Qayta urinib ko‘ring.';
      if (msg.includes('2FA')) setNeedsTotp(true);
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: 20 }}>
      <Card style={{ width: 400, padding: 28 }}>
        <h1 style={{ fontFamily: 'var(--alv-font-display)', fontSize: 24, margin: '0 0 6px' }}>
          ALIVER<span style={{ color: 'var(--alv-brand)' }}>.UZ</span> Admin
        </h1>
        <p style={{ color: 'var(--alv-muted)', fontSize: 13, margin: '0 0 20px' }}>
          Kirish uchun email va parolni kiriting.
        </p>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input
            name="email"
            type="email"
            label="Email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            name="password"
            type="password"
            label="Parol"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {needsTotp ? (
            <Input
              name="totp"
              label="2FA kodi"
              inputMode="numeric"
              maxLength={6}
              value={totp}
              onChange={(e) => setTotp(e.target.value)}
            />
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
            {busy ? 'Tekshirilmoqda…' : 'Kirish'}
          </Button>
        </form>
      </Card>
    </main>
  );
}
