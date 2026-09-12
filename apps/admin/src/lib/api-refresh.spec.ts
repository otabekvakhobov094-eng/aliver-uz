/**
 * Sessiya uzaytirilishi.
 *
 * Bu xato JIMGINA ishlagan: kirish tokeni 15 daqiqada tugardi, server
 * 401 qaytarardi, admin esa uni «kirmagansiz» deb tushunib login
 * oynasiga otardi — refresh tokeni cookie'da yana 30 kun yotgan
 * bo'lsa ham. Xodim forma to'ldirib turgan joyida yozganini
 * yo'qotardi. Shuning uchun bu yerda aynan takrorlash yo'li
 * tekshiriladi.
 */
import { adminApi } from './api';

type Call = { url: string; init?: RequestInit };

function mockFetch(handler: (call: Call, index: number) => Response) {
  const calls: Call[] = [];
  const fn = jest.fn((url: string, init?: RequestInit) => {
    const call = { url: String(url), init };
    calls.push(call);
    return Promise.resolve(handler(call, calls.length - 1));
  });
  (globalThis as unknown as { fetch: unknown }).fetch = fn;
  return calls;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('adminApi — 401 dan keyin uzaytirish', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('401 dan keyin refresh chaqiriladi va so‘rov takrorlanadi', async () => {
    const calls = mockFetch((call) => {
      if (call.url.endsWith('/admin/auth/refresh')) return json({ ok: true });
      return calls.filter((c) => c.url.endsWith('/admin/me')).length === 1
        ? json({ message: 'Unauthorized' }, 401)
        : json({ id: 'a1', email: 'a@b.uz' });
    });

    await expect(adminApi.me()).resolves.toMatchObject({ id: 'a1' });
    expect(calls.map((c) => c.url)).toEqual([
      expect.stringContaining('/admin/me'),
      expect.stringContaining('/admin/auth/refresh'),
      expect.stringContaining('/admin/me'),
    ]);
    expect(calls[1]!.init?.method).toBe('POST');
  });

  it('refresh ham 401 bersa xato oshkor qilinadi — cheksiz halqa yo‘q', async () => {
    const calls = mockFetch((call) =>
      call.url.endsWith('/admin/auth/refresh')
        ? json({ message: 'Sessiya yaroqsiz' }, 401)
        : json({ message: 'Unauthorized' }, 401),
    );

    await expect(adminApi.me()).rejects.toMatchObject({ status: 401 });
    expect(calls).toHaveLength(2);
  });

  it('login so‘rovining 401 i uzaytirishga urinmaydi', async () => {
    const calls = mockFetch(() => json({ message: 'Email yoki parol noto‘g‘ri' }, 401));

    await expect(adminApi.login('a@b.uz', 'x')).rejects.toMatchObject({ status: 401 });
    expect(calls.every((c) => !c.url.includes('refresh'))).toBe(true);
  });

  it('yozuv so‘rovi ham takrorlanadi — 401 amal bajarilmasdan qaytariladi', async () => {
    let saved = 0;
    const calls = mockFetch((call) => {
      if (call.url.endsWith('/admin/auth/refresh')) return json({ ok: true });
      saved += 1;
      return saved === 1 ? json({ message: 'Unauthorized' }, 401) : json({ ok: true });
    });

    await expect(adminApi.reorderMenu(['a', 'b'])).resolves.toMatchObject({ ok: true });
    expect(calls).toHaveLength(3);
    expect(saved).toBe(2);
  });
});
