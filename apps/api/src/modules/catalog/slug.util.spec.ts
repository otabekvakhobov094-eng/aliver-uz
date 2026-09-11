import { archivedSlug, isArchivedSlug, slugify, uniqueSlug } from './slug.util';

describe('slugify', () => {
  it('lotin nomdan slug yasaydi', () => {
    expect(slugify('ALIVER Rosemary soch o‘sishi uchun moy')).toBe(
      'aliver-rosemary-soch-osishi-uchun-moy',
    );
  });

  it('kirill nomdan ham slug yasaydi', () => {
    expect(slugify('Крем для лица')).toBe('krem-dlya-litsa');
  });

  it('uzun nomni so‘z o‘rtasidan kesmaydi', () => {
    const s = slugify('bir ikki uch tort besh olti yetti sakkiz toqqiz on', 25);
    expect(s.length).toBeLessThanOrEqual(25);
    expect(s.endsWith('-')).toBe(false);
    expect(s.split('-').every((w) => w.length > 0)).toBe(true);
  });

  it('ortiqcha tirelarni yig‘ishtiradi', () => {
    expect(slugify('  —  Salom ,,, dunyo — ')).toBe('salom-dunyo');
  });
});

describe('uniqueSlug', () => {
  it('bo‘sh bo‘lsa asosiy slugni qaytaradi', () => {
    expect(uniqueSlug('Krem', new Set())).toBe('krem');
  });

  it('band bo‘lsa raqam qo‘shadi', () => {
    expect(uniqueSlug('Krem', new Set(['krem']))).toBe('krem-2');
    expect(uniqueSlug('Krem', new Set(['krem', 'krem-2']))).toBe('krem-3');
  });

  it('nom bo‘sh bo‘lsa ham slug qaytaradi', () => {
    expect(uniqueSlug('!!!', new Set())).toBe('mahsulot');
  });
});

describe('soft delete slugi', () => {
  it('o‘chirilgan slug asosiy slugni bo‘shatadi', () => {
    const s = archivedSlug('krem');
    expect(s).not.toBe('krem');
    expect(isArchivedSlug(s)).toBe(true);
    expect(uniqueSlug('Krem', new Set([s]))).toBe('krem');
  });
});
