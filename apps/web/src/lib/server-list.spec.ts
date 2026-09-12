/**
 * Ro'yxat kutilgan joyda kutilmagan javob kelsa NIMA BO'LADI.
 *
 * Bu savol nazariy emas: web va API alohida deploy qilinadi, uxlab
 * qolgan servis esa JSON o'rniga proksi xato sahifasini qaytaradi.
 * Ilgari shunday javob `categories.map(...)` da yiqilib, BUTUN
 * sahifani 500 ga aylantirardi — mijoz «Sayt vaqtincha ishlamayapti»
 * ekranini ko'rardi, holbuki faqat bitta blok yuklanmagan edi.
 */
import { asList, serverList } from './server-get';

const res = (body: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }) as unknown as Response;

describe('serverList', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("ro'yxat kelsa — o'sha ro'yxat", async () => {
    (globalThis as unknown as { fetch: unknown }).fetch = jest.fn(() =>
      Promise.resolve(res([{ slug: 'yuz-parvarishi' }])),
    );
    await expect(serverList('/catalog/categories')).resolves.toEqual([{ slug: 'yuz-parvarishi' }]);
  });

  it("obyekt kelsa — bo'sh ro'yxat, xato emas", async () => {
    (globalThis as unknown as { fetch: unknown }).fetch = jest.fn(() =>
      Promise.resolve(res({ items: [], total: 0 })),
    );
    await expect(serverList('/catalog/categories')).resolves.toEqual([]);
  });

  it("so'rov umuman yiqilsa ham — bo'sh ro'yxat", async () => {
    (globalThis as unknown as { fetch: unknown }).fetch = jest.fn(() =>
      Promise.reject(new Error('tarmoq yo‘q')),
    );
    await expect(serverList('/content/faq')).resolves.toEqual([]);
  });
});

describe('asList', () => {
  it.each([
    [null],
    [undefined],
    [{ items: [] }],
    ['<html>502 Bad Gateway</html>'],
    [42],
  ])("ro'yxat bo'lmagan qiymat — bo'sh ro'yxat (%p)", (value) => {
    expect(asList(value)).toEqual([]);
  });

  it("ro'yxatni o'zgartirmaydi", () => {
    const list = [1, 2, 3];
    expect(asList(list)).toBe(list);
  });
});
