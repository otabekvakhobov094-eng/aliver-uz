import { auditIp } from './client-ip';

/**
 * Audit jurnalidagi «qayerdan» ustuni.
 *
 * Jonli bazada bu ustunda `::1` turardi — ya'ni operator emas,
 * proksi. Ustun to'lgan, foydasi esa yo'q edi.
 */
describe('auditIp', () => {
  it('adminka proksisi orqali kelgan haqiqiy manzilni oladi', () => {
    expect(
      auditIp({ ip: '::1', headers: { 'x-forwarded-for': '84.54.100.5, 10.0.0.7' } }),
    ).toBe('84.54.100.5');
  });

  it('sarlavha yo‘q bo‘lsa — to‘g‘ridan-to‘g‘ri manzil', () => {
    expect(auditIp({ ip: '84.54.100.5', headers: {} })).toBe('84.54.100.5');
  });

  it('faqat ichki manzil bo‘lsa — bo‘sh, chunki yolg‘on yozishdan ko‘ra yo‘q yaxshiroq', () => {
    expect(auditIp({ ip: '::1', headers: { 'x-forwarded-for': '127.0.0.1, ::1' } })).toBeNull();
  });

  it('sarlavha massiv bo‘lsa ham ishlaydi', () => {
    expect(auditIp({ ip: null, headers: { 'x-forwarded-for': ['84.54.100.5'] } })).toBe(
      '84.54.100.5',
    );
  });

  it('bo‘sh qiymatlar sakrab o‘tiladi', () => {
    expect(auditIp({ ip: null, headers: { 'x-forwarded-for': ' , , 84.54.100.5' } })).toBe(
      '84.54.100.5',
    );
  });
});
