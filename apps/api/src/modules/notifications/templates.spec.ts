import {
  STATUS_TEMPLATE,
  TEMPLATES,
  amountVar,
  isStaffTemplate,
  render,
  smsParts,
  type TemplateKey,
} from './templates';
import {
  DEFAULT_QUIET_HOURS,
  URGENT_TEMPLATES,
  isQuiet,
  nextSendableAt,
  tashkentHour,
} from './quiet-hours';

describe('shablonlar', () => {
  it('o‘zgaruvchilarni to‘ldiradi', () => {
    const text = render('ORDER_CREATED', 'uz', {
      number: 'ALV-260910-4821',
      amount: '189 000',
      trackUrl: 'https://aliver.uz/uz/kuzatuv',
    });
    expect(text).toContain('ALV-260910-4821');
    expect(text).toContain('189 000');
    expect(text).not.toContain('{');
  });

  it('bo‘sh o‘zgaruvchi o‘rniga tire qo‘yadi', () => {
    // "{courier}" matnda qolib ketmasligi kerak.
    const text = render('ORDER_SHIPPED', 'uz', { number: 'A1' });
    expect(text).not.toContain('{courier}');
    expect(text).toContain('—');
  });

  it('ruscha va o‘zbekcha matnlar har xil', () => {
    const uz = render('ORDER_CONFIRMED', 'uz', { number: 'A1' });
    const ru = render('ORDER_CONFIRMED', 'ru', { number: 'A1' });
    expect(uz).not.toBe(ru);
    expect(ru).toContain('подтверждён');
  });

  it('har bir shablonda ikkala til ham bor', () => {
    for (const [key, def] of Object.entries(TEMPLATES)) {
      expect(def.uz.length).toBeGreaterThan(5);
      expect(def.ru.length).toBeGreaterThan(5);
      expect(key).toBeTruthy();
    }
  });

  it('operator shablonlari alohida belgilangan', () => {
    expect(isStaffTemplate('STAFF_NEW_ORDER')).toBe(true);
    expect(isStaffTemplate('ORDER_CREATED')).toBe(false);
  });

  it('har bir buyurtma holati uchun qaror bor', () => {
    // null ham qaror: "bu holatda xabar yubormaymiz".
    const statuses = [
      'NEW',
      'CONFIRMED',
      'PROCESSING',
      'PACKING',
      'READY',
      'SHIPPED',
      'DELIVERED',
      'CANCELLED',
      'RETURN_REQUESTED',
      'RETURNED',
      'REFUNDED',
    ];
    for (const s of statuses) {
      expect(Object.prototype.hasOwnProperty.call(STATUS_TEMPLATE, s)).toBe(true);
    }
  });

  it('mijoz shablonlari mijozga tushunarli tilda', () => {
    const customerKeys = (Object.keys(TEMPLATES) as TemplateKey[]).filter(
      (k) => !isStaffTemplate(k),
    );
    for (const key of customerKeys) {
      expect(TEMPLATES[key].uz).toContain('ALIVER.UZ');
    }
  });

  it('summa formatlanadi', () => {
    expect(amountVar(18_900_000n)).toBe('189 000');
  });
});

describe('SMS uzunligi', () => {
  it('lotin matn 160 belgigacha bitta SMS', () => {
    expect(smsParts('a'.repeat(160))).toMatchObject({ parts: 1, encoding: 'GSM7' });
    expect(smsParts('a'.repeat(161)).parts).toBe(2);
  });

  it('kirill matn 70 belgigacha bitta SMS', () => {
    expect(smsParts('я'.repeat(70))).toMatchObject({ parts: 1, encoding: 'UCS2' });
    expect(smsParts('я'.repeat(71)).parts).toBe(2);
  });

  it('haqiqiy shablonlar bitta yoki ikkita SMS ga sig‘adi', () => {
    const text = render('ORDER_CREATED', 'uz', {
      number: 'ALV-260910-4821',
      amount: '1 890 000',
      trackUrl: 'https://aliver.uz/uz/kuzatuv',
    });
    expect(smsParts(text).parts).toBeLessThanOrEqual(2);
  });
});

describe('jim soatlar', () => {
  const at = (hourTashkent: number) => new Date(Date.UTC(2026, 8, 10, hourTashkent - 5, 0, 0));

  it('Toshkent soatini to‘g‘ri hisoblaydi', () => {
    expect(tashkentHour(at(9))).toBe(9);
    expect(tashkentHour(at(23))).toBe(23);
  });

  it('kunduzi yuborishga ruxsat beradi', () => {
    expect(isQuiet(at(9))).toBe(false);
    expect(isQuiet(at(21))).toBe(false);
  });

  it('tunda to‘xtatadi', () => {
    expect(isQuiet(at(22))).toBe(true);
    expect(isQuiet(at(23))).toBe(true);
    expect(isQuiet(at(3))).toBe(true);
    expect(isQuiet(at(7))).toBe(true);
  });

  it('ertalab 8 da yana ruxsat', () => {
    expect(isQuiet(at(8))).toBe(false);
  });

  it('tungi xabarni ertalabga suradi', () => {
    const next = nextSendableAt(at(23));
    expect(tashkentHour(next)).toBe(DEFAULT_QUIET_HOURS.to);
    expect(next.getTime()).toBeGreaterThan(at(23).getTime());
  });

  it('yarim tundan keyingi xabarni o‘sha kuni ertalabga suradi', () => {
    const night = at(3);
    const next = nextSendableAt(night);
    expect(next.getTime() - night.getTime()).toBeLessThan(6 * 3600 * 1000);
    expect(tashkentHour(next)).toBe(8);
  });

  it('kunduzgi vaqtni o‘zgartirmaydi', () => {
    const noon = at(12);
    expect(nextSendableAt(noon).getTime()).toBe(noon.getTime());
  });

  it('shoshilinch xabarlar ro‘yxati to‘lov va bekor qilishni o‘z ichiga oladi', () => {
    expect(URGENT_TEMPLATES.has('PAYMENT_RECEIVED')).toBe(true);
    expect(URGENT_TEMPLATES.has('ORDER_CANCELLED')).toBe(true);
    // Odatiy holat xabari shoshilinch emas.
    expect(URGENT_TEMPLATES.has('ORDER_CONFIRMED')).toBe(false);
  });
});
