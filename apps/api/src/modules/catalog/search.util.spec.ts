import {
  buildProductSearchText,
  levenshtein,
  normalizeSearch,
  searchTokens,
  similarity,
} from './search.util';

describe('qidiruv normalizatsiyasi', () => {
  it('kirill va lotin bir xil natija beradi', () => {
    expect(normalizeSearch('шампун')).toBe(normalizeSearch('shampun'));
    expect(normalizeSearch('ШАМПУНЬ')).toBe('shampun');
  });

  it('o‘zbek kirill harflarini o‘giradi', () => {
    expect(normalizeSearch('ЎҚҒҲ')).toBe('oqgh');
  });

  it('apostroflarning barcha ko‘rinishini olib tashlaydi', () => {
    const variants = ['bo‘yoq', "bo'yoq", 'boʻyoq', 'bo`yoq', 'boyoq'];
    const normalized = variants.map(normalizeSearch);
    expect(new Set(normalized).size).toBe(1);
    expect(normalized[0]).toBe('boyoq');
  });

  it('ruscha so‘zlarni o‘giradi', () => {
    expect(normalizeSearch('крем для лица')).toBe('krem dlya litsa');
    expect(normalizeSearch('масло')).toBe('maslo');
  });

  it('ortiqcha belgilar va bo‘shliqlarni tozalaydi', () => {
    expect(normalizeSearch('  Rosemary,   100 ml!  ')).toBe('rosemary 100 ml');
  });

  it('bo‘sh qiymatni ushlaydi', () => {
    expect(normalizeSearch('')).toBe('');
  });
});

describe('so‘rov bo‘laklari', () => {
  it('qisqa bo‘laklarni tashlaydi', () => {
    expect(searchTokens('крем для лица')).toEqual(['krem', 'dlya', 'litsa']);
    expect(searchTokens('a bc def')).toEqual(['bc', 'def']);
  });
});

describe('mahsulot qidiruv matni', () => {
  const text = buildProductSearchText({
    nameUz: 'ALIVER Rosemary soch o‘sishi uchun moy',
    nameRu: 'ALIVER Rosemary масло для роста волос',
    skus: ['ALV-RSM-060'],
    barcodes: ['4780012345678', null],
    tags: ['soch', 'moy'],
  });

  it('kirillcha so‘rov bilan topiladi', () => {
    expect(text).toContain(normalizeSearch('масло'));
    expect(text).toContain(normalizeSearch('волос'));
  });

  it('lotincha so‘rov bilan ham topiladi', () => {
    expect(text).toContain('soch');
    expect(text).toContain('rosemary');
  });

  it('SKU va barcode bo‘yicha topiladi', () => {
    expect(text).toContain('alv-rsm-060');
    expect(text).toContain('4780012345678');
  });

  it('so‘zlar takrorlanmaydi', () => {
    const words = text.split(' ');
    expect(new Set(words).size).toBe(words.length);
  });
});

describe('imlo xatosiga chidamlilik', () => {
  it('levenshtein masofasini hisoblaydi', () => {
    expect(levenshtein('shampun', 'shampun')).toBe(0);
    expect(levenshtein('shampun', 'shampon')).toBe(1);
    expect(levenshtein('', 'abc')).toBe(3);
  });

  it('bitta harf xato bo‘lsa ham yaqinlik yuqori', () => {
    expect(similarity('shampun', 'shampon')).toBeGreaterThan(0.8);
    expect(similarity('шампунь', 'shampon')).toBeGreaterThan(0.8);
  });

  it('umuman boshqa so‘zlar uchun yaqinlik past', () => {
    expect(similarity('shampun', 'lipstick')).toBeLessThan(0.4);
  });
});
