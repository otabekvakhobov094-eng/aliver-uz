import type { ConfigService } from '@nestjs/config';
import type { JwtService } from '@nestjs/jwt';
import { TokensService } from './tokens.service';

function service(values: Record<string, unknown>): TokensService {
  const config = {
    get: (key: string, fallback?: unknown) => values[key] ?? fallback,
  } as ConfigService;
  return new TokensService({} as JwtService, config);
}

describe('TokensService cookie options', () => {
  it('uses a host-only cookie locally', () => {
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

  it('allows HTTPS cross-origin clients without an invalid domain', () => {
    const options = service({ COOKIE_SECURE: true }).cookieOptions(60);
    expect(options).toMatchObject({ sameSite: 'none', secure: true });
    expect(options).not.toHaveProperty('domain');
  });

  it('uses COOKIE_DOMAIN only when explicitly configured', () => {
    expect(service({ COOKIE_SECURE: true, COOKIE_DOMAIN: '.aliver.uz' }).cookieOptions(60))
      .toHaveProperty('domain', '.aliver.uz');
  });
});
