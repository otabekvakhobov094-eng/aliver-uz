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

## Prisma turlari generatsiya qilinmasa

`prisma generate` dvigatelni internetdan yuklab oladi. Ba'zi muhitlarda
bu bloklangan va Prisma o'zining BO'SH o'rindoshini qoldiradi — ichida
`PrismaClient: any` va bitta ham model yo'q. O'shanda typecheck ishlaydi,
lekin HECH NARSANI tekshirmaydi: xato model nomi ham, mavjud bo'lmagan
maydon ham, noto'g'ri enum ham bemalol o'tib ketadi. Deploy aynan shu
sababdan uch marta yiqilgan — xato lokalda emas, Render da topilgan.

Shunday holatda:

```bash
npm run prisma:stub:install
```

Bu sxemadan turlarni generatsiya qilib, o'rindosh o'rniga qo'yadi.
Haqiqiy klient bor bo'lsa skript hech narsa qilmaydi. CI va Render da
`prisma generate` muvaffaqiyatli o'tadi va o'sha yerda haqiqiy turlar
ishlatiladi.

Tekshirish: `npx tsc --noEmit -p apps/api/tsconfig.json` — mavjud
bo'lmagan maydon yozib ko'ring, xato chiqishi kerak. Chiqmasa, stub
o'rnatilmagan.
