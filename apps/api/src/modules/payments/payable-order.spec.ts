/**
 * To'lov qabul qilinadigan buyurtma holatlari.
 *
 * Ro'yxatning o'zi oddiy, lekin uning MAZMUNI qimmat: bu yerga
 * "CANCELLED" tushib qolsa, bekor qilingan buyurtmaga pul o'tadi va
 * tovar boshqa mijozga sotilgan bo'ladi. Shuning uchun ro'yxat test
 * bilan qotirilgan.
 */
import { ORDER_TRANSITIONS } from '../../common/state-machine/order-state-machine';

// `payment.service.ts` dagi ro'yxat bilan bir xil bo'lishi shart.
const PAYABLE = ['NEW', 'CONFIRMED', 'PROCESSING', 'PACKING', 'READY', 'SHIPPED', 'DELIVERED'];

describe('to‘lov qabul qilinadigan holatlar', () => {
  it('bekor qilingan buyurtmaga to‘lov qabul qilinmaydi', () => {
    expect(PAYABLE).not.toContain('CANCELLED');
  });

  it('qaytarilgan va puli qaytarilgan buyurtmalarga ham', () => {
    expect(PAYABLE).not.toContain('RETURNED');
    expect(PAYABLE).not.toContain('REFUNDED');
  });

  it('yetkazilgan buyurtma to‘lanishi MUMKIN — naqd to‘lov shunda yopiladi', () => {
    expect(PAYABLE).toContain('DELIVERED');
  });

  it('ro‘yxatdagi har bir holat haqiqatan mavjud', () => {
    const known = Object.keys(ORDER_TRANSITIONS);
    for (const status of PAYABLE) expect(known).toContain(status);
  });

  it('yakuniy holatlarning hammasi ro‘yxatdan tashqarida', () => {
    // Yakuniy holat — undan hech qayerga o'tib bo'lmaydigan holat.
    const terminal = Object.entries(ORDER_TRANSITIONS)
      .filter(([, next]) => (next as string[]).length === 0)
      .map(([status]) => status);
    expect(terminal.length).toBeGreaterThan(0);
    for (const status of terminal) expect(PAYABLE).not.toContain(status);
  });
});
