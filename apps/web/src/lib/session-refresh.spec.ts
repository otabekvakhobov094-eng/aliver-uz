/**
 * Mijoz sessiyasi 15 daqiqada o'lmasligi.
 *
 * Server `POST /auth/refresh` ni berib qo'ygan, sayt esa uni hech
 * qachon chaqirmagan edi. Mijoz «kirdim» deb tursa ham, 15 daqiqadan
 * keyin kabinet va buyurtma sahifalari uni tashqariga chiqarardi.
 */
import { api } from './api';
import { isAuthPath, refreshSession } from './session-refresh';

type Call = { url: string; init?: RequestInit };

function mockFetch(handler: (call: Call, calls: Call[]) => Response) {
  const calls: Call[] = [];
  (globalThis as unknown as { fetch: unknown }).fetch = jest.fn(
    (url: string, init?: RequestInit) => {
      const call = { url: String(url), init };
      calls.push(call);
      return Promise.resolve(handler(call, calls));
    },
  );
  return calls;
}

/** jsdom da `Response` yo'q — kerakli qismi qo'lda yasaladi. */
const json = (body: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }) as unknown as Response;

describe('mijoz sessiyasini uzaytirish', () => {
  it('kirish yo‘llari uzaytirilmaydi', () => {
    expect(isAuthPath('/auth/otp/verify')).toBe(true);
    expect(isAuthPath('/auth/refresh')).toBe(true);
    expect(isAuthPath('/auth/me')).toBe(false);
  });

  it('bir vaqtda kelgan ikki 401 uchun refresh BIR MARTA ketadi', async () => {
    const calls = mockFetch((call, all) => {
      if (call.url.endsWith('/auth/refresh')) return json({ ok: true });
      const mine = all.filter((c) => c.url.includes('/auth/me')).length;
      return mine <= 2 ? json({ message: 'Unauthorized' }, 401) : json({ id: 'c1' });
    });

    await Promise.all([refreshSession(), refreshSession()]);
    expect(calls.filter((c) => c.url.endsWith('/auth/refresh'))).toHaveLength(1);
  });

  it('401 dan keyin so‘rov takrorlanadi', async () => {
    const calls = mockFetch((call, all) => {
      if (call.url.endsWith('/auth/refresh')) return json({ ok: true });
      return all.filter((c) => c.url.includes('/auth/me')).length === 1
        ? json({ message: 'Unauthorized' }, 401)
        : json({ id: 'c1' });
    });

    await expect(api.me()).resolves.toMatchObject({ id: 'c1' });
    expect(calls.map((c) => c.url)).toEqual([
      expect.stringContaining('/auth/me'),
      expect.stringContaining('/auth/refresh'),
      expect.stringContaining('/auth/me'),
    ]);
  });

  it('refresh ham rad etsa xato oshkor bo‘ladi', async () => {
    const calls = mockFetch(() => json({ message: 'Unauthorized' }, 401));
    await expect(api.me()).rejects.toMatchObject({ status: 401 });
    expect(calls).toHaveLength(2);
  });
});
