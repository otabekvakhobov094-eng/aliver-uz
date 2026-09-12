'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { adminApi, type AdminProductDetail } from '@/lib/api';

type Image = AdminProductDetail['images'][number];

/**
 * Mahsulot rasmlari — TZ 26.
 *
 * API (`POST /admin/media/products/:id` va qolganlari) ancha oldin
 * yozilgan edi, faqat unga yetib boradigan ekran yo'q edi: rasm faqat
 * Excel import orqali kirardi.
 *
 * Ikkita qoida serverdan keladi va shuning uchun bu yerda ham majburiy
 * qilingan:
 *
 *   — alt matn IKKALA tilda majburiy. Server buni rad etadi, lekin
 *     xatoni fayl yuklanib bo'lgandan keyin qaytaradi — foydalanuvchi
 *     esa katta faylni ikki marta yuborgan bo'ladi. Shuning uchun
 *     tekshiruv yuborishdan oldin.
 *   — birinchi rasm MAIN bo'ladi; qolganlari GALLERY. Kartochkada va
 *     qidiruvda aynan MAIN ishlatiladi.
 *
 * Rasm yangi mahsulotga yuklanmaydi: `productId` hali yo'q. Shuning
 * uchun forma avval saqlanishi kerak va buni ochiq aytamiz — "yuklash
 * ishlamayapti" degan taassurot qolmasin.
 */

interface Props {
  productId: string | null;
  images: Image[];
  onChange: () => void | Promise<void>;
}

const KIND_LABEL: Record<string, string> = {
  MAIN: 'Asosiy',
  GALLERY: 'Galereya',
  SWATCH: 'Soya namunasi',
};

export function ProductImages({ productId, images, onChange }: Props) {
  const [altUz, setAltUz] = useState('');
  const [altRu, setAltRu] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [order, setOrder] = useState<Image[]>(images);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => setOrder(images), [images]);

  const run = useCallback(
    async (fn: () => Promise<unknown>, ok: string) => {
      setBusy(true);
      setError(null);
      setNotice(null);
      try {
        await fn();
        await onChange();
        setNotice(ok);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Xatolik');
      } finally {
        setBusy(false);
      }
    },
    [onChange],
  );

  if (!productId) {
    return (
      <p style={{ margin: 0, color: 'var(--alv-muted)', fontSize: 14, lineHeight: 1.6 }}>
        Rasm yuklash uchun mahsulot avval saqlanishi kerak — yuklash manzili
        mahsulot raqamiga bog‘langan. Pastdagi «Yaratish» tugmasini bosing,
        shundan keyin shu yerda yuklash oynasi ochiladi.
      </p>
    );
  }

  async function upload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError('Fayl tanlanmagan.');
      return;
    }
    // Server ham tekshiradi, lekin u faylni to'liq qabul qilib bo'lgach
    // rad etadi — bu yerda tekshirilsa foydalanuvchi qayta yubormaydi.
    if (altUz.trim() === '' || altRu.trim() === '') {
      setError('Alt matn ikkala tilda majburiy — u SEO va skrinrider uchun kerak.');
      return;
    }
    await run(async () => {
      await adminApi.uploadProductImage(productId!, file, {
        altUz: altUz.trim(),
        altRu: altRu.trim(),
        // Birinchi rasm asosiy bo'ladi: kartochka va qidiruv MAIN ni oladi,
        // u bo'lmasa mahsulot ro'yxatda rasmsiz turadi.
        kind: order.length === 0 ? 'MAIN' : 'GALLERY',
      });
      setAltUz('');
      setAltRu('');
      if (fileRef.current) fileRef.current.value = '';
    }, 'Rasm yuklandi.');
  }

  function move(index: number, delta: number) {
    const next = [...order];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    setOrder(next);
    void run(
      () => adminApi.reorderProductImages(productId!, next.map((i) => i.id)),
      'Tartib saqlandi.',
    );
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {error ? (
        <div role="alert" style={NOTE('var(--alv-danger)')}>
          {error}
        </div>
      ) : null}
      {notice ? (
        <div role="status" style={NOTE('var(--alv-mint)')}>
          {notice}
        </div>
      ) : null}

      {order.length > 0 ? (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))',
            gap: 12,
          }}
        >
          {order.map((img, i) => (
            <li
              key={img.id}
              style={{
                border: '1px solid var(--alv-line)',
                borderRadius: 10,
                overflow: 'hidden',
                background: 'var(--alv-surface)',
              }}
            >
              <div style={{ position: 'relative', aspectRatio: '1 / 1', background: 'var(--alv-line)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.urlWebp ?? img.url}
                  alt={img.altUz ?? ''}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                {img.kind === 'MAIN' ? (
                  <span
                    style={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      background: 'var(--alv-ink)',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 999,
                    }}
                  >
                    Asosiy
                  </span>
                ) : null}
              </div>

              <div style={{ padding: 10, display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--alv-muted)', lineHeight: 1.45 }}>
                  {KIND_LABEL[img.kind] ?? img.kind}
                  {img.altUz ? ` · ${img.altUz}` : ' · alt matn yo‘q'}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <button type="button" onClick={() => move(i, -1)} disabled={busy || i === 0} style={MINI} aria-label="Chapga surish">
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={busy || i === order.length - 1}
                    style={MINI}
                    aria-label="O‘ngga surish"
                  >
                    →
                  </button>
                  {img.kind !== 'MAIN' ? (
                    <button
                      type="button"
                      onClick={() => void run(() => adminApi.setMainProductImage(productId!, img.id), 'Asosiy rasm o‘zgartirildi.')}
                      disabled={busy}
                      style={MINI}
                    >
                      Asosiy qilish
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void run(() => adminApi.deleteProductImage(productId!, img.id), 'Rasm o‘chirildi.')}
                    disabled={busy}
                    style={{ ...MINI, color: 'var(--alv-danger)' }}
                  >
                    O‘chirish
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ margin: 0, color: 'var(--alv-muted)', fontSize: 14 }}>
          Hali rasm yo‘q. Birinchi yuklangan rasm avtomatik «Asosiy» bo‘ladi.
        </p>
      )}

      <div
        style={{
          display: 'grid',
          gap: 10,
          padding: 14,
          border: '1px dashed var(--alv-line-2)',
          borderRadius: 10,
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          aria-label="Rasm fayli"
          style={{ fontSize: 14 }}
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
          <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
            <span style={{ fontWeight: 600 }}>
              Alt matn (o‘zbekcha) <span style={{ color: 'var(--alv-danger)' }}>*</span>
            </span>
            <input
              value={altUz}
              onChange={(e) => setAltUz(e.target.value)}
              placeholder="Batana moyi, 60 ml shisha"
              style={FIELD}
            />
          </label>
          <label style={{ display: 'grid', gap: 4, fontSize: 13 }}>
            <span style={{ fontWeight: 600 }}>
              Alt matn (ruscha) <span style={{ color: 'var(--alv-danger)' }}>*</span>
            </span>
            <input
              value={altRu}
              onChange={(e) => setAltRu(e.target.value)}
              placeholder="Масло батана, флакон 60 мл"
              style={FIELD}
            />
          </label>
        </div>
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--alv-muted)', lineHeight: 1.55 }}>
          Yuklangach 320/640/1024/1600 o‘lchamlari va WebP hamda AVIF nusxalari
          avtomatik yaratiladi — alohida tayyorlash shart emas.
        </p>
        <button type="button" onClick={() => void upload()} disabled={busy} style={UPLOAD_BTN(busy)}>
          {busy ? 'Yuklanmoqda…' : 'Rasmni yuklash'}
        </button>
      </div>
    </div>
  );
}

const NOTE = (color: string): React.CSSProperties => ({
  padding: '11px 14px',
  borderRadius: 9,
  border: '1px solid var(--alv-line)',
  borderLeft: `3px solid ${color}`,
  background: 'var(--alv-surface)',
  fontSize: 14,
});

const FIELD: React.CSSProperties = {
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

const MINI: React.CSSProperties = {
  padding: '5px 9px',
  borderRadius: 7,
  border: '1px solid var(--alv-line)',
  background: 'var(--alv-surface)',
  color: 'var(--alv-ink)',
  fontSize: 12.5,
  cursor: 'pointer',
};

const UPLOAD_BTN = (busy: boolean): React.CSSProperties => ({
  justifySelf: 'start',
  padding: '9px 18px',
  borderRadius: 10,
  border: 'none',
  background: 'var(--alv-ink)',
  color: '#fff',
  fontWeight: 700,
  fontSize: 14,
  cursor: busy ? 'progress' : 'pointer',
  opacity: busy ? 0.6 : 1,
});
