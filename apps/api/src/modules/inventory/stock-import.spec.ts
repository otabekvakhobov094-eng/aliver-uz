import { parseQuantity, parseStockFile } from './stock-import';

/**
 * Qoldiq faylini o'qish.
 *
 * Ombordagi xato jimgina zarar keltiradi: mavjud bo'lmagan tovar
 * sotiladi va buyurtmani bekor qilishga to'g'ri keladi. Shuning
 * uchun shubhali qator o'tkazib yuborilmaydi — u xabar bilan
 * qaytariladi.
 */

describe('parseQuantity', () => {
  it('butun son o‘qiladi', () => {
    expect(parseQuantity('12')).toBe(12);
    expect(parseQuantity(' 40 ')).toBe(40);
  });

  it('minglik ajratgichi bilan yozilgan son', () => {
    expect(parseQuantity('1 200')).toBe(1200);
  });

  it('nol — haqiqiy qiymat, «yo‘q» emas', () => {
    expect(parseQuantity('0')).toBe(0);
  });

  it('kasr son RAD ETILADI', () => {
    // Dona bo'linmaydi. Yaxlitlab o'tkazib yuborish omborni
    // jimgina noto'g'ri qilardi.
    expect(parseQuantity('2,5')).toBeNull();
    expect(parseQuantity('2.5')).toBeNull();
  });

  it('manfiy son rad etiladi', () => {
    expect(parseQuantity('-3')).toBeNull();
  });

  it('matn rad etiladi', () => {
    expect(parseQuantity('bor')).toBeNull();
    expect(parseQuantity('')).toBeNull();
  });
});

describe('parseStockFile', () => {
  it('oddiy fayl o‘qiladi', () => {
    const res = parseStockFile('SKU;Qoldiq\nALV-1;12\nALV-2;0');
    expect(res.rows).toEqual([
      { sku: 'ALV-1', quantity: 12, line: 2 },
      { sku: 'ALV-2', quantity: 0, line: 3 },
    ]);
    expect(res.problems).toHaveLength(0);
  });

  it('SKU katta harfga keltiriladi', () => {
    // Excel'da qo'lda yozilgan SKU kichik harfda bo'lishi mumkin.
    expect(parseStockFile('sku;qoldiq\nalv-1;5').rows[0]!.sku).toBe('ALV-1');
  });

  it('ruscha sarlavhalar tushuniladi', () => {
    const res = parseStockFile('Артикул;Остаток\nALV-9;7');
    expect(res.rows[0]).toMatchObject({ sku: 'ALV-9', quantity: 7 });
  });

  it('ustun TARTIBI emas, NOMI muhim', () => {
    const res = parseStockFile('Qoldiq;Nomi;SKU\n15;Krem;ALV-3');
    expect(res.rows[0]).toMatchObject({ sku: 'ALV-3', quantity: 15 });
  });

  it('vergul bilan ajratilgan fayl ham o‘qiladi', () => {
    expect(parseStockFile('sku,qty\nALV-4,9').rows[0]!.quantity).toBe(9);
  });

  it('BOM sarlavhani buzmaydi', () => {
    expect(parseStockFile('﻿SKU;Qoldiq\nALV-5;3').rows).toHaveLength(1);
  });

  it('o‘qib bo‘lmagan qator JIM tashlanmaydi', () => {
    const res = parseStockFile('SKU;Qoldiq\nALV-1;12\n;5\nALV-3;xato');
    expect(res.rows).toHaveLength(1);
    expect(res.problems.map((p) => p.line)).toEqual([3, 4]);
  });

  it('takroriy SKU da oxirgisi olinadi va ogohlantiriladi', () => {
    const res = parseStockFile('SKU;Qoldiq\nALV-1;5\nALV-1;9');
    expect(res.rows).toEqual([{ sku: 'ALV-1', quantity: 9, line: 3 }]);
    expect(res.problems[0]!.reason).toContain('takrorlandi');
  });

  it('ustun topilmasa import bajarilmaydi', () => {
    const res = parseStockFile('nomi;narxi\nKrem;1000');
    expect(res.rows).toHaveLength(0);
    expect(res.problems[0]!.reason).toContain('topilmadi');
  });

  it('bo‘sh fayl aniq sabab bilan rad etiladi', () => {
    expect(parseStockFile('').problems[0]!.reason).toContain('bo‘sh');
  });

  it('qaysi ustun tanlangani qaytariladi', () => {
    expect(parseStockFile('SKU;Qoldiq\nALV-1;1').columns).toEqual({
      sku: 'SKU',
      quantity: 'Qoldiq',
    });
  });
});
