import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import { TokensService } from './tokens.service';

/**
 * Cookie parametrlari — admin login nosozligining ildizi shu yerda edi.
 *
 * Testlar aynan BRAUZER COOKIE NI RAD ETADIGAN holatlarni qo'riqlaydi:
 * bunday nosozlik jimgina sodir bo'ladi (server xato ko'rmaydi), ya'ni
 * testsiz u yana qaytib kelishi mumkin.
 */
function service(values: Record<string, unknown>): TokensService {
  const config = {
    get: (key: string, fallback?: unknown) => values[key] ?? fallback,
  } as ConfigService;
  return new TokensService({} as JwtService, config);
}

describe('TokensService cookie options', () => {
  it('lokalda host-only cookie ishlatiladi', () => {
    const options = service({}).cookieOptions(60);
    expect(options).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
      maxAge: 60_000,
    });
    expect(options).not.toHaveProperty('domain');
  });

  it('domen ko‘rsatilmasa qo‘yilmaydi', () => {
    // Domen javob bergan xostga mos kelmasa, brauzer cookie ni BUTUNLAY
    // tashlaydi — login jimgina ishlamay qoladi.
    expect(service({ COOKIE_SECURE: true }).cookieOptions(60)).not.toHaveProperty('domain');
  });

  it('"localhost" domeni e‘tiborsiz qoldiriladi', () => {
    // Bu eski standart qiymat edi. `…onrender.com` dan kelgan javobda
    // `Domain=localhost` bo'lgani uchun admin paneli ochilib-yopilardi.
    expect(service({ COOKIE_DOMAIN: 'localhost' }).cookieOptions(60)).not.toHaveProperty('domain');
  });

  it('bo‘sh joy bilan yozilgan domen ham tozalanadi', () => {
    expect(service({ COOKIE_DOMAIN: '   ' }).cookieOptions(60)).not.toHaveProperty('domain');
  });

  it('haqiqiy domen aniq ko‘rsatilganda qo‘yiladi', () => {
    expect(
      service({ COOKIE_SECURE: true, COOKIE_DOMAIN: '.aliver.uz' }).cookieOptions(60),
    ).toHaveProperty('domain', '.aliver.uz');
  });

  /**
   * HTTPS da ham standart `SameSite` — `lax`, `none` EMAS.
   *
   * Ilgari bu yerda "secure bo'lsa none" qoidasi bor edi. U cookie ni
   * uchinchi tomon cookie siga aylantiradi: Safari uni doim bloklaydi,
   * Chrome esa bosqichma-bosqich o'chirmoqda — ya'ni tuzatish bugun
   * ishlab, ertaga ishlamay qolardi.
   *
   * Haqiqiy yechim boshqa: admin va web API ga O'Z DOMENIDAGI `/api`
   * proxy orqali murojaat qiladi (`next.config.mjs` dagi `rewrites`),
   * shuning uchun so'rov cross-site emas va `lax` yetarli.
   */
  it('HTTPS da ham standart SameSite — lax', () => {
    expect(service({ COOKIE_SECURE: true }).cookieOptions(60)).toMatchObject({
      sameSite: 'lax',
      secure: true,
    });
  });

  it('SameSite kerak bo‘lsa sozlanadi', () => {
    expect(
      service({ COOKIE_SECURE: true, COOKIE_SAMESITE: 'none' }).cookieOptions(60).sameSite,
    ).toBe('none');
  });

  it('cookie har doim httpOnly', () => {
    // JavaScript token ni o'qiy olmasligi kerak: XSS da o'g'irlanmasin.
    expect(service({}).cookieOptions(60).httpOnly).toBe(true);
  });

  it('maxAge millisekundda beriladi', () => {
    expect(service({}).cookieOptions(900).maxAge).toBe(900_000);
  });

  it('COOKIE_SECURE uzatiladi', () => {
    expect(service({ COOKIE_SECURE: true }).cookieOptions(60).secure).toBe(true);
    expect(service({ COOKIE_SECURE: false }).cookieOptions(60).secure).toBe(false);
  });
});
