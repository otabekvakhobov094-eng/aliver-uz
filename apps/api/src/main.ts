import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { installBigIntSerializer } from './common/bigint-serializer';

async function bootstrap(): Promise<void> {
  installBigIntSerializer();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  /**
   * Reverse proxy ga ishonish.
   *
   * Render, Cloudflare va Nginx orqasida `req.ip` HAR DOIM proxy ning
   * IP si bo'ladi. Bu chastota cheklovlarini buzadi va eng yomon
   * ko'rinishda: bitta mijoz formani 5 marta yuborsa, BUTUN SAYT uchun
   * limit tugaydi — chunki hamma bir xil IP dan kelayotgandek ko'rinadi.
   * OTP cheklovlari ham shunday ishlamay qoladi.
   *
   * `TRUST_PROXY` — ishonchli proxy'lar soni. Render'da 1. Nolda
   * (lokal ishlab chiqish) o'zgartirilmaydi: ishonchni keraksiz
   * yoqish esa mijozga `X-Forwarded-For` ni o'zi yozib, limitni
   * chetlab o'tish imkonini berardi.
   */
  const trustProxy = config.get<number>('TRUST_PROXY', 0);
  if (trustProxy > 0) app.set('trust proxy', trustProxy);

  app.use(helmet());
  app.use(cookieParser());
  app.setGlobalPrefix('api');

  app.enableCors({
    origin: config.get<string>('CORS_ORIGINS', '').split(',').filter(Boolean),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.get(PrismaService).enableShutdownHooks(app);
  app.enableShutdownHooks();

  if (config.get<string>('APP_ENV') !== 'production') {
    const doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('ALIVER.UZ API')
        .setDescription('ALIVER Uzbekistan e-commerce platformasi')
        .setVersion('0.1.0')
        .addBearerAuth()
        .build(),
    );
    SwaggerModule.setup('api/docs', app, doc);
  }

  const port = config.get<number>('API_PORT', 4000);
  await app.listen(port);
  logger.log(`API ishga tushdi: http://localhost:${port}/api`);

  startCatalogMaintenance(logger);
}

/**
 * Katalogni joyiga keltirish — SERVER ESHITA BOSHLAGANDAN KEYIN.
 *
 * NEGA SHUNDAY. Bu ish `prestart` da edi, ya'ni API ko'tarilishidan
 * OLDIN. 556 ta mahsulotni qayta import qilish bir necha daqiqa
 * oladi va shu vaqt davomida API umuman javob bermaydi: Render'ning
 * `healthCheckPath` tekshiruvi yiqiladi va deploy muvaffaqiyatsiz
 * deb belgilanishi mumkin. Ya'ni katalogni tuzatish uchun
 * qo'yilgan qadam butun deployni yiqitardi.
 *
 * Endi u orqa fonda ketadi: sayt ishlab turadi, katalog esa
 * import tugagach yangilanadi. Xato bo'lsa — faqat log'da, chunki
 * API ning o'zi bundan mustaqil.
 */
function startCatalogMaintenance(logger: Logger): void {
  if (!process.env.DATABASE_URL) return;

  /*
   * Skript yo'li QURILISH JOYLASHUVIGA bog'liq. `dist/main.js` uchun
   * uch qadam yuqori, `dist/apps/api/src/main.js` uchun besh. Ikkala
   * variant ham tekshiriladi: topilmasa ish shunchaki o'tkazib
   * yuboriladi va API baribir ishlaydi.
   */
  const candidates = [
    path.join(__dirname, '../../../scripts/ensure-aliver-catalog.mjs'),
    path.join(__dirname, '../../../../../scripts/ensure-aliver-catalog.mjs'),
    path.join(process.cwd(), 'scripts/ensure-aliver-catalog.mjs'),
    path.join(process.cwd(), '../../scripts/ensure-aliver-catalog.mjs'),
  ];
  const script = candidates.find((c) => fs.existsSync(c));
  if (!script) {
    logger.warn('Katalog skripti topilmadi — o‘tkazib yuborildi.');
    return;
  }

  const child = spawn(process.execPath, [script], {
    stdio: 'inherit',
    env: process.env,
    // Ota jarayon tugasa ham bolasi qolmasin.
    detached: false,
  });
  child.once('error', (e) => logger.error(`Katalog skripti ishga tushmadi: ${e.message}`));
  child.once('exit', (code) => {
    if (code === 0) logger.log('Katalog tekshiruvi tugadi.');
    else logger.error(`Katalog tekshiruvi ${code} kodi bilan tugadi.`);
  });
}

void bootstrap();
