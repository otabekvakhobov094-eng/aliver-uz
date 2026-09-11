# Ishlash tartibi

## Branchlar

- `main` — production. Faqat `develop` dan PR orqali.
- `develop` — staging. Barcha feature branchlar shu yerga tushadi.
- `feat/<etap>-<qisqa-nom>` — masalan `feat/2-product-crud`.
- `fix/<qisqa-nom>`, `chore/<qisqa-nom>`.

Productionga to'g'ridan-to'g'ri push qilinmaydi (TZ 114).

## Commit xabari

```
<tur>(<qamrov>): <nima qilindi>

feat(catalog): mahsulot variantlari CRUD
fix(auth): OTP sutkalik limiti noto'g'ri hisoblanardi
```

Turlar: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`.

## Kod yozishdan oldin

1. Qaysi etap va TZ bo'limiga tegishli ekanini aniqlang.
2. Pul, ombor yoki buyurtma bilan ishlasangiz — README dagi «Loyihaning asosiy
   qoidalari» bo'limini qayta o'qing. Bu qoidalar muhokama qilinmaydi.
3. Yangi endpoint — huquq (`@RequirePermissions`) va kerak bo'lsa `@Audit` bilan.

## PR yopilishidan oldin

- `npm run typecheck && npm run test && npm run lint` — hammasi yashil.
- Migratsiya bo'lsa: lokal bazada `migrate dev` va `migrate reset` sinaldi.
- PR shablonidagi tekshiruv ro'yxati to'ldirildi.
