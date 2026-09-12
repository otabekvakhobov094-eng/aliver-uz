import { CarrierRegistry } from './carrier-registry';
import { CarrierNotConfiguredError } from './carrier';
import { OwnCarrier } from './own.carrier';

const registry = new CarrierRegistry(new OwnCarrier());

describe('Pochtalar reyestri', () => {
  it('to‘rtta pochta ro‘yxatda: bittasi ishlaydi, uchtasi shartnoma kutyapti', () => {
    expect(registry.all().map((c) => c.code)).toEqual(['own', 'emu', 'bts', 'uzpost']);
    expect(registry.ready().map((c) => c.code)).toEqual(['own']);
  });

  /**
   * Eng muhim xossa: ulanmagan pochta JIM yiqilmaydi. U o'zini
   * "ishlayapti" deb ko'rsatmaydi va jo'natma yaratishga urinilganda
   * sababi bilan aniq xato beradi.
   */
  it('ulanmagan pochta jo‘natma yaratmaydi va sababini aytadi', async () => {
    const emu = registry.get('emu');
    expect(emu.status().ready).toBe(false);
    expect(emu.status().reason).toMatch(/hujjat|shartnoma/);

    await expect(
      emu.createShipment({
        orderNumber: 'ALV-1001',
        recipientName: 'Nilufar',
        recipientPhone: '+998901234567',
        regionCode: 'TASHKENT',
        addressLine: 'Amir Temur 84',
        weightGrams: 300,
        declaredValue: 18900000n,
        codAmount: null,
      }),
    ).rejects.toBeInstanceOf(CarrierNotConfiguredError);
  });

  it('ulanmagan pochtani kuzatib ham bo‘lmaydi — yolg‘on holat qaytarmaydi', async () => {
    await expect(registry.get('bts').track('X123')).rejects.toBeInstanceOf(
      CarrierNotConfiguredError,
    );
  });

  /**
   * EMU birinchi tanlov bo‘lishining sababi qisman yetkazish: bitta
   * pozitsiya omborda qolsa, butun buyurtma ushlanib qolmaydi.
   */
  it('qisman yetkazish faqat EMU va o‘z kuryerimizda', () => {
    const partial = registry
      .all()
      .filter((c) => c.supportsPartial)
      .map((c) => c.code);
    expect(partial).toEqual(['own', 'emu']);
  });

  it('holat jadvali adminka uchun to‘liq qaytadi', () => {
    const rows = registry.overview();
    expect(rows).toHaveLength(4);
    const emu = rows.find((r) => r.code === 'emu')!;
    expect(emu.ready).toBe(false);
    expect(emu.reason).toBeTruthy();
    const own = rows.find((r) => r.code === 'own')!;
    expect(own.ready).toBe(true);
    expect(own.reason).toBeNull();
  });

  it('noma’lum pochta so‘ralsa darhol yiqiladi', () => {
    expect(() => registry.get('dhl' as never)).toThrow(/Noma'lum pochta/);
  });
});

describe('O‘z kuryerimiz', () => {
  it('bugun ishlaydi — tashqi API kerak emas', () => {
    expect(new OwnCarrier().status()).toEqual({ ready: true, reason: null });
  });

  it('jo‘natma raqami o‘qiladigan: kuryer uni telefonda aytadi', async () => {
    const s = await new OwnCarrier().createShipment({ orderNumber: 'ALV-1001' });
    expect(s.trackingNo).toMatch(/^ALV-1001-\d{6}$/);
  });

  it('raqam ikki marta ALV- bilan boshlanmaydi', async () => {
    const s = await new OwnCarrier().createShipment({ orderNumber: 'ALV-1001' });
    expect(s.trackingNo.match(/ALV-/g)).toHaveLength(1);
  });
});
