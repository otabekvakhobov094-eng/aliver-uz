import { UTF8_BOM, csvCell, tiyinToSum, toCsv } from './report-csv';

describe('CSV katakchasi', () => {
  it('oddiy matn tegilmaydi', () => {
    expect(csvCell('Batana moyi')).toBe('Batana moyi');
  });

  it('nuqta-vergul qo‘shtirnoqqa olinadi — aks holda ustun siljiydi', () => {
    expect(csvCell('Moy; 60 ml')).toBe('"Moy; 60 ml"');
  });

  it('qo‘shtirnoq ikkilantiriladi', () => {
    expect(csvCell('60 ml "yangi"')).toBe('"60 ml ""yangi"""');
  });

  it('yangi qator qo‘shtirnoqqa olinadi', () => {
    expect(csvCell('birinchi\nikkinchi')).toBe('"birinchi\nikkinchi"');
  });

  /**
   * Mahsulot nomi Excel'da formulaga aylanib ketmasligi kerak: nomni
   * adminkada kim bo'lsa ham yozadi, fayl esa buxgalterda ochiladi.
   */
  it('formula belgisi bilan boshlangan qiymat zararsizlantiriladi', () => {
    expect(csvCell('=1+1')).toBe("'=1+1");
    expect(csvCell('+79001234567')).toBe("'+79001234567");
    expect(csvCell('-2')).toBe("'-2");
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
  });

  it('zararsizlantirilgan qiymat ham kerak bo‘lsa qo‘shtirnoqqa olinadi', () => {
    expect(csvCell('=A1;B1')).toBe('"\'=A1;B1"');
  });
});

describe('tiyindan so‘mga', () => {
  it('butun songa aylantiradi', () => {
    expect(tiyinToSum(18900000n)).toBe('189000');
  });

  it('bo‘sh qiymat nol bo‘ladi', () => {
    expect(tiyinToSum(null)).toBe('0');
    expect(tiyinToSum(undefined)).toBe('0');
  });

  it('tiyin qoldig‘i pastga tashlanadi, yaxlitlanmaydi', () => {
    expect(tiyinToSum(18900050n)).toBe('189000');
  });
});

describe('CSV yig‘ish', () => {
  it('qatorlar CRLF bilan, ustunlar nuqta-vergul bilan ajratiladi', () => {
    expect(toCsv([['a', 'b'], ['c', 'd']])).toBe('a;b\r\nc;d');
  });

  it('BOM Excel uchun — u bo‘lmasa o‘zbek harflari buziladi', () => {
    expect(UTF8_BOM).toBe('﻿');
  });
});
