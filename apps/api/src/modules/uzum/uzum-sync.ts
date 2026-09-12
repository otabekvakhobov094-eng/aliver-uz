import type { Tiyin } from '../../common/money';

/**
 * Ikki do'kon o'rtasidagi farqni hisoblash — ALIVER.UZ va Uzum.
 *
 * Bu fayl tarmoqqa ham, Prisma ga ham bog'liq emas. Sabab oddiy: bu
 * yerda PUL va QOLDIQ hisoblanadi, ya'ni xato qimmatga tushadi va
 * uni to'g'ridan-to'g'ri sinash mumkin bo'lishi kerak.
 *
 * IKKI TUZOQ bor va ikkalasi ham o'zini darhol ko'rsatmaydi.
 *
 * 1. NARX. Uzum narxi ichida marketpleys komissiyasi bor. O'z
 *    saytimizdagi narxni Uzum'ga ko'chirish — komissiya miqdorida
 *    zarar ko'rib sotish demak. Buni oylik hisobotda, tovar
 *    sotilganidan keyin ko'rasiz. Shuning uchun narx FAQAT ustama
 *    aniq ko'rsatilganda yuboriladi; ustamasiz esa farq ko'rsatiladi,
 *    lekin hech narsa o'zgartirilmaydi.
 *
 * 2. QOLDIQ. Bitta ombor, ikkita savdo kanali. Oxirgi dona bir vaqtda
 *    ikkala joyda sotilsa, bittasini bekor qilishga to'g'ri keladi —
 *    Uzum'da bu reyting jarimasi. Shuning uchun zaxira: bir necha
 *    donani marketpleysga umuman ko'rsatmaslik mumkin.
 */

export interface LocalOffer {
  sku: string;
  nameUz: string;
  /** Bizning saytdagi narx, tiyinda. */
  priceTiyin: Tiyin;
  /** Sotuvga tayyor qoldiq (rezervlar ayrilgan). */
  available: number;
  isActive: boolean;
}

export interface RemoteOffer {
  externalId: string;
  sku: string | null;
  nameUz: string;
  priceTiyin: Tiyin | null;
  stock: number | null;
}

export type SyncAction =
  /** Hamma narsa mos — hech narsa qilinmaydi. */
  | 'ok'
  /** Faqat qoldiq farq qiladi. */
  | 'stock'
  /** Faqat narx farq qiladi. */
  | 'price'
  /** Ikkalasi ham. */
  | 'both'
  /** Bizda bor, Uzum'da yo'q — u yerda qo'lda yaratilishi kerak. */
  | 'only-here'
  /** Uzum'da bor, bizda yo'q — SKU mos kelmayapti yoki tovar arxivda. */
  | 'only-there';

export interface SyncRow {
  sku: string;
  externalId: string | null;
  nameUz: string;
  local: { priceTiyin: string | null; available: number | null };
  remote: { priceTiyin: string | null; stock: number | null };
  /** Uzum'da bo'lishi kerak bo'lgan qiymatlar. */
  target: { priceTiyin: string | null; stock: number | null };
  action: SyncAction;
  /** Odam o'qiy oladigan izoh — adminda shu ko'rsatiladi. */
  note: string;
}

export interface SyncPlan {
  rows: SyncRow[];
  summary: {
    total: number;
    ok: number;
    needsStock: number;
    needsPrice: number;
    onlyHere: number;
    onlyThere: number;
    /** Narx yuboriladimi. `false` bo'lsa faqat farq ko'rsatiladi. */
    priceSyncEnabled: boolean;
    markupPercent: number | null;
    reserveStock: number;
  };
}

/**
 * Uzum uchun narx: bizning narx + ustama.
 *
 * Yuqoriga yaxlitlanadi. Pastga yaxlitlash har bir tovarda bir necha
 * tiyin yo'qotardi — o'zi kichik, lekin bu yo'qotish komissiyaning
 * yon tomonida turadi va uni hech kim sezmaydi.
 */
export function uzumPrice(priceTiyin: Tiyin, markupPercent: number | null): Tiyin | null {
  if (markupPercent === null || !Number.isFinite(markupPercent) || markupPercent < 0) return null;
  const scaled = priceTiyin * BigInt(Math.round(markupPercent * 100) + 10_000);
  // 10 000 = 100% × 100 (foizning kasr qismi uchun).
  const whole = scaled / 10_000n;
  return scaled % 10_000n === 0n ? whole : whole + 1n;
}

/**
 * Marketpleysga ko'rsatiladigan qoldiq.
 *
 * Zaxira AYRILADI va natija hech qachon manfiy bo'lmaydi. Nofaol
 * variant esa nolga tushiriladi: sayt uni sotmayotgan bo'lsa,
 * marketpleys ham sotmasligi kerak.
 */
export function uzumStock(offer: LocalOffer, reserve: number): number {
  if (!offer.isActive) return 0;
  const safe = Math.max(0, Math.floor(reserve));
  return Math.max(0, offer.available - safe);
}

/**
 * Farqlar rejasi.
 *
 * SKU bo'yicha moslashtiriladi — bu ikkala tomonda ham bizning
 * qo'yganimiz va aynan shuning uchun ishonchli. Uzum'ning ichki
 * identifikatori bizda yo'q va uni taxmin qilib bo'lmaydi.
 */
export function buildSyncPlan(params: {
  local: LocalOffer[];
  remote: RemoteOffer[];
  /** Uzum narxi uchun ustama, foizda. `null` — narx sinxronlanmaydi. */
  markupPercent?: number | null;
  /** Marketpleysga ko'rsatilmaydigan zaxira, dona. */
  reserveStock?: number;
}): SyncPlan {
  const markupPercent = params.markupPercent ?? null;
  const reserveStock = Math.max(0, Math.floor(params.reserveStock ?? 0));

  const remoteBySku = new Map<string, RemoteOffer>();
  const remoteWithoutSku: RemoteOffer[] = [];
  for (const r of params.remote) {
    // SKU katta-kichik harfga sezgir emas: Uzum kabinetida uni qo'lda
    // kiritishgan bo'lishi mumkin.
    if (r.sku) remoteBySku.set(r.sku.trim().toUpperCase(), r);
    else remoteWithoutSku.push(r);
  }

  const rows: SyncRow[] = [];
  const seen = new Set<string>();

  for (const l of params.local) {
    const key = l.sku.trim().toUpperCase();
    const r = remoteBySku.get(key);
    const targetStock = uzumStock(l, reserveStock);
    const targetPrice = uzumPrice(l.priceTiyin, markupPercent);

    if (!r) {
      rows.push({
        sku: l.sku,
        externalId: null,
        nameUz: l.nameUz,
        local: { priceTiyin: l.priceTiyin.toString(), available: l.available },
        remote: { priceTiyin: null, stock: null },
        target: { priceTiyin: targetPrice?.toString() ?? null, stock: targetStock },
        action: 'only-here',
        note: 'Uzum’da bu SKU topilmadi — kartochka o‘sha yerda qo‘lda yaratilishi kerak',
      });
      continue;
    }
    seen.add(key);

    const stockDiffers = r.stock !== targetStock;
    // Narx ustama ko'rsatilmagan bo'lsa TAQQOSLANMAYDI: taqqoslash
    // natijasi har doim «farq bor» bo'lardi va ro'yxat ma'nosiz
    // ogohlantirishlar bilan to'lib ketardi.
    const priceDiffers = targetPrice !== null && r.priceTiyin !== targetPrice;

    const action: SyncAction =
      stockDiffers && priceDiffers
        ? 'both'
        : stockDiffers
          ? 'stock'
          : priceDiffers
            ? 'price'
            : 'ok';

    rows.push({
      sku: l.sku,
      externalId: r.externalId,
      nameUz: l.nameUz,
      local: { priceTiyin: l.priceTiyin.toString(), available: l.available },
      remote: { priceTiyin: r.priceTiyin?.toString() ?? null, stock: r.stock },
      target: { priceTiyin: targetPrice?.toString() ?? null, stock: targetStock },
      action,
      note: noteFor(action, { markupPercent, reserveStock, isActive: l.isActive }),
    });
  }

  for (const [key, r] of remoteBySku) {
    if (seen.has(key)) continue;
    rows.push({
      sku: r.sku ?? '—',
      externalId: r.externalId,
      nameUz: r.nameUz,
      local: { priceTiyin: null, available: null },
      remote: { priceTiyin: r.priceTiyin?.toString() ?? null, stock: r.stock },
      target: { priceTiyin: null, stock: null },
      action: 'only-there',
      note: 'Bizning katalogda bunday SKU yo‘q — SKU mos kelmayapti yoki tovar arxivlangan',
    });
  }

  for (const r of remoteWithoutSku) {
    rows.push({
      sku: '—',
      externalId: r.externalId,
      nameUz: r.nameUz,
      local: { priceTiyin: null, available: null },
      remote: { priceTiyin: r.priceTiyin?.toString() ?? null, stock: r.stock },
      target: { priceTiyin: null, stock: null },
      action: 'only-there',
      note: 'Uzum kartochkasida SKU ko‘rsatilmagan — moslashtirib bo‘lmaydi',
    });
  }

  const count = (a: SyncAction) => rows.filter((r) => r.action === a).length;
  return {
    rows,
    summary: {
      total: rows.length,
      ok: count('ok'),
      needsStock: count('stock') + count('both'),
      needsPrice: count('price') + count('both'),
      onlyHere: count('only-here'),
      onlyThere: count('only-there'),
      priceSyncEnabled: markupPercent !== null,
      markupPercent,
      reserveStock,
    },
  };
}

function noteFor(
  action: SyncAction,
  ctx: { markupPercent: number | null; reserveStock: number; isActive: boolean },
): string {
  if (action === 'ok') return 'Mos';
  if (!ctx.isActive) return 'Variant saytda nofaol — Uzum’da ham qoldiq nolga tushirilsin';
  const parts: string[] = [];
  if (action === 'stock' || action === 'both') {
    parts.push(
      ctx.reserveStock > 0
        ? `Qoldiq farq qiladi (${ctx.reserveStock} dona zaxira ayrilgan)`
        : 'Qoldiq farq qiladi',
    );
  }
  if (action === 'price' || action === 'both') {
    parts.push(`Narx farq qiladi (ustama ${ctx.markupPercent}%)`);
  }
  return parts.join('; ');
}

/**
 * Uzum kabinetiga qo'lda yuklash uchun CSV.
 *
 * NEGA CSV. Uzum Seller API kaliti hali yo'q va u qachon berilishi
 * bizga bog'liq emas. Kalitni kutib turish esa ikkala do'konda narx
 * va qoldiqni qo'lda tenglashtirishda davom etish demakdir. CSV
 * bugun ishlaydi: admin faylni yuklab oladi va Uzum kabinetidagi
 * ommaviy tahrirlashga beradi.
 *
 * Ajratgich — NUQTALI VERGUL. Excel ruscha/o'zbekcha mintaqada
 * vergulni ustun ajratgichi deb tanimaydi va butun fayl bitta
 * ustunga tushib qolardi.
 */
export function syncPlanToCsv(plan: SyncPlan): string {
  const head = [
    'SKU',
    'Uzum ID',
    'Nomi',
    'Bizdagi narx (so‘m)',
    'Uzum narxi (so‘m)',
    'Bo‘lishi kerak (so‘m)',
    'Bizdagi qoldiq',
    'Uzum qoldig‘i',
    'Bo‘lishi kerak',
    'Holat',
    'Izoh',
  ];

  const lines = [head.join(';')];
  for (const r of plan.rows) {
    lines.push(
      [
        r.sku,
        r.externalId ?? '',
        r.nameUz,
        toSum(r.local.priceTiyin),
        toSum(r.remote.priceTiyin),
        toSum(r.target.priceTiyin),
        r.local.available ?? '',
        r.remote.stock ?? '',
        r.target.stock ?? '',
        r.action,
        r.note,
      ]
        .map(csvCell)
        .join(';'),
    );
  }
  // BOM — Excel faylni UTF-8 deb tanishi uchun. Usiz o'zbekcha
  // harflar buzilib ko'rinadi.
  return `﻿${lines.join('\r\n')}\r\n`;
}

function toSum(tiyin: string | null): string {
  if (tiyin === null) return '';
  return (BigInt(tiyin) / 100n).toString();
}

function csvCell(value: string | number): string {
  const s = String(value);
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
