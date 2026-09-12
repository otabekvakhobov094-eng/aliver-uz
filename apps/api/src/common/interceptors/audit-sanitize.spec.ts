import { sanitize } from './audit-log.interceptor';

/**
 * Audit jurnaliga nima tushadi va nima tushmaydi.
 *
 * Sovg'a sertifikati kodi bazada faqat XESH holida saqlanadi, ochiq
 * matni esa bir marta — yaratish javobida — ko'rsatiladi. O'sha javob
 * audit jurnaliga aynan o'shanday yozilardi: `audit.view` huquqiga
 * ega har qanday xodim (hatto sertifikat bera olmaydigani ham)
 * berilgan barcha kodlarni o'qib olardi, jurnal esa o'chirilmaydi.
 */
describe('audit sanitize', () => {
  it('parol va xeshlar hech qachon yozilmaydi', () => {
    const out = sanitize({ email: 'a@b.uz', password: 'x', passwordHash: 'y', token: 'z' }) as Record<
      string,
      unknown
    >;
    expect(out).toEqual({ email: 'a@b.uz' });
  });

  it('sovg‘a sertifikati kodi yozilmaydi', () => {
    const out = sanitize(
      { id: 'g1', code: 'ALV-7K3P-XXXX-YYYY-ZZZZ', amount: 50_000_000n },
      0,
      'gift_cards',
    ) as Record<string, unknown>;
    expect(out).not.toHaveProperty('code');
    expect(out).toMatchObject({ id: 'g1', amount: '50000000' });
  });

  it('chegirma promo-kodi esa YOZILADI — u pul emas, u jurnalda kerak', () => {
    const out = sanitize({ id: 'd1', code: 'ALIVER10' }, 0, 'discounts') as Record<string, unknown>;
    expect(out).toMatchObject({ code: 'ALIVER10' });
  });

  it('ichma-ich joylashgan kodni ham topadi', () => {
    const out = sanitize(
      { items: [{ code: 'ALV-1', amount: 1n }] },
      0,
      'gift_cards',
    ) as { items: Array<Record<string, unknown>> };
    expect(out.items[0]).not.toHaveProperty('code');
  });

  it('BigInt satrga o‘giriladi — JSON uni ko‘tara olmaydi', () => {
    expect(sanitize({ amount: 12n })).toEqual({ amount: '12' });
  });
});
