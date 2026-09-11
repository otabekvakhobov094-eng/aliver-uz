import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ORDER_TRANSITIONS, PAYMENT_TRANSITIONS } from './order-state-machine';

/**
 * Holat mashinasi Prisma dan mustaqil yozilgan, shuning uchun enumlar
 * bir-biridan uzoqlashib ketmasligini test bilan ushlab turamiz.
 * Sxemaga yangi status qo'shilsa, shu test yiqiladi.
 */
function enumValues(name: string): string[] {
  const schema = readFileSync(join(__dirname, '../../../prisma/schema.prisma'), 'utf8');
  const re = new RegExp(`enum\\s+${name}\\s*\\{([^}]*)\\}`, 'm');
  const body = re.exec(schema)?.[1] ?? '';
  return body
    .split('\n')
    .map((l) => l.replace(/\/\/.*$/, '').trim())
    .filter((l) => l.length > 0 && /^[A-Z_]+$/.test(l));
}

describe('Prisma enumlari bilan moslik', () => {
  it('OrderStatus bir xil', () => {
    expect(enumValues('OrderStatus').sort()).toEqual(Object.keys(ORDER_TRANSITIONS).sort());
  });

  it('PaymentStatus bir xil', () => {
    expect(enumValues('PaymentStatus').sort()).toEqual(Object.keys(PAYMENT_TRANSITIONS).sort());
  });
});
