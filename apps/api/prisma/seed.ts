/**
 * Boshlang'ich ma'lumotlar.
 *
 * Idempotent: bir necha marta ishga tushirish mumkin, dublikat yaratmaydi.
 * Ishga tushirish:  npm run db:seed
 */
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { ALL_PERMISSIONS, ROLE_PRESETS } from '../src/modules/rbac/permissions.constants';
import { seedCatalog } from './seed-catalog';

const prisma = new PrismaClient();

/** O'zbekiston viloyatlari — TZ 29. Tumanlar admin paneldan to'ldiriladi. */
const REGIONS: Array<[string, string, string]> = [
  ['TAS_CITY', 'Toshkent shahri', 'город Ташкент'],
  ['TAS_REG', 'Toshkent viloyati', 'Ташкентская область'],
  ['AND', 'Andijon viloyati', 'Андижанская область'],
  ['BUX', 'Buxoro viloyati', 'Бухарская область'],
  ['FAR', 'Farg‘ona viloyati', 'Ферганская область'],
  ['JIZ', 'Jizzax viloyati', 'Джизакская область'],
  ['XOR', 'Xorazm viloyati', 'Хорезмская область'],
  ['NAM', 'Namangan viloyati', 'Наманганская область'],
  ['NAV', 'Navoiy viloyati', 'Навоийская область'],
  ['QASH', 'Qashqadaryo viloyati', 'Кашкадарьинская область'],
  ['QORA', 'Qoraqalpog‘iston Respublikasi', 'Республика Каракалпакстан'],
  ['SAM', 'Samarqand viloyati', 'Самаркандская область'],
  ['SIR', 'Sirdaryo viloyati', 'Сырдарьинская область'],
  ['SUR', 'Surxondaryo viloyati', 'Сурхандарьинская область'],
];

const TASHKENT_DISTRICTS = [
  ['TAS_YUN', 'Yunusobod tumani', 'Юнусабадский район'],
  ['TAS_MIR', 'Mirzo Ulug‘bek tumani', 'Мирзо-Улугбекский район'],
  ['TAS_CHI', 'Chilonzor tumani', 'Чиланзарский район'],
  ['TAS_YAK', 'Yakkasaroy tumani', 'Яккасарайский район'],
  ['TAS_SHA', 'Shayxontohur tumani', 'Шайхантахурский район'],
  ['TAS_MIRO', 'Mirobod tumani', 'Мирабадский район'],
  ['TAS_OLM', 'Olmazor tumani', 'Алмазарский район'],
  ['TAS_SER', 'Sergeli tumani', 'Сергелийский район'],
  ['TAS_UCH', 'Uchtepa tumani', 'Учтепинский район'],
  ['TAS_YAS', 'Yashnobod tumani', 'Яшнабадский район'],
  ['TAS_BEK', 'Bektemir tumani', 'Бектемирский район'],
  ['TAS_YAN', 'Yangihayot tumani', 'Янгихаётский район'],
];

const SUM = 100n;

async function seedPermissions(): Promise<void> {
  for (const code of ALL_PERMISSIONS) {
    const [module, action] = code.split('.') as [string, string];
    await prisma.permission.upsert({
      where: { code },
      update: { module, action },
      create: { code, module, action },
    });
  }
  console.log(`  huquqlar: ${ALL_PERMISSIONS.length} ta`);
}

async function seedRoles(): Promise<void> {
  for (const [code, preset] of Object.entries(ROLE_PRESETS)) {
    const role = await prisma.role.upsert({
      where: { code },
      update: { name: preset.name },
      create: { code, name: preset.name, isSystem: true },
    });

    const codes = preset.permissions === '*' ? ALL_PERMISSIONS : preset.permissions;
    const perms = await prisma.permission.findMany({ where: { code: { in: codes as string[] } } });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: perms.map((p) => ({ roleId: role.id, permissionId: p.id })),
      skipDuplicates: true,
    });
  }
  console.log(`  rollar: ${Object.keys(ROLE_PRESETS).length} ta`);
}

async function seedSuperAdmin(): Promise<void> {
  const email = (process.env.SEED_SUPERADMIN_EMAIL ?? 'admin@aliver.uz').toLowerCase();
  const password = process.env.SEED_SUPERADMIN_PASSWORD ?? 'Admin12345!';

  if (process.env.APP_ENV === 'production' && password === 'Admin12345!') {
    throw new Error('Productionda standart parol bilan super admin yaratilmaydi');
  }

  const role = await prisma.role.findUniqueOrThrow({ where: { code: 'SUPER_ADMIN' } });
  const passwordHash = await argon2.hash(password);

  await prisma.admin.upsert({
    where: { email },
    update: { roleId: role.id },
    create: { email, fullName: 'Super Admin', passwordHash, roleId: role.id },
  });
  console.log(`  super admin: ${email}`);
}

async function seedRegions(): Promise<void> {
  for (const [i, [code, nameUz, nameRu]] of REGIONS.entries()) {
    await prisma.region.upsert({
      where: { code },
      update: { nameUz, nameRu },
      create: { code, nameUz, nameRu, sortOrder: i },
    });
  }

  const tas = await prisma.region.findUniqueOrThrow({ where: { code: 'TAS_CITY' } });
  for (const [i, [code, nameUz, nameRu]] of TASHKENT_DISTRICTS.entries()) {
    await prisma.district.upsert({
      where: { code },
      update: { nameUz, nameRu },
      create: { code, nameUz, nameRu, regionId: tas.id, sortOrder: i },
    });
  }
  console.log(`  hududlar: ${REGIONS.length} viloyat, ${TASHKENT_DISTRICTS.length} tuman`);
}

async function seedWarehouse(): Promise<void> {
  const tas = await prisma.region.findUniqueOrThrow({ where: { code: 'TAS_CITY' } });
  await prisma.warehouse.upsert({
    where: { code: 'MAIN' },
    update: {},
    create: {
      code: 'MAIN',
      name: 'Toshkent asosiy ombori',
      regionId: tas.id,
      isDefault: true,
    },
  });
  console.log('  ombor: MAIN');
}

async function seedDeliveryMethods(): Promise<void> {
  const tas = await prisma.region.findUniqueOrThrow({ where: { code: 'TAS_CITY' } });

  const courier = await prisma.deliveryMethod.upsert({
    where: { code: 'COURIER' },
    update: {},
    create: {
      code: 'COURIER',
      type: 'COURIER',
      nameUz: 'Kuryer bilan',
      nameRu: 'Курьером',
      basePrice: 30_000n * SUM,
      freeThreshold: 400_000n * SUM,
      estimatedDaysMin: 1,
      estimatedDaysMax: 4,
      sortOrder: 0,
    },
  });

  // Toshkent shahri uchun arzonroq va tezroq
  await prisma.deliveryMethodRegion.upsert({
    where: { methodId_regionId: { methodId: courier.id, regionId: tas.id } },
    update: { price: 20_000n * SUM, daysMin: 1, daysMax: 1 },
    create: {
      methodId: courier.id,
      regionId: tas.id,
      price: 20_000n * SUM,
      freeThreshold: 400_000n * SUM,
      daysMin: 1,
      daysMax: 1,
    },
  });

  // Ekspress FAQAT Toshkent shahrida — prototipda ham shunday.
  const express = await prisma.deliveryMethod.upsert({
    where: { code: 'EXPRESS' },
    update: {},
    create: {
      code: 'EXPRESS',
      type: 'EXPRESS',
      nameUz: 'Ekspress — bugun',
      nameRu: 'Экспресс — сегодня',
      basePrice: 45_000n * SUM,
      estimatedDaysMin: 0,
      estimatedDaysMax: 0,
      sortOrder: 1,
    },
  });
  await prisma.deliveryMethodRegion.upsert({
    where: { methodId_regionId: { methodId: express.id, regionId: tas.id } },
    update: { isAvailable: true },
    create: { methodId: express.id, regionId: tas.id, price: 45_000n * SUM, isAvailable: true },
  });

  await prisma.deliveryMethod.upsert({
    where: { code: 'PICKUP' },
    update: {},
    create: {
      code: 'PICKUP',
      type: 'PICKUP',
      nameUz: 'O‘zim olib ketaman',
      nameRu: 'Самовывоз',
      descUz: 'Chilonzor, Bunyodkor ko‘chasi 12',
      descRu: 'Чиланзар, ул. Бунёдкор 12',
      basePrice: 0n,
      estimatedDaysMin: 0,
      estimatedDaysMax: 1,
      sortOrder: 2,
    },
  });
  console.log('  yetkazib berish usullari: 3 ta');
}

async function seedSettings(): Promise<void> {
  const settings: Array<[string, unknown]> = [
    ['store.name', 'ALIVER.UZ'],
    ['store.currency', 'UZS'],
    ['store.timezone', 'Asia/Tashkent'],
    ['store.locales', ['UZ', 'RU']],
    ['store.defaultLocale', 'UZ'],
    ['store.phone', '+998 71 200 00 00'],
    ['store.legalName', 'MCHJ «ALIVER UZ»'],
    ['store.tin', '[SIZNING STIR]'],
    // Ombor rezervi muddati — ekspertiza A-6
    ['inventory.reservationTtlMinutes', 30],
    ['inventory.lowStockThreshold', 10],
    // Qaytarish muddati — ekspertiza A-2 (yakuniy qiymat yurist xulosasidan keyin).
    // Muddat YETKAZILGAN paytdan boshlanadi.
    ['returns.windowDays', 14],
    // Ochilgan kosmetika sifatli bo'lsa qaytarilmaydi (qonun talabi).
    // Nuqson yoki noto'g'ri tovar bo'lsa — qaytariladi.
    ['returns.acceptOpened', false],
    // Yetkazish narxi faqat bizning aybimizda va butun buyurtma
    // qaytarilganda qaytariladi.
    ['returns.refundShipping', 'ourFaultOnly'],
    // Chegirmalar ustuvorligi — ekspertiza B-3
    ['discounts.maxTotalPercent', 40],
    ['discounts.allowStacking', false],
    // Naqd to'lovda telefonni SMS bilan tasdiqlash — soxta buyurtmalarga
    // qarshi asosiy to'siq (ekspertiza B-15).
    ['orders.codRequiresOtp', true],
    // Savat 30 kun yashaydi, keyin soatlik cron tozalaydi.
    ['cart.ttlDays', 30],
    // Yetkazib berish xizmatining IKPU kodi — fiskal chekka tushadi.
    // Buxgalter tasdiqlagach aniq kodga almashtiriladi (ekspertiza A-1).
    ['fiscal.shippingIkpu', '10112001001000000'],
    ['fiscal.shippingVatRate', 12],
    // Moslashtirish hisoboti standart necha kunni oladi.
    ['payments.reconcileDefaultDays', 7],
    // Bildirishnomalar tunda yuborilmaydi (mahalliy vaqt).
    ['notify.quietFrom', 22],
    ['notify.quietTo', 8],
    // Operatorlar kanaliga qoldiq ogohlantirishi shu chegaradan pastda.
    ['notify.lowStockThreshold', 5],
  ];
  for (const [key, value] of settings) {
    await prisma.setting.upsert({
      where: { key },
      update: { value: value as never },
      create: { key, value: value as never },
    });
  }
  console.log(`  sozlamalar: ${settings.length} ta`);
}

async function seedLegalPages(): Promise<void> {
  const pages = [
    ['public-offer', 'Ommaviy oferta', 'Публичная оферта'],
    ['privacy-policy', 'Maxfiylik siyosati', 'Политика конфиденциальности'],
    ['return-policy', 'Qaytarish shartlari', 'Условия возврата'],
    ['delivery', 'Yetkazib berish', 'Доставка'],
    ['payment', 'To‘lov', 'Оплата'],
  ];
  for (const [slug, titleUz, titleRu] of pages) {
    await prisma.page.upsert({
      where: { slug: slug! },
      update: {},
      create: {
        slug: slug!,
        titleUz: titleUz!,
        titleRu: titleRu!,
        bodyUz: '[Matn yurist tomonidan tayyorlanadi — 0-etap]',
        bodyRu: '[Текст готовит юрист — этап 0]',
        isPublished: false,
        version: new Date().toISOString().slice(0, 10),
      },
    });
  }
  console.log(`  huquqiy sahifalar: ${pages.length} ta (matn 0-etapda to‘ldiriladi)`);
}

async function main(): Promise<void> {
  console.log('ALIVER.UZ — boshlang‘ich ma’lumotlar:');
  await seedPermissions();
  await seedRoles();
  await seedSuperAdmin();
  await seedRegions();
  await seedWarehouse();
  await seedDeliveryMethods();
  await seedSettings();
  await seedLegalPages();

  // Demo katalog faqat ishlab chiqish/staging uchun.
  if (process.env.SEED_DEMO_CATALOG !== 'false' && process.env.APP_ENV !== 'production') {
    await seedCatalog(prisma);
  } else {
    console.log('  demo katalog: o‘tkazib yuborildi');
  }

  console.log('Tayyor.');
}

main()
  .catch((e: unknown) => {
    console.error('Seed xatosi:', e);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
