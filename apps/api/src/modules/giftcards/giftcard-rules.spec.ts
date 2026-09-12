import {
  cardState,
  generateCode,
  hashCode,
  maskCode,
  normaliseCode,
  planGiftUse,
} from './giftcard-rules';

describe('Sertifikat kodi', () => {
  it('shakli barqaror: ALV va to‘rtta guruh', () => {
    expect(generateCode()).toMatch(/^ALV-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  });

  /**
   * Kod telefonda aytiladi va qo'lda teriladi. Bitta noto'g'ri
   * o'qilgan harf — qo'llab-quvvatlashga qo'ng'iroq.
   */
  it('chalkashadigan belgilar yo‘q: I, O, 0, 1', () => {
    const codes = Array.from({ length: 200 }, () => generateCode()).join('');
    expect(codes).not.toMatch(/[IO01]/);
  });

  it('kodlar takrorlanmaydi', () => {
    const set = new Set(Array.from({ length: 500 }, () => generateCode()));
    expect(set.size).toBe(500);
  });

  it('normal shakl: probel, kichik harf va tirelar ahamiyatsiz', () => {
    const a = normaliseCode('alv-ab2c-de3f-gh4j-kl5m');
    const b = normaliseCode('  ALV AB2C DE3F GH4J KL5M ');
    expect(a).toBe(b);
    expect(a).toBe('AB2CDE3FGH4JKL5M');
  });
});

describe('Kod xeshi', () => {
  it('bir xil kod bir xil xesh beradi, yozilishidan qat’i nazar', () => {
    expect(hashCode('ALV-AB2C-DE3F-GH4J-KL5M', 's')).toBe(hashCode('ab2c de3f gh4j kl5m', 's'));
  });

  it('boshqa kod boshqa xesh', () => {
    expect(hashCode('ALV-AAAA-AAAA-AAAA-AAAA', 's')).not.toBe(
      hashCode('ALV-AAAA-AAAA-AAAA-AAAB', 's'),
    );
  });

  /**
   * Sir bo'lmasa, bazani ko'rgan odam barcha mumkin bo'lgan kodlarning
   * xeshini oldindan hisoblab qo'ya olardi.
   */
  it('sir o‘zgarsa xesh ham o‘zgaradi', () => {
    expect(hashCode('ALV-AAAA-AAAA-AAAA-AAAA', 's1')).not.toBe(
      hashCode('ALV-AAAA-AAAA-AAAA-AAAA', 's2'),
    );
  });

  it('xesh kodning o‘zini oshkor qilmaydi', () => {
    expect(hashCode('ALV-AB2C-DE3F-GH4J-KL5M', 's')).not.toContain('AB2C');
  });
});

describe('Sertifikat holati', () => {
  const base = { initialAmount: 500_000_00n, spent: 0n, expiresAt: null, cancelledAt: null };

  it('yangi sertifikat faol va to‘liq', () => {
    const s = cardState(base);
    expect(s.status).toBe('ACTIVE');
    expect(s.remaining).toBe(500_000_00n);
    expect(s.usable).toBe(true);
  });

  it('qisman ishlatilgan sertifikat hali faol', () => {
    const s = cardState({ ...base, spent: 120_000_00n });
    expect(s.status).toBe('ACTIVE');
    expect(s.remaining).toBe(380_000_00n);
  });

  it('to‘liq ishlatilgan — USED', () => {
    expect(cardState({ ...base, spent: 500_000_00n }).status).toBe('USED');
  });

  /**
   * Muddat va bekor qilish BALANSDAN oldin tekshiriladi: muddati
   * o'tgan sertifikatda pul qolgan bo'lishi mumkin va mijozga
   * «pul yo'q» emas, «muddati o'tgan» deb aytish kerak.
   */
  it('muddati o‘tgan sertifikat pul qolsa ham ishlatilmaydi', () => {
    const s = cardState({
      ...base,
      spent: 100_000_00n,
      expiresAt: new Date('2026-01-01'),
      now: new Date('2026-09-12'),
    });
    expect(s.status).toBe('EXPIRED');
    expect(s.reason).toBe('expired');
    expect(s.remaining).toBe(400_000_00n);
  });

  it('bekor qilingan sertifikat muddatdan qat’i nazar ishlatilmaydi', () => {
    const s = cardState({ ...base, cancelledAt: new Date('2026-05-01') });
    expect(s.status).toBe('CANCELLED');
    expect(s.usable).toBe(false);
  });

  it('muddat aynan hozir tugasa ishlatilmaydi', () => {
    const t = new Date('2026-09-12T12:00:00Z');
    expect(cardState({ ...base, expiresAt: t, now: t }).status).toBe('EXPIRED');
  });
});

describe('Buyurtmada ishlatish', () => {
  /**
   * Qisman ishlatish SHART: aks holda mijoz sertifikatni to'liq
   * ishlatish uchun keraksiz narsa sotib olishga majbur bo'lardi.
   */
  it('buyurtma kichik bo‘lsa qolgani kartada qoladi', () => {
    const p = planGiftUse({ remaining: 500_000_00n, orderTotal: 120_000_00n });
    expect(p.amount).toBe(120_000_00n);
    expect(p.leftOnCard).toBe(380_000_00n);
    expect(p.coversWholeOrder).toBe(true);
  });

  it('buyurtma katta bo‘lsa karta to‘liq ishlatiladi', () => {
    const p = planGiftUse({ remaining: 120_000_00n, orderTotal: 500_000_00n });
    expect(p.amount).toBe(120_000_00n);
    expect(p.leftOnCard).toBe(0n);
    expect(p.coversWholeOrder).toBe(false);
  });

  it('aynan teng bo‘lsa ikkalasi ham nolga tushadi', () => {
    const p = planGiftUse({ remaining: 200_000_00n, orderTotal: 200_000_00n });
    expect(p.leftOnCard).toBe(0n);
    expect(p.coversWholeOrder).toBe(true);
  });

  it('bo‘sh kartada hech narsa ishlatilmaydi', () => {
    const p = planGiftUse({ remaining: 0n, orderTotal: 200_000_00n });
    expect(p.amount).toBe(0n);
    expect(p.coversWholeOrder).toBe(false);
  });

  it('nol buyurtma butun qoplangan deb hisoblanmaydi', () => {
    expect(planGiftUse({ remaining: 100_00n, orderTotal: 0n }).coversWholeOrder).toBe(false);
  });
});

describe('Kodni ko‘rsatish', () => {
  it('faqat oxirgi to‘rtta belgi ko‘rinadi', () => {
    expect(maskCode('ALV-AB2C-DE3F-GH4J-KL5M')).toBe('ALV-••••-••••-••••-KL5M');
  });
});
