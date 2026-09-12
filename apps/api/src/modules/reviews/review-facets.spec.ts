import {
  type ReviewRowLike,
  applyFilter,
  isAgeBand,
  isSkinType,
  summarise,
} from './review-facets';

function row(over: Partial<ReviewRowLike> = {}): ReviewRowLike {
  return {
    rating: 5,
    skinType: null,
    hairType: null,
    ageBand: null,
    mediaUrls: [],
    isVerified: false,
    ...over,
  };
}

describe('Sharh xulosasi', () => {
  it('bo‘sh ro‘yxat nol beradi, NaN emas', () => {
    const s = summarise([]);
    expect(s.count).toBe(0);
    expect(s.avg).toBe(0);
    expect(Number.isNaN(s.avg)).toBe(false);
  });

  it('o‘rtacha bitta kasrgacha yaxlitlanadi', () => {
    // 5,5,5,4,4,4,4 → 4.428… → 4.4
    const rows = [5, 5, 5, 4, 4, 4, 4].map((rating) => row({ rating }));
    expect(summarise(rows).avg).toBe(4.4);
  });

  it('yulduz taqsimoti to‘liq: nolli yulduz ham qatorda qoladi', () => {
    const s = summarise([row({ rating: 5 }), row({ rating: 5 }), row({ rating: 3 })]);
    expect(s.stars).toEqual({ 1: 0, 2: 0, 3: 1, 4: 0, 5: 2 });
  });

  it('rasmli va tasdiqlangan sharhlar alohida sanaladi', () => {
    const s = summarise([
      row({ mediaUrls: ['a.jpg'], isVerified: true }),
      row({ mediaUrls: [] as string[], isVerified: true }),
      row(),
    ]);
    expect(s.withPhoto).toBe(1);
    expect(s.verified).toBe(2);
  });

  /**
   * Fasetlar tartibi e'lon qilingan ro'yxat bo'yicha, sanoq bo'yicha
   * emas. Aks holda sahifa har yangilanganda filtrlar joyini
   * o'zgartirardi va mijoz kerakli tugmani qidirib qolardi.
   */
  it('fasetlar barqaror tartibda, sanoq bo‘yicha emas', () => {
    const s = summarise([
      row({ skinType: 'SENSITIVE' }),
      row({ skinType: 'SENSITIVE' }),
      row({ skinType: 'SENSITIVE' }),
      row({ skinType: 'DRY' }),
    ]);
    expect(s.skin.map((x) => x.value)).toEqual(['DRY', 'SENSITIVE']);
    expect(s.skin.map((x) => x.count)).toEqual([1, 3]);
  });

  it('bo‘sh faset ro‘yxatga tushmaydi', () => {
    const s = summarise([row({ skinType: 'DRY' })]);
    expect(s.skin).toHaveLength(1);
    expect(s.hair).toHaveLength(0);
    expect(s.age).toHaveLength(0);
  });
});

describe('Sharh filtri', () => {
  const rows = [
    row({ rating: 5, skinType: 'DRY', ageBand: 'FROM_35_TO_44', isVerified: true }),
    row({ rating: 4, skinType: 'OILY', ageBand: 'UNDER_25', mediaUrls: ['a.jpg'] }),
    row({ rating: 5, skinType: 'DRY', ageBand: 'UNDER_25' }),
    row({ rating: 3 }),
  ];

  it('filtrsiz hammasi qaytadi', () => {
    expect(applyFilter(rows, {})).toHaveLength(4);
  });

  it('teri turi bo‘yicha', () => {
    expect(applyFilter(rows, { skinType: 'DRY' })).toHaveLength(2);
  });

  it('bir nechta shart birga ishlaydi', () => {
    expect(applyFilter(rows, { skinType: 'DRY', ageBand: 'UNDER_25' })).toHaveLength(1);
  });

  /**
   * «Quruq teri» ni tanlagan mijoz aynan quruq terilinikini so'rayapti,
   * teri turi NOMA'LUM odamning sharhini emas.
   */
  it('atributi bo‘sh sharh atribut filtrida chiqmaydi', () => {
    const filtered = applyFilter(rows, { skinType: 'DRY' });
    expect(filtered.every((r) => r.skinType === 'DRY')).toBe(true);
  });

  it('yulduz bo‘yicha aniq mos kelish', () => {
    expect(applyFilter(rows, { rating: 5 })).toHaveLength(2);
    expect(applyFilter(rows, { rating: 1 })).toHaveLength(0);
  });

  it('faqat rasmli va faqat tasdiqlangan', () => {
    expect(applyFilter(rows, { withPhoto: true })).toHaveLength(1);
    expect(applyFilter(rows, { verifiedOnly: true })).toHaveLength(1);
  });
});

describe('Atribut tekshiruvi', () => {
  it('faqat ma’lum qiymatlar qabul qilinadi', () => {
    expect(isSkinType('DRY')).toBe(true);
    expect(isSkinType('WET')).toBe(false);
    expect(isSkinType(null)).toBe(false);
    expect(isAgeBand('OVER_45')).toBe(true);
    expect(isAgeBand('99')).toBe(false);
  });
});

describe('Faset sonlari nimani anglatadi', () => {
  /**
   * Faset sanoqlari BARCHA sharhlardan hisoblanadi, filtrlangan
   * qismdan emas — «shu filtrni qo'ysam nechta qoladi» degan savolga
   * javob berishi uchun. Aks holda birinchi filtrdan keyin qolgan
   * hamma faset nolga tushib, mijoz filtrni almashtira olmay qolardi.
   */
  it('filtrdan keyin ham boshqa fasetlar ko‘rinib turadi', () => {
    const all = [
      row({ skinType: 'DRY' }),
      row({ skinType: 'OILY' }),
      row({ skinType: 'OILY' }),
    ];
    const summary = summarise(all); // butun ro'yxatdan
    const filtered = applyFilter(all, { skinType: 'DRY' });

    expect(filtered).toHaveLength(1);
    // Xulosa o'zgarmaydi: OILY hali ham 2 ta deb ko'rsatiladi.
    expect(summary.skin.find((s) => s.value === 'OILY')?.count).toBe(2);
  });
});
