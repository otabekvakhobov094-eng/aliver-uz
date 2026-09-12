import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UpsertProductDto } from './dto/catalog.dto';

/**
 * Asosiy tarkib maydonining validatsiyasi — TZ-3, 2.3.
 *
 * Cheklov frontendda ham bor, lekin u yerda faqat qulaylik uchun.
 * Haqiqiy chegara shu yerda: import, API va kelajakdagi mobil ilova
 * ham shu DTO orqali o'tadi.
 */

function base(): Record<string, unknown> {
  return {
    nameUz: 'Batana moyi',
    nameRu: 'Масло батана',
    ingredientsUz: 'Aqua, Glycerin',
    ingredientsRu: 'Aqua, Glycerin',
    warningsUz: 'Ko‘zga tushirmang.',
    warningsRu: 'Избегать попадания в глаза.',
    ikpuCode: '03302001001000000',
    variants: [{ sku: 'ALV-BAT-060', price: 189000 }],
  };
}

function errorsFor(patch: Record<string, unknown>) {
  const dto = plainToInstance(UpsertProductDto, { ...base(), ...patch });
  return validateSync(dto, { whitelist: true });
}

const ING = {
  nameUz: 'Pantenol',
  nameRu: 'Пантенол',
  roleUz: 'teri to‘sig‘ini mustahkamlaydi',
  roleRu: 'укрепляет барьер кожи',
};

describe('UpsertProductDto — keyIngredients', () => {
  it('maydonsiz ham to‘g‘ri: tarkib ixtiyoriy', () => {
    expect(errorsFor({})).toHaveLength(0);
  });

  it('uchtagacha qabul qilinadi', () => {
    expect(errorsFor({ keyIngredients: [ING, ING, ING] })).toHaveLength(0);
  });

  it('to‘rtinchisi rad etiladi — «asosiy» ma’nosi yo‘qoladi', () => {
    const errs = errorsFor({ keyIngredients: [ING, ING, ING, ING] });
    expect(errs).toHaveLength(1);
    expect(JSON.stringify(errs)).toContain('3 ta asosiy tarkib');
  });

  it('vazifasi yo‘q tarkib rad etiladi: nomning o‘zi mijozga hech narsa bermaydi', () => {
    const errs = errorsFor({ keyIngredients: [{ ...ING, roleUz: '' }] });
    expect(errs).toHaveLength(1);
  });

  it('bo‘sh massiv xato emas — «ko‘rsatilmagan» degani', () => {
    expect(errorsFor({ keyIngredients: [] })).toHaveLength(0);
  });

  it('claim uzunligi 300 belgidan oshmaydi', () => {
    expect(errorsFor({ claimUz: 'a'.repeat(300) })).toHaveLength(0);
    expect(errorsFor({ claimUz: 'a'.repeat(301) })).toHaveLength(1);
  });
});
