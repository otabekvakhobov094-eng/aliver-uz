import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ORDER_STATUS_LABEL, ORDER_STATUS_TONE, fmtDate, fmtNumber, reservationLeft, sumInputToTiyin, tiyinToSumInput } from './order-labels';

/**
 * Admin panel statuslarni o'zbekcha ko'rsatadi. Agar schema ga yangi status
 * qo'shilsa-yu, bu yerga qo'shilmasa — admin xom "RETURN_REQUESTED" ni
 * ko'radi. Shu sababli ro'yxat schema bilan solishtiriladi.
 */
function schemaOrderStatuses(): string[] {
  const schema = readFileSync(join(__dirname, '../../../api/prisma/schema.prisma'), 'utf8');
  const block = /enum\s+OrderStatus\s*\{([^}]+)\}/.exec(schema);
  if (!block) throw new Error('schema.prisma da OrderStatus enum topilmadi');
  return block[1]!
    .split('\n')
    .map((l) => l.replace(/\/\/.*$/, '').trim())
    .filter((l) => l.length > 0 && /^[A-Z_]+$/.test(l));
}

describe('order-labels', () => {
  it('har bir status uchun o‘zbekcha nom bor', () => {
    for (const status of schemaOrderStatuses()) {
      expect(ORDER_STATUS_LABEL[status]).toBeDefined();
      expect(ORDER_STATUS_TONE[status]).toBeDefined();
    }
  });

  it('rezerv muddati o‘tgani ko‘rsatiladi', () => {
    expect(reservationLeft(null)).toBeNull();
    expect(reservationLeft(new Date(Date.now() - 60_000).toISOString())).toBe('muddati o‘tgan');
    expect(reservationLeft(new Date(Date.now() + 10 * 60_000).toISOString())).toBe('10 daq.');
  });
});

describe('so‘m va tiyin', () => {
  it('tiyinni so‘m ko‘rinishiga o‘giradi', () => {
    expect(tiyinToSumInput('18900000')).toBe('189000.00');
    expect(tiyinToSumInput('1')).toBe('0.01');
    expect(tiyinToSumInput('0')).toBe('0.00');
  });

  it('so‘mni tiyinga aniq o‘giradi', () => {
    expect(sumInputToTiyin('189000')).toBe(18_900_000n);
    expect(sumInputToTiyin('0.29')).toBe(29n);
    expect(sumInputToTiyin('1 000')).toBeNull();
    expect(sumInputToTiyin('12,50')).toBe(1250n);
  });

  it('noto‘g‘ri qiymatni rad etadi', () => {
    expect(sumInputToTiyin('abc')).toBeNull();
    expect(sumInputToTiyin('-5')).toBeNull();
    expect(sumInputToTiyin('1.234')).toBeNull();
  });

  it('ikki tomonlama o‘girish qiymatni saqlaydi', () => {
    for (const t of ['0', '1', '99', '100', '123456789']) {
      expect(sumInputToTiyin(tiyinToSumInput(t))?.toString()).toBe(t);
    }
  });
});

describe('sana va son formati', () => {
  /*
   * Kod `toLocaleDateString('uz-UZ', { month: 'short' })` ishlatardi.
   * Brauzerlarda o'zbekcha oy nomlari yo'q va natija «2026 M08 14»
   * bo'lib chiqardi — hisobot sarlavhasida aynan shunday turgan edi.
   * Bunday xato brauzerga qarab paydo bo'ladi, ya'ni ba'zi
   * mashinalarda umuman ko'rinmaydi.
   */
  it('sana kun.oy.yil tartibida', () => {
    expect(fmtDate('2026-09-12T10:00:00Z')).toBe('12.09.2026');
    expect(fmtDate('2026-01-05T00:00:00Z')).toBe('05.01.2026');
  });

  it('Date obyekti ham qabul qilinadi', () => {
    expect(fmtDate(new Date('2026-08-14T00:00:00Z'))).toBe('14.08.2026');
  });

  it('bo‘sh va noto‘g‘ri sana tire beradi', () => {
    expect(fmtDate(null)).toBe('—');
    expect(fmtDate('')).toBe('—');
    expect(fmtDate('salom')).toBe('—');
  });

  it('son minglik bo‘shliq bilan ajratiladi', () => {
    expect(fmtNumber(1004)).toBe('1 004');
    expect(fmtNumber(1234567)).toBe('1 234 567');
    expect(fmtNumber(999)).toBe('999');
    expect(fmtNumber(0)).toBe('0');
  });

  it('kasr son yaxlitlanadi', () => {
    expect(fmtNumber(1500.6)).toBe('1 501');
  });
});
