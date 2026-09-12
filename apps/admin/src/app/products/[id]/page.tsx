'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AdminShell } from '@/components/AdminShell';
import { ProductImages } from '@/components/ProductImages';
import {
  adminApi,
  type AdminBrand,
  type AdminCategory,
  type AdminKeyIngredient,
  type AdminProductDetail,
} from '@/lib/api';

/**
 * Mahsulot tahrirlash — TZ 24–27, TZ-2 3.1.
 *
 * Bu sahifa ilgari umuman yo'q edi: adminkada faqat ro'yxat bor edi va
 * mahsulotni yaratish yoki tahrirlashning YAGONA yo'li Excel import edi.
 * API da esa `POST /admin/catalog/products` va `PUT .../:id` allaqachon
 * ishlab turgan — ya'ni yetishmayotgan narsa faqat forma edi.
 *
 * Uchta qaror ataylab shunday:
 *
 *   1. Tablar emas, ketma-ket bloklar. Kosmetika mahsulotida majburiy
 *      maydonlar (INCI, ogohlantirish, IKPU) turli bloklarda yotadi va
 *      tab ostida yashiringani validatsiya xatosini ko'rinmas qiladi.
 *   2. Narx SO'MDA kiritiladi, bazada tiyinda. O'girish shu yerda, bitta
 *      joyda bo'ladi — operator tiyin haqida umuman bilmasligi kerak.
 *   3. Saqlash paneli pastda yopishib turadi: forma uzun va har safar
 *      oxirigacha aylantirish kerak bo'lmasin.
 */

const STATUSES = [
  { value: 'DRAFT', label: 'Qoralama' },
  { value: 'ACTIVE', label: 'Faol' },
  { value: 'HIDDEN', label: 'Yashirin' },
  { value: 'OUT_OF_STOCK', label: 'Tugagan' },
  { value: 'ARCHIVED', label: 'Arxiv' },
];

interface VariantForm {
  id?: string;
  sku: string;
  barcode: string;
  optionsText: string;
  price: string;
  oldPrice: string;
  costPrice: string;
  weightGrams: string;
  volumeMl: string;
  isActive: boolean;
}

interface Form {
  slug: string;
  brandId: string;
  nameUz: string;
  nameRu: string;
  nameEn: string;
  shortDescUz: string;
  shortDescRu: string;
  descUz: string;
  descRu: string;
  benefitsUz: string;
  benefitsRu: string;
  ingredientsUz: string;
  ingredientsRu: string;
  keyIngredients: AdminKeyIngredient[];
  claimUz: string;
  claimRu: string;
  howToUseUz: string;
  howToUseRu: string;
  warningsUz: string;
  warningsRu: string;
  countryOfOrigin: string;
  manufacturer: string;
  shelfLifeMonths: string;
  ikpuCode: string;
  vatRate: string;
  unitCode: string;
  status: string;
  isFeatured: boolean;
  seoTitleUz: string;
  seoTitleRu: string;
  seoDescUz: string;
  seoDescRu: string;
  categoryIds: string[];
  variants: VariantForm[];
}

const EMPTY_VARIANT: VariantForm = {
  sku: '',
  barcode: '',
  optionsText: '',
  price: '',
  oldPrice: '',
  costPrice: '',
  weightGrams: '',
  volumeMl: '',
  isActive: true,
};

const EMPTY_FORM: Form = {
  slug: '',
  brandId: '',
  nameUz: '',
  nameRu: '',
  nameEn: '',
  shortDescUz: '',
  shortDescRu: '',
  descUz: '',
  descRu: '',
  benefitsUz: '',
  benefitsRu: '',
  ingredientsUz: '',
  ingredientsRu: '',
  keyIngredients: [],
  claimUz: '',
  claimRu: '',
  howToUseUz: '',
  howToUseRu: '',
  warningsUz: '',
  warningsRu: '',
  countryOfOrigin: '',
  manufacturer: '',
  shelfLifeMonths: '',
  ikpuCode: '',
  vatRate: '12',
  unitCode: '1',
  status: 'DRAFT',
  isFeatured: false,
  seoTitleUz: '',
  seoTitleRu: '',
  seoDescUz: '',
  seoDescRu: '',
  categoryIds: [],
  variants: [{ ...EMPTY_VARIANT }],
};

/** Tiyin (matn) → so'm (matn). Bo'sh yoki nol bo'lsa bo'sh qoladi. */
function tiyinToSum(v: string | null): string {
  if (!v) return '';
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return '';
  return String(Math.round(n / 100));
}

function num(v: string): number | undefined {
  const t = v.trim();
  if (t === '') return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

/** Kategoriya daraxtini tekis ro'yxatga yoyish — `<select multiple>` uchun. */
function flatten(nodes: AdminCategory[], depth = 0): Array<{ id: string; label: string }> {
  return nodes.flatMap((n) => [
    { id: n.id, label: `${'— '.repeat(depth)}${n.nameUz}` },
    ...flatten(n.children ?? [], depth + 1),
  ]);
}

export default function ProductEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const isNew = id === 'yangi';

  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [brands, setBrands] = useState<AdminBrand[]>([]);
  // Rasmlar formaga kirmaydi: ular alohida endpointlar orqali darhol
  // saqlanadi, «Saqlash» tugmasini kutmaydi. Shuning uchun alohida state.
  const [images, setImages] = useState<AdminProductDetail['images']>([]);
  const [cats, setCats] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const set = useCallback(<K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
  }, []);

  useEffect(() => {
    void (async () => {
      // Brend va kategoriya ro'yxatlari mahsulotdan mustaqil — parallel.
      const [b, c] = await Promise.allSettled([adminApi.brands(), adminApi.categories()]);
      if (b.status === 'fulfilled') setBrands(b.value);
      if (c.status === 'fulfilled') setCats(c.value);
    })();
  }, []);

  useEffect(() => {
    if (isNew) return;
    void (async () => {
      setLoading(true);
      try {
        const p: AdminProductDetail = await adminApi.productDetail(id);
        setImages(p.images ?? []);
        setForm({
          slug: p.slug ?? '',
          brandId: p.brandId ?? '',
          nameUz: p.nameUz ?? '',
          nameRu: p.nameRu ?? '',
          nameEn: p.nameEn ?? '',
          shortDescUz: p.shortDescUz ?? '',
          shortDescRu: p.shortDescRu ?? '',
          descUz: p.descUz ?? '',
          descRu: p.descRu ?? '',
          benefitsUz: p.benefitsUz ?? '',
          benefitsRu: p.benefitsRu ?? '',
          ingredientsUz: p.ingredientsUz ?? '',
          ingredientsRu: p.ingredientsRu ?? '',
          keyIngredients: Array.isArray(p.keyIngredients) ? p.keyIngredients : [],
          claimUz: p.claimUz ?? '',
          claimRu: p.claimRu ?? '',
          howToUseUz: p.howToUseUz ?? '',
          howToUseRu: p.howToUseRu ?? '',
          warningsUz: p.warningsUz ?? '',
          warningsRu: p.warningsRu ?? '',
          countryOfOrigin: p.countryOfOrigin ?? '',
          manufacturer: p.manufacturer ?? '',
          shelfLifeMonths: p.shelfLifeMonths ? String(p.shelfLifeMonths) : '',
          ikpuCode: p.ikpuCode ?? '',
          vatRate: String(p.vatRate ?? 12),
          unitCode: p.unitCode ?? '1',
          status: p.status ?? 'DRAFT',
          isFeatured: Boolean(p.isFeatured),
          seoTitleUz: p.seoTitleUz ?? '',
          seoTitleRu: p.seoTitleRu ?? '',
          seoDescUz: p.seoDescUz ?? '',
          seoDescRu: p.seoDescRu ?? '',
          categoryIds: (p.categories ?? []).map((x) => x.categoryId),
          variants:
            (p.variants ?? []).length > 0
              ? p.variants.map((v) => ({
                  id: v.id,
                  sku: v.sku ?? '',
                  barcode: v.barcode ?? '',
                  optionsText: v.options
                    ? Object.entries(v.options)
                        .map(([k, val]) => `${k}=${val}`)
                        .join(', ')
                    : '',
                  price: tiyinToSum(v.price),
                  oldPrice: tiyinToSum(v.oldPrice),
                  costPrice: tiyinToSum(v.costPrice),
                  weightGrams: v.weightGrams ? String(v.weightGrams) : '',
                  volumeMl: v.volumeMl ? String(v.volumeMl) : '',
                  isActive: v.isActive !== false,
                }))
              : [{ ...EMPTY_VARIANT }],
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Mahsulotni yuklab bo‘lmadi');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isNew]);

  const catOptions = useMemo(() => flatten(cats), [cats]);

  /** Rasm amalidan keyin faqat rasmlar qayta o'qiladi — forma tegilmaydi. */
  const reloadImages = useCallback(async () => {
    if (isNew) return;
    const p = await adminApi.productDetail(id);
    setImages(p.images ?? []);
  }, [id, isNew]);

  /**
   * Majburiy maydonlar shu yerda ham tekshiriladi. Server baribir
   * tekshiradi, lekin uning xatosi bitta qatorli matn bo'lib keladi va
   * qaysi maydon ekanini ko'rsatmaydi — bu esa uzun formada azob.
   */
  function validate(f: Form): string | null {
    if (f.nameUz.trim().length < 2) return 'Nomi (o‘zbekcha) to‘ldirilmagan.';
    if (f.nameRu.trim().length < 2) return 'Nomi (ruscha) to‘ldirilmagan.';
    if (f.ingredientsUz.trim().length < 2) return 'Tarkib (INCI, o‘zbekcha) majburiy.';
    if (f.ingredientsRu.trim().length < 2) return 'Tarkib (INCI, ruscha) majburiy.';
    if (f.warningsUz.trim().length < 2) return 'Ogohlantirish (o‘zbekcha) majburiy.';
    if (f.warningsRu.trim().length < 2) return 'Ogohlantirish (ruscha) majburiy.';
    if (!/^\d{6,20}$/.test(f.ikpuCode.trim()))
      return 'IKPU (MXIK) kodi 6–20 raqamdan iborat bo‘lishi kerak. Uni buxgalter beradi.';
    if (f.variants.length === 0) return 'Kamida bitta variant kerak.';
    for (const [i, v] of f.variants.entries()) {
      if (v.sku.trim() === '') return `${i + 1}-variant: SKU to‘ldirilmagan.`;
      if (num(v.price) === undefined) return `${i + 1}-variant: narx to‘ldirilmagan.`;
    }
    const bad = f.keyIngredients.find(
      (k) => k.nameUz.trim() === '' || k.roleUz.trim() === '',
    );
    if (bad) return 'Asosiy tarkibning nomi va vazifasi to‘ldirilishi kerak.';
    return null;
  }

  function buildBody(f: Form) {
    return {
      slug: f.slug.trim() || undefined,
      brandId: f.brandId || undefined,
      nameUz: f.nameUz.trim(),
      nameRu: f.nameRu.trim(),
      nameEn: f.nameEn.trim() || undefined,
      shortDescUz: f.shortDescUz.trim() || undefined,
      shortDescRu: f.shortDescRu.trim() || undefined,
      descUz: f.descUz.trim() || undefined,
      descRu: f.descRu.trim() || undefined,
      benefitsUz: f.benefitsUz.trim() || undefined,
      benefitsRu: f.benefitsRu.trim() || undefined,
      ingredientsUz: f.ingredientsUz.trim(),
      ingredientsRu: f.ingredientsRu.trim(),
      keyIngredients:
        f.keyIngredients.length > 0
          ? f.keyIngredients.map((k) => ({
              nameUz: k.nameUz.trim(),
              // Ruscha to'ldirilmagan bo'lsa o'zbekchasi ketadi: bo'sh
              // qator saytda "undefined" bo'lib ko'rinishidan ko'ra shu yaxshi.
              nameRu: k.nameRu.trim() || k.nameUz.trim(),
              roleUz: k.roleUz.trim(),
              roleRu: k.roleRu.trim() || k.roleUz.trim(),
            }))
          : undefined,
      claimUz: f.claimUz.trim() || undefined,
      claimRu: f.claimRu.trim() || undefined,
      howToUseUz: f.howToUseUz.trim() || undefined,
      howToUseRu: f.howToUseRu.trim() || undefined,
      warningsUz: f.warningsUz.trim(),
      warningsRu: f.warningsRu.trim(),
      countryOfOrigin: f.countryOfOrigin.trim() || undefined,
      manufacturer: f.manufacturer.trim() || undefined,
      shelfLifeMonths: num(f.shelfLifeMonths),
      ikpuCode: f.ikpuCode.trim(),
      vatRate: num(f.vatRate),
      unitCode: f.unitCode.trim() || undefined,
      status: f.status,
      isFeatured: f.isFeatured,
      seoTitleUz: f.seoTitleUz.trim() || undefined,
      seoTitleRu: f.seoTitleRu.trim() || undefined,
      seoDescUz: f.seoDescUz.trim() || undefined,
      seoDescRu: f.seoDescRu.trim() || undefined,
      categoryIds: f.categoryIds.length > 0 ? f.categoryIds : undefined,
      variants: f.variants.map((v) => ({
        id: v.id,
        sku: v.sku.trim().toUpperCase(),
        barcode: v.barcode.trim() || undefined,
        options: parseOptions(v.optionsText),
        price: num(v.price),
        oldPrice: num(v.oldPrice),
        costPrice: num(v.costPrice),
        weightGrams: num(v.weightGrams),
        volumeMl: num(v.volumeMl),
        isActive: v.isActive,
      })),
    };
  }

  async function save() {
    const problem = validate(form);
    if (problem) {
      setError(problem);
      setNotice(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const body = buildBody(form);
      if (isNew) {
        const created = await adminApi.createProduct(body);
        router.replace(`/products/${created.id}`);
        setNotice('Mahsulot yaratildi.');
      } else {
        await adminApi.updateProduct(id, body);
        setNotice('Saqlandi.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Saqlab bo‘lmadi');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AdminShell title="Mahsulot">
        <div className="alv-card" style={{ padding: 24, color: 'var(--alv-muted)' }}>
          Yuklanmoqda…
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title={isNew ? 'Yangi mahsulot' : form.nameUz || 'Mahsulot'}>
      {error ? (
        <div
          role="alert"
          className="alv-card"
          style={{ padding: 14, marginBottom: 14, borderLeft: '3px solid var(--alv-danger)' }}
        >
          {error}
        </div>
      ) : null}
      {notice ? (
        <div
          role="status"
          className="alv-card"
          style={{ padding: 14, marginBottom: 14, borderLeft: '3px solid var(--alv-mint)' }}
        >
          {notice}
        </div>
      ) : null}

      <p style={{ margin: '0 0 16px' }}>
        <Link href="/products" style={{ color: 'var(--alv-brand)', fontSize: 14 }}>
          ← Mahsulotlar ro‘yxati
        </Link>
      </p>

      <div style={{ display: 'grid', gap: 16, paddingBottom: 90 }}>
        <Block title="Asosiy">
          <Row>
            <Field label="Nomi (o‘zbekcha)" required>
              <input style={INPUT} value={form.nameUz} onChange={(e) => set('nameUz', e.target.value)} />
            </Field>
            <Field label="Nomi (ruscha)" required>
              <input style={INPUT} value={form.nameRu} onChange={(e) => set('nameRu', e.target.value)} />
            </Field>
          </Row>
          <Row>
            <Field label="Slug" hint="Bo‘sh qoldirilsa nomdan avtomatik yasaladi.">
              <input style={INPUT} value={form.slug} onChange={(e) => set('slug', e.target.value)} />
            </Field>
            <Field label="Brend">
              <select style={INPUT} value={form.brandId} onChange={(e) => set('brandId', e.target.value)}>
                <option value="">— tanlanmagan —</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
          </Row>
          <Row>
            <Field label="Holat">
              <select style={INPUT} value={form.status} onChange={(e) => set('status', e.target.value)}>
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Kategoriyalar" hint="Ctrl bilan bir nechtasini tanlash mumkin.">
              <select
                multiple
                size={6}
                style={{ ...INPUT, height: 'auto' }}
                value={form.categoryIds}
                onChange={(e) =>
                  set(
                    'categoryIds',
                    Array.from(e.target.selectedOptions).map((o) => o.value),
                  )
                }
              >
                {catOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
          </Row>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
            <input
              type="checkbox"
              checked={form.isFeatured}
              onChange={(e) => set('isFeatured', e.target.checked)}
            />
            Bosh sahifada ko‘rsatilsin
          </label>
        </Block>

        <Block title="Matnlar">
          <Row>
            <Field label="Qisqa izoh (o‘zb.)" hint="Kartochkada bir qator bo‘lib chiqadi.">
              <input
                style={INPUT}
                value={form.shortDescUz}
                onChange={(e) => set('shortDescUz', e.target.value)}
              />
            </Field>
            <Field label="Qisqa izoh (rus.)">
              <input
                style={INPUT}
                value={form.shortDescRu}
                onChange={(e) => set('shortDescRu', e.target.value)}
              />
            </Field>
          </Row>
          <Row>
            <Field label="Tavsif (o‘zb.)">
              <textarea style={AREA} rows={5} value={form.descUz} onChange={(e) => set('descUz', e.target.value)} />
            </Field>
            <Field label="Tavsif (rus.)">
              <textarea style={AREA} rows={5} value={form.descRu} onChange={(e) => set('descRu', e.target.value)} />
            </Field>
          </Row>
          <Row>
            <Field label="Foydasi (o‘zb.)">
              <textarea style={AREA} rows={3} value={form.benefitsUz} onChange={(e) => set('benefitsUz', e.target.value)} />
            </Field>
            <Field label="Foydasi (rus.)">
              <textarea style={AREA} rows={3} value={form.benefitsRu} onChange={(e) => set('benefitsRu', e.target.value)} />
            </Field>
          </Row>
          <Row>
            <Field label="Qo‘llash (o‘zb.)">
              <textarea style={AREA} rows={3} value={form.howToUseUz} onChange={(e) => set('howToUseUz', e.target.value)} />
            </Field>
            <Field label="Qo‘llash (rus.)">
              <textarea style={AREA} rows={3} value={form.howToUseRu} onChange={(e) => set('howToUseRu', e.target.value)} />
            </Field>
          </Row>
        </Block>

        <Block title="Rasmlar" hint="Birinchi rasm kartochkada va qidiruvda ko‘rinadi.">
          <ProductImages
            productId={isNew ? null : id}
            images={images}
            onChange={reloadImages}
          />
        </Block>

        <Block
          title="Tarkib"
          hint="Mijoz INCI ro‘yxatini baholay olmaydi. Uchta asosiy tarkibni vazifasi bilan yozing — mahsulot sahifasida aynan shular birinchi ko‘rinadi."
        >
          <KeyIngredientsEditor
            items={form.keyIngredients}
            onChange={(v) => set('keyIngredients', v)}
          />
          <Row>
            <Field label="Isbot / natija (o‘zb.)" hint="Masalan: «100% quruqlik kamayganini tasdiqladi»">
              <input style={INPUT} value={form.claimUz} onChange={(e) => set('claimUz', e.target.value)} />
            </Field>
            <Field label="Isbot / natija (rus.)">
              <input style={INPUT} value={form.claimRu} onChange={(e) => set('claimRu', e.target.value)} />
            </Field>
          </Row>
          <Row>
            <Field label="To‘liq tarkib, INCI (o‘zb.)" required>
              <textarea
                style={AREA}
                rows={4}
                value={form.ingredientsUz}
                onChange={(e) => set('ingredientsUz', e.target.value)}
              />
            </Field>
            <Field label="To‘liq tarkib, INCI (rus.)" required>
              <textarea
                style={AREA}
                rows={4}
                value={form.ingredientsRu}
                onChange={(e) => set('ingredientsRu', e.target.value)}
              />
            </Field>
          </Row>
          <Row>
            <Field label="Ogohlantirish (o‘zb.)" required>
              <textarea
                style={AREA}
                rows={3}
                value={form.warningsUz}
                onChange={(e) => set('warningsUz', e.target.value)}
              />
            </Field>
            <Field label="Ogohlantirish (rus.)" required>
              <textarea
                style={AREA}
                rows={3}
                value={form.warningsRu}
                onChange={(e) => set('warningsRu', e.target.value)}
              />
            </Field>
          </Row>
        </Block>

        <Block
          title="Fiskal va ishlab chiqaruvchi"
          hint="IKPU (MXIK) kodisiz chek yuborilmaydi — kodni buxgalter beradi."
        >
          <Row>
            <Field label="IKPU (MXIK) kodi" required>
              <input
                style={INPUT}
                inputMode="numeric"
                value={form.ikpuCode}
                onChange={(e) => set('ikpuCode', e.target.value)}
                placeholder="03302001001000000"
              />
            </Field>
            <Field label="QQS, %">
              <input style={INPUT} inputMode="numeric" value={form.vatRate} onChange={(e) => set('vatRate', e.target.value)} />
            </Field>
            <Field label="O‘lchov birligi kodi">
              <input style={INPUT} value={form.unitCode} onChange={(e) => set('unitCode', e.target.value)} />
            </Field>
          </Row>
          <Row>
            <Field label="Ishlab chiqarilgan davlat">
              <input style={INPUT} value={form.countryOfOrigin} onChange={(e) => set('countryOfOrigin', e.target.value)} />
            </Field>
            <Field label="Ishlab chiqaruvchi">
              <input style={INPUT} value={form.manufacturer} onChange={(e) => set('manufacturer', e.target.value)} />
            </Field>
            <Field label="Yaroqlilik muddati, oy">
              <input
                style={INPUT}
                inputMode="numeric"
                value={form.shelfLifeMonths}
                onChange={(e) => set('shelfLifeMonths', e.target.value)}
              />
            </Field>
          </Row>
        </Block>

        <Block title="Variantlar" hint="Narxlar SO‘MDA kiritiladi.">
          <VariantsEditor items={form.variants} onChange={(v) => set('variants', v)} />
        </Block>

        <Block title="SEO">
          <Row>
            <Field label="Sarlavha (o‘zb.)">
              <input style={INPUT} value={form.seoTitleUz} onChange={(e) => set('seoTitleUz', e.target.value)} />
            </Field>
            <Field label="Sarlavha (rus.)">
              <input style={INPUT} value={form.seoTitleRu} onChange={(e) => set('seoTitleRu', e.target.value)} />
            </Field>
          </Row>
          <Row>
            <Field label="Meta tavsif (o‘zb.)">
              <textarea style={AREA} rows={2} value={form.seoDescUz} onChange={(e) => set('seoDescUz', e.target.value)} />
            </Field>
            <Field label="Meta tavsif (rus.)">
              <textarea style={AREA} rows={2} value={form.seoDescRu} onChange={(e) => set('seoDescRu', e.target.value)} />
            </Field>
          </Row>
        </Block>
      </div>

      {/* Forma uzun — saqlash tugmasi doim ko'rinib turadi. */}
      <div
        style={{
          position: 'sticky',
          bottom: 0,
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          padding: '12px 16px',
          background: 'var(--alv-surface)',
          border: '1px solid var(--alv-line)',
          borderRadius: 12,
          boxShadow: '0 -6px 18px rgba(27,18,32,.08)',
          // Ilgari bu yerda `margin: 0 -16px` bor edi — to'liq kenglik
          // uchun. Mobil ekranda (390px) u gorizontal aylantirish hosil
          // qilardi, chunki shell paddingi 16px dan kichik. Endi panel
          // kartochkalar bilan bir tekisda turadi.
        }}
      >
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          style={{
            padding: '11px 22px',
            borderRadius: 10,
            border: 'none',
            background: 'var(--alv-ink)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 15,
            cursor: saving ? 'progress' : 'pointer',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Saqlanmoqda…' : isNew ? 'Yaratish' : 'Saqlash'}
        </button>
        <Link href="/products" style={{ color: 'var(--alv-muted)', fontSize: 14 }}>
          Bekor qilish
        </Link>
      </div>
    </AdminShell>
  );
}

/* ============================ Asosiy tarkib ============================ */

function KeyIngredientsEditor({
  items,
  onChange,
}: {
  items: AdminKeyIngredient[];
  onChange: (v: AdminKeyIngredient[]) => void;
}) {
  function patch(i: number, k: keyof AdminKeyIngredient, v: string) {
    onChange(items.map((x, idx) => (idx === i ? { ...x, [k]: v } : x)));
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {items.map((it, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            // DIQQAT: `repeat(auto-fit, …)` yonida `auto` trek turolmaydi —
            // butun qoida yaroqsiz bo'ladi va grid bitta ustunga tushib
            // qoladi. Shu sababli tugma alohida qatorga chiqarilgan.
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 8,
            alignItems: 'start',
            padding: 12,
            border: '1px solid var(--alv-line)',
            borderRadius: 10,
          }}
        >
          <Field label={`${i + 1}. Nomi (o‘zb.)`}>
            <input style={INPUT} value={it.nameUz} onChange={(e) => patch(i, 'nameUz', e.target.value)} />
          </Field>
          <Field label="Nomi (rus.)">
            <input style={INPUT} value={it.nameRu} onChange={(e) => patch(i, 'nameRu', e.target.value)} />
          </Field>
          <Field label="Vazifasi (o‘zb.)">
            <input style={INPUT} value={it.roleUz} onChange={(e) => patch(i, 'roleUz', e.target.value)} />
          </Field>
          <Field label="Vazifasi (rus.)">
            <input style={INPUT} value={it.roleRu} onChange={(e) => patch(i, 'roleRu', e.target.value)} />
          </Field>
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              aria-label={`${i + 1}-tarkibni o‘chirish`}
              style={GHOST_BTN}
            >
              O‘chirish
            </button>
          </div>
        </div>
      ))}

      {items.length < 3 ? (
        <button
          type="button"
          onClick={() => onChange([...items, { nameUz: '', nameRu: '', roleUz: '', roleRu: '' }])}
          style={{ ...GHOST_BTN, justifySelf: 'start' }}
        >
          + Asosiy tarkib qo‘shish
        </button>
      ) : (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--alv-muted)' }}>
          Uchtadan ortiq bo‘lsa «asosiy» ma‘nosini yo‘qotadi — qolganlari to‘liq INCI ro‘yxatida.
        </p>
      )}
    </div>
  );
}

/* ============================== Variantlar ============================== */

function VariantsEditor({
  items,
  onChange,
}: {
  items: VariantForm[];
  onChange: (v: VariantForm[]) => void;
}) {
  function patch(i: number, k: keyof VariantForm, v: string | boolean) {
    onChange(items.map((x, idx) => (idx === i ? { ...x, [k]: v } : x)));
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {items.map((v, i) => (
        <div
          key={v.id ?? i}
          style={{ padding: 14, border: '1px solid var(--alv-line)', borderRadius: 10, display: 'grid', gap: 10 }}
        >
          <Row>
            <Field label="SKU" required>
              <input style={INPUT} value={v.sku} onChange={(e) => patch(i, 'sku', e.target.value)} />
            </Field>
            <Field label="Shtrix-kod">
              <input style={INPUT} value={v.barcode} onChange={(e) => patch(i, 'barcode', e.target.value)} />
            </Field>
            <Field label="Xususiyatlar" hint="Masalan: hajm=60 ml, rang=03">
              <input style={INPUT} value={v.optionsText} onChange={(e) => patch(i, 'optionsText', e.target.value)} />
            </Field>
          </Row>
          <Row>
            <Field label="Narx, so‘m" required>
              <input style={INPUT} inputMode="numeric" value={v.price} onChange={(e) => patch(i, 'price', e.target.value)} />
            </Field>
            <Field label="Eski narx, so‘m">
              <input style={INPUT} inputMode="numeric" value={v.oldPrice} onChange={(e) => patch(i, 'oldPrice', e.target.value)} />
            </Field>
            <Field label="Tannarx, so‘m" hint="Saytda ko‘rinmaydi, faqat hisobot uchun.">
              <input style={INPUT} inputMode="numeric" value={v.costPrice} onChange={(e) => patch(i, 'costPrice', e.target.value)} />
            </Field>
          </Row>
          <Row>
            <Field label="Og‘irligi, gramm">
              <input style={INPUT} inputMode="numeric" value={v.weightGrams} onChange={(e) => patch(i, 'weightGrams', e.target.value)} />
            </Field>
            <Field label="Hajmi, ml">
              <input style={INPUT} inputMode="numeric" value={v.volumeMl} onChange={(e) => patch(i, 'volumeMl', e.target.value)} />
            </Field>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', paddingTop: 18 }}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
                <input type="checkbox" checked={v.isActive} onChange={(e) => patch(i, 'isActive', e.target.checked)} />
                Faol
              </label>
              {items.length > 1 ? (
                <button
                  type="button"
                  onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                  style={GHOST_BTN}
                >
                  Variantni o‘chirish
                </button>
              ) : null}
            </div>
          </Row>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, { ...EMPTY_VARIANT }])}
        style={{ ...GHOST_BTN, justifySelf: 'start' }}
      >
        + Variant qo‘shish
      </button>
    </div>
  );
}

/* ============================== Yordamchilar ============================== */

/** «hajm=60 ml, rang=03» → { hajm: '60 ml', rang: '03' } */
function parseOptions(text: string): Record<string, string> | undefined {
  const t = text.trim();
  if (t === '') return undefined;
  const out: Record<string, string> = {};
  for (const part of t.split(',')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k && v) out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

const INPUT: React.CSSProperties = {
  padding: '9px 12px',
  borderRadius: 10,
  border: '1px solid var(--alv-line)',
  fontSize: 14,
  background: 'var(--alv-surface)',
  color: 'var(--alv-ink)',
  width: '100%',
  minWidth: 0,
  fontFamily: 'inherit',
};

const AREA: React.CSSProperties = { ...INPUT, resize: 'vertical', lineHeight: 1.55 };

const GHOST_BTN: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 9,
  border: '1px solid var(--alv-line)',
  background: 'var(--alv-surface)',
  color: 'var(--alv-ink)',
  fontSize: 13.5,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

function Block({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="alv-card" style={{ padding: 18 }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 17 }}>{title}</h2>
      {hint ? (
        <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--alv-muted)', lineHeight: 1.55 }}>
          {hint}
        </p>
      ) : (
        <div style={{ height: 12 }} />
      )}
      <div style={{ display: 'grid', gap: 12 }}>{children}</div>
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 12,
        // `stretch` bo'lsa bitta baland maydon (masalan ko'p tanlovli
        // kategoriya ro'yxati) yonidagi oddiy `select` ni ham cho'zib
        // yuboradi va u xunuk ko'rinadi.
        alignItems: 'start',
      }}
    >
      {children}
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: 'grid', gap: 5, fontSize: 13, minWidth: 0 }}>
      <span style={{ fontWeight: 600 }}>
        {label}
        {required ? <span style={{ color: 'var(--alv-danger)' }}> *</span> : null}
      </span>
      {children}
      {hint ? (
        <span style={{ color: 'var(--alv-muted)', fontSize: 12, lineHeight: 1.5 }}>{hint}</span>
      ) : null}
    </label>
  );
}
