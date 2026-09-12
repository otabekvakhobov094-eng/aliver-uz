/**
 * Uxlab qolgan serverga kirgan BIRINCHI mijoz.
 *
 * Bu xato jimgina emas — u ekranga chiqadi, lekin NOTO'G'RI gapiradi:
 * «filtr noto'g'ri ko'rsatilgan» deb turadi, filtrda esa hech qanday
 * ayb yo'q. Shuning uchun bu yerda ikki narsa qo'riqlanadi: uyg'onish
 * javoblari qayta urinishga sabab bo'ladi, haqiqiy xato esa — yo'q.
 */
import { ApiAsleepError, serverGet } from './server-get';

const json = (body: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }) as unknown as Response;

function mockFetch(handler: (call: number) => Response | Promise<never>) {
  let n = 0;
  const fn = jest.fn(() => {
    n += 1;
    return Promise.resolve(handler(n));
  });
  (globalThis as unknown as { fetch: unknown }).fetch = fn;
  return fn;
}

describe('serverGet', () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['nextTick'] });
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  /**
   * Kutish soxta taymerda o'tkaziladi, lekin KUTILMA AVVAL
   * biriktiriladi: aks holda promise taymerlar yurgizilayotgan
   * paytda hech kim ushlamagan holda rad etiladi va test o'zi
   * yiqiladi.
   */
  async function run<T>(p: Promise<T>, assertion: Promise<unknown>): Promise<void> {
    await jest.runAllTimersAsync();
    await assertion;
    void p;
  }

  it('502 dan keyin qayta urinadi va ikkinchisida oladi', async () => {
    const fetchMock = mockFetch((n) => (n === 1 ? json({}, 502) : json({ ok: 1 })));
    const p = serverGet('/catalog/products');
    await run(p, expect(p).resolves.toEqual({ ok: 1 }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('uch urinish ham 502 bersa — «uxlayapti», oddiy xato emas', async () => {
    const fetchMock = mockFetch(() => json({}, 503));
    const p = serverGet('/catalog/products');
    await run(p, expect(p).rejects.toBeInstanceOf(ApiAsleepError));
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('404 qayta urinilmaydi — u qayta urinishdan o‘zgarmaydi', async () => {
    const fetchMock = mockFetch(() => json({ message: 'Topilmadi' }, 404));
    const p = serverGet('/catalog/nope');
    await run(p, expect(p).rejects.toThrow('Topilmadi'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('tarmoq uzilishi ham qayta urinishga arziydi', async () => {
    let n = 0;
    (globalThis as unknown as { fetch: unknown }).fetch = jest.fn(() => {
      n += 1;
      return n === 1
        ? Promise.reject(new TypeError('fetch failed'))
        : Promise.resolve(json({ ok: 2 }));
    });
    const p = serverGet('/catalog/products');
    await run(p, expect(p).resolves.toEqual({ ok: 2 }));
    expect(n).toBe(2);
  });
});
