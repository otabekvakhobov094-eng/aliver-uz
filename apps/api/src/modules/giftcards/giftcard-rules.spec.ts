import {
  cardState,
  generateCode,
  giftCardWarnKey,
  giftCardWarning,
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

describe('muddat tugashidan oldin ogohlantirish', () => {
  const NOW = new Date('2026-09-12T03:00:00Z');
  const base = { remaining: 500_000_00n, cancelledAt: null, now: NOW };

  it('muddatsiz kartada ogohlantirish yo‘q', () => {
    expect(giftCardWarning({ ...base, expiresAt: null }).milestone).toBeNull();
  });

  it('uzoq muddatda ogohlantirish yo‘q', () => {
    expect(
      giftCardWarning({ ...base, expiresAt: new Date('2027-01-01') }).milestone,
    ).toBeNull();
  });

  it('30 kun ichida — birinchi bosqich', () => {
    const w = giftCardWarning({ ...base, expiresAt: new Date('2026-10-01T03:00:00Z') });
    expect(w.milestone).toBe(30);
    expect(w.daysLeft).toBe(19);
  });

  it('7 kun ichida — ikkinchi bosqich, ya’ni yangi xabar', () => {
    const w = giftCardWarning({ ...base, expiresAt: new Date('2026-09-17T03:00:00Z') });
    expect(w.milestone).toBe(7);
    expect(w.daysLeft).toBe(5);
  });

  it('puli qolmagan kartaga ogohlantirish yo‘q', () => {
    // «Muddati tugayapti» degan xabar bo'sh kartada mijozni chalg'itadi.
    expect(
      giftCardWarning({ ...base, remaining: 0n, expiresAt: new Date('2026-09-17') }).milestone,
    ).toBeNull();
  });

  it('bekor qilingan kartaga ogohlantirish yo‘q', () => {
    expect(
      giftCardWarning({
        ...base,
        cancelledAt: new Date('2026-01-01'),
        expiresAt: new Date('2026-09-17'),
      }).milestone,
    ).toBeNull();
  });

  it('allaqachon tugagan kartaga ogohlantirish yo‘q — kech', () => {
    expect(
      giftCardWarning({ ...base, expiresAt: new Date('2026-09-01') }).milestone,
    ).toBeNull();
  });

  it('ikki bosqich ikki xil kalit beradi — 30 kunlik xabar 7 kunlikni to‘smaydi', () => {
    const at = new Date('2026-10-01T00:00:00Z');
    expect(giftCardWarnKey('card-1', at, 30)).toBe('card-1:2026-10-01:30');
    expect(giftCardWarnKey('card-1', at, 7)).toBe('card-1:2026-10-01:7');
  });

  it('muddat uzaytirilsa kalit o‘zgaradi va mijoz yana xabar oladi', () => {
    expect(giftCardWarnKey('card-1', new Date('2026-10-01'), 30)).not.toBe(
      giftCardWarnKey('card-1', new Date('2027-10-01'), 30),
    );
  });
});
