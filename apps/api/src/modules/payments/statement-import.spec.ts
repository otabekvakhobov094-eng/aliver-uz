import { parseCsv } from '../../common/csv';
import { parseStatement, sumTextToTiyin } from './statement-import';

/**
 * Vypiskani o'qish.
 *
 * Bu yerdagi xatoning narxi yuqori: noto'g'ri o'qilgan vypiska
 * moslashtirish hisobotini yolg'on qiladi, hisobot esa aynan pul
 * yo'qolgan-yo'qolmaganini aytishi kerak.
 */

describe('sumTextToTiyin', () => {
  it('oddiy son', () => {
    expect(sumTextToTiyin('189000')).toBe(18_900_000n);
  });

  it('minglik ajratgichi — bo‘sh joy', () => {
    expect(sumTextToTiyin('189 000')).toBe(18_900_000n);
  });

  it('uzilmas bo‘sh joy ham ajratgich (Excel shuni qo‘yadi)', () => {
    expect(sumTextToTiyin('189 000')).toBe(18_900_000n);
  });

  it('vergul — kasr ajratgichi', () => {
    expect(sumTextToTiyin('189000,50')).toBe(18_900_050n);
  });

  it('nuqta ham kasr ajratgichi', () => {
    expect(sumTextToTiyin('189000.50')).toBe(18_900_050n);
  });

  it('bitta kasr raqami to‘ldiriladi', () => {
    // «100.5» — bu 100 so'm 50 tiyin, 100 so'm 5 tiyin emas.
    expect(sumTextToTiyin('100.5')).toBe(10_050n);
  });

  it('qaytarish manfiy bo‘lib keladi', () => {
    expect(sumTextToTiyin('-189000')).toBe(-18_900_000n);
  });

  it('matnli qiymat rad etiladi — nolga aylantirilmaydi', () => {
    // Nolga aylantirish eng yomoni: qator o'tib ketardi va hisobotda
    // «summa mos kelmadi» bo'lib chiqardi, sababi esa ko'rinmasdi.
    expect(sumTextToTiyin('—')).toBeNull();
    expect(sumTextToTiyin('')).toBeNull();
    expect(sumTextToTiyin('189 000 so‘m')).toBeNull();
  });
});

describe('parseCsv', () => {
  it('nuqtali vergul o‘zi aniqlanadi', () => {
    expect(parseCsv('a;b;c\n1;2;3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('vergul ham aniqlanadi', () => {
    expect(parseCsv('a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('qo‘shtirnoq ichidagi ajratgich ustun bo‘lmaydi', () => {
    expect(parseCsv('a;b\n"Krem; 50 ml";2')).toEqual([
      ['a', 'b'],
      ['Krem; 50 ml', '2'],
    ]);
  });

  it('ikkilangan qo‘shtirnoq bitta bo‘lib o‘qiladi', () => {
    expect(parseCsv('a\n"u ""dedi"""')).toEqual([['a'], ['u "dedi"']]);
  });

  it('BOM sarlavhaga yopishib qolmaydi', () => {
    // Aks holda birinchi ustun nomi topilmay qolardi va import
    // «ustun yo‘q» deb tugardi.
    expect(parseCsv('﻿id;amount\n1;2')[0]).toEqual(['id', 'amount']);
  });

  it('bo‘sh qatorlar tashlanadi', () => {
    expect(parseCsv('a;b\n\n1;2\n')).toHaveLength(2);
  });
});

describe('parseStatement', () => {
  const csv = [
    'transaction_id;order_id;amount;status;date',
    'TX-1;ALV-1001;189 000;Оплачен;12.09.2026 14:30',
    'TX-2;ALV-1002;250000;performed;12.09.2026',
  ].join('\n');

  it('yozuvlarni o‘qiydi va summani tiyinga o‘giradi', () => {
    const res = parseStatement(csv);
    expect(res.rows).toBe(2);
    expect(res.skipped).toBe(0);
    expect(res.records[0]).toMatchObject({
      providerTxnId: 'TX-1',
      orderNumber: 'ALV-1001',
      amount: 18_900_000n,
      performed: true,
    });
    expect(res.records[0]!.performedAt?.toISOString()).toBe('2026-09-12T14:30:00.000Z');
  });

  it('ustun nomlari TARTIBI emas, NOMI bo‘yicha topiladi', () => {
    // Provayder eksportga yangi ustun qo'shsa, tartibga ishongan kod
    // jimgina noto'g'ri ustunni o'qib ketardi.
    const shuffled = ['status;amount;transaction_id', 'performed;1000;TX-9'].join('\n');
    const res = parseStatement(shuffled);
    expect(res.records[0]).toMatchObject({ providerTxnId: 'TX-9', amount: 100_000n });
  });

  it('ruscha sarlavhalar ham tushuniladi', () => {
    const ru = ['Номер транзакции;Сумма;Статус', 'TX-5;99 000;Успешно'].join('\n');
    const res = parseStatement(ru);
    expect(res.records[0]).toMatchObject({ providerTxnId: 'TX-5', performed: true });
  });

  it('notanish holat TO‘LANGAN deb hisoblanmaydi', () => {
    // Oq ro'yxat ataylab: provayder «hold» qo'shsa, u jimgina
    // to'langan bo'lib o'tib ketardi va biz tovarni bekorga jo'natardik.
    const res = parseStatement(['transaction_id;amount;status', 'TX-7;1000;hold'].join('\n'));
    expect(res.records[0]!.performed).toBe(false);
  });

  it('bekor qilingan yozuv to‘langan bo‘lib qolmaydi', () => {
    const res = parseStatement(
      ['transaction_id;amount;status', 'TX-8;1000;Оплачен, возврат'].join('\n'),
    );
    expect(res.records[0]).toMatchObject({ performed: false, cancelled: true });
  });

  it('manfiy summa — qaytarish, moslashtirish uchun musbat qilinadi', () => {
    const res = parseStatement(['transaction_id;amount', 'TX-9;-50 000'].join('\n'));
    expect(res.records[0]).toMatchObject({ amount: 5_000_000n, cancelled: true });
  });

  it('holat ustuni bo‘lmasa yozuv to‘langan deb olinadi', () => {
    // Vypiskaga odatda faqat o'tgan to'lovlar tushadi.
    const res = parseStatement(['transaction_id;amount', 'TX-3;1000'].join('\n'));
    expect(res.records[0]!.performed).toBe(true);
  });

  it('o‘qib bo‘lmagan qator JIM tashlanmaydi', () => {
    // Jim tashlangan qator = hisobotdagi yolg'on. Har bir muammo
    // qator raqami bilan qaytariladi.
    const res = parseStatement(
      ['transaction_id;amount', 'TX-1;1000', ';2000', 'TX-3;xato'].join('\n'),
    );
    expect(res.records).toHaveLength(1);
    expect(res.skipped).toBe(2);
    expect(res.problems.map((p) => p.line)).toEqual([3, 4]);
  });

  it('kerakli ustunlar topilmasa import BAJARILMAYDI', () => {
    const res = parseStatement(['foo;bar', '1;2'].join('\n'));
    expect(res.records).toHaveLength(0);
    expect(res.problems[0]!.reason).toContain('topilmadi');
  });

  it('qaysi ustun tanlangani qaytariladi — admin tekshira olsin', () => {
    const res = parseStatement(csv);
    expect(res.columns).toMatchObject({ txnId: 'transaction_id', amount: 'amount' });
  });

  it('bo‘sh fayl aniq sabab bilan rad etiladi', () => {
    expect(parseStatement('').problems[0]!.reason).toContain('bo‘sh');
  });
});
