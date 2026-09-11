import Link from 'next/link';
import { Badge, Price, Rating } from '@aliver/ui';
import type { Badge as BadgeKind, ProductCard as Card } from '@/lib/catalog-api';
import { pick } from '@/lib/catalog-api';
import type { Locale } from '@/i18n/messages';

/**
 * Mahsulot kartochkasi — TZ-3, 2.2.
 *
 * Bu element sayt bo'ylab minglab marta chiziladi, shuning uchun unga
 * alohida vaqt ajratish o'zini oqlaydi. Uchta narsa qo'shildi va
 * har biri bosishga sabab beradi:
 *
 *   — bir qatorli izoh: "bu nima" degan savolga kartochkaning o'zida
 *     javob beradi, aks holda mijoz bilish uchun bosishi kerak;
 *   — variant soni ("16 ta soya"): kosmetikada tanlov kengligi sotadi,
 *     ko'pchilik katalog uni mahsulot sahifasiga yashiradi;
 *   — ombor holati: O'zbekistonda "bormi-yo'qmi" eng keskin savol.
 *
 * Hover'da rasm ikkinchisiga almashadi — bu bezak emas, ko'proq
 * mahsulot ma'lumotini ochadi.
 */

const BADGE_LABEL: Record<
  BadgeKind,
  { uz: string; ru: string; tone: 'sale' | 'new' | 'top' | 'low' }
> = {
  SALE: { uz: 'Sale', ru: 'Скидка', tone: 'sale' },
  NEW: { uz: 'Yangi', ru: 'Новинка', tone: 'new' },
  TOP: { uz: 'Top', ru: 'Хит', tone: 'top' },
  LOW_STOCK: { uz: 'Oz qoldi', ru: 'Мало', tone: 'low' },
};

/** Ombor holati matni. Aniq son ko'rsatiladi — "bor" dan ishonarliroq. */
function stockLine(available: number, ru: boolean): { text: string; tone: string } | null {
  if (available <= 0) return { text: ru ? 'Нет в наличии' : 'Tugagan', tone: 'var(--alv-muted)' };
  if (available <= 5) {
    return {
      text: ru ? `Осталось ${available} шт.` : `${available} dona qoldi`,
      tone: 'var(--alv-warn)',
    };
  }
  return {
    text: ru ? `${available} шт. в наличии` : `${available} dona bor`,
    tone: 'var(--alv-mint)',
  };
}

export function ProductCardView({ product, locale }: { product: Card; locale: Locale }) {
  const ru = locale === 'ru';
  const name = pick(product as unknown as Record<string, unknown>, 'name', locale);
  const alt = (ru ? product.imageAltRu : product.imageAltUz) ?? name;
  const short = ru ? product.shortRu : product.shortUz;
  const stock = stockLine(product.availableStock, ru);

  return (
    <Link href={`/${locale}/mahsulot/${product.slug}`} className="alv-pcard">
      <div className="alv-pcard__media">
        {product.imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={product.imageUrl} alt={alt} loading="lazy" />
            {product.imageHoverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.imageHoverUrl}
                alt=""
                aria-hidden
                loading="lazy"
                className="alv-pcard__hover"
              />
            ) : null}
          </>
        ) : (
          <PlaceholderArt seed={product.slug} />
        )}
        <div className="alv-pcard__badges">
          {product.badges.map((b) => (
            <Badge key={b} tone={BADGE_LABEL[b].tone}>
              {ru ? BADGE_LABEL[b].ru : BADGE_LABEL[b].uz}
            </Badge>
          ))}
        </div>
      </div>

      <div className="alv-pcard__body">
        <Rating value={product.ratingAvg} count={product.ratingCount} size={13} />
        <div className="alv-pcard__name">{name}</div>

        {short ? <div className="alv-pcard__short">{short}</div> : null}

        {/* Bittadan ortiq variant bo'lsagina ko'rsatiladi: "1 ta variant"
            hech qanday ma'lumot bermaydi. */}
        {product.variantsCount > 1 ? (
          <div className="alv-pcard__variants">
            {ru ? `${product.variantsCount} варианта` : `${product.variantsCount} ta variant`}
          </div>
        ) : null}

        <div className="alv-pcard__foot">
          <Price
            value={product.price}
            oldValue={product.oldPrice}
            size="sm"
            locale={ru ? 'RU' : 'UZ'}
          />
          {stock ? (
            <div className="alv-pcard__stock" style={{ color: stock.tone }}>
              <span className="alv-pcard__dot" style={{ background: stock.tone }} aria-hidden />
              {stock.text}
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

/**
 * Rasm hali yuklanmagan mahsulot uchun o'rinbosar.
 * Kulrang kvadrat o'rniga brend ranglaridagi shakl — katalog bo'sh ko'rinmaydi.
 */
function PlaceholderArt({ seed }: { seed: string }) {
  const hues = ['#FFE3EE', '#FFF0DC', '#EDE6FF', '#DFF6EE', '#EAF2FF', '#FFEFE6'];
  const inks = ['#D42A64', '#8F5F00', '#7A3DF5', '#0B7A5C', '#3D6BF5', '#E8622A'];
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) % 997;
  const bg = hues[h % hues.length]!;
  const ink = inks[h % inks.length]!;

  return (
    <svg
      viewBox="0 0 240 240"
      width="100%"
      height="100%"
      role="img"
      aria-label="Rasm hali qo‘shilmagan"
    >
      <rect width="240" height="240" fill={bg} />
      <rect x="86" y="78" width="68" height="130" rx="16" fill={ink} />
      <rect x="86" y="140" width="68" height="24" fill="rgba(255,255,255,.85)" />
      <rect x="104" y="46" width="32" height="34" rx="8" fill="#1B1220" />
      <rect x="98" y="40" width="44" height="12" rx="6" fill="#1B1220" />
    </svg>
  );
}
