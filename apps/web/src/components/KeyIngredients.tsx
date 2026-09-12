import type { Locale } from '@/i18n/messages';

/**
 * Tarkib ma'lumotining uch qatlami — TZ-3, 2.3.
 *
 * Baymard tadqiqoti go'zallik sohasida aniq ko'rsatgan: mijoz INCI
 * ro'yxatini **baholay olmaydi** va shu sababdan sotib olishdan voz
 * kechadi. Ular tavsiya qiladigan naqsh aynan shu — tarkibni vazifasi
 * bilan yozish: «Pantenol (teri to'sig'ini mustahkamlaydi)».
 *
 * Uch qatlam:
 *   1. Uchta asosiy tarkib, har biri oddiy tilda vazifasi bilan
 *   2. Isbot yoki tadqiqot natijasi
 *   3. To'liq INCI — ALOHIDA yig'iladigan blokda
 *
 * Tartib ahamiyatli: to'liq ro'yxat birinchi kelsa, u qolgan ikkitasini
 * ko'mib yuboradi va mijoz yana INCI bilan yolg'iz qoladi.
 */

export interface KeyIngredient {
  nameUz?: string;
  nameRu?: string;
  roleUz?: string;
  roleRu?: string;
}

interface Props {
  locale: Locale;
  keyIngredients: unknown;
  claim: string | null;
  fullList: string | null;
}

/** API dan kelgan JSON ishonchsiz — shakli tekshiriladi. */
function parse(raw: unknown): KeyIngredient[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is KeyIngredient => Boolean(x) && typeof x === 'object')
    .filter((x) => (x.nameUz ?? x.nameRu ?? '').trim() !== '')
    // Uchtadan ortig'i ro'yxatga aylanadi va "asosiy" ma'nosini
    // yo'qotadi — shuning uchun cheklov shu yerda.
    .slice(0, 3);
}

export function KeyIngredients({ locale, keyIngredients, claim, fullList }: Props) {
  const ru = locale === 'ru';
  const items = parse(keyIngredients);

  // Uchala qatlam ham bo'sh bo'lsa — hech narsa chizilmaydi, bo'sh
  // sarlavha qoldirilmaydi.
  if (items.length === 0 && !claim && !fullList) return null;

  return (
    <section style={{ marginTop: 48 }}>
      <h2 className="alv-h2" style={{ marginBottom: 18 }}>
        {ru ? 'Что внутри' : 'Tarkibida nima bor'}
      </h2>

      {items.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: 14,
          }}
        >
          {items.map((it, i) => {
            const name = (ru ? it.nameRu : it.nameUz) ?? it.nameUz ?? it.nameRu ?? '';
            const role = (ru ? it.roleRu : it.roleUz) ?? it.roleUz ?? it.roleRu ?? '';
            return (
              <div key={`${name}-${i}`} className="alv-card" style={{ padding: 20 }}>
                <strong style={{ fontSize: 16, display: 'block' }}>{name}</strong>
                {role ? (
                  <p
                    style={{
                      margin: '6px 0 0',
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: 'var(--alv-ink-2)',
                    }}
                  >
                    {role}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {claim ? (
        <p
          style={{
            margin: '18px 0 0',
            padding: '14px 18px',
            borderLeft: '3px solid var(--alv-mint)',
            background: 'var(--alv-mint-soft)',
            color: 'var(--alv-ink)',
            fontSize: 15,
            lineHeight: 1.6,
          }}
        >
          {claim}
        </p>
      ) : null}

      {fullList ? (
        <details className="alv-card" style={{ marginTop: 16, padding: '16px 20px' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 14.5 }}>
            {ru ? 'Полный состав (INCI)' : 'To‘liq tarkib (INCI)'}
          </summary>
          <p
            style={{
              margin: '12px 0 0',
              fontSize: 13.5,
              lineHeight: 1.75,
              color: 'var(--alv-ink-2)',
              overflowWrap: 'break-word',
            }}
          >
            {fullList}
          </p>
        </details>
      ) : null}
    </section>
  );
}
