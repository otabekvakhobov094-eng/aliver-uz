# VPS serverga o'rnatish

Bu yo'riqnoma **noldan** ishlaydigan saytgacha olib boradi. Har bir
qadamda nima kutilishi yozilgan, shuning uchun biror joyda to'xtasangiz
sababini topish oson bo'ladi.

Buyruqlarni yoddan bajarmang — izohlarda "nega shunday" yozilgan.

---

## 0. Nima kerak

| Nima | Minimal | Tavsiya | Nega |
|---|---|---|---|
| RAM | 2 GB | **4 GB** | Next.js qurilishi xotira talab qiladi |
| Disk | 20 GB | 40 GB | Baza, rasmlar, zaxira nusxalar, Docker tasvirlari |
| CPU | 2 yadro | 2 yadro | |
| OS | Ubuntu 22.04 / 24.04 | | Skriptlar shunga mo'ljallangan |
| Domen | `aliver.uz` | | DNS boshqaruvi sizda bo'lishi kerak |

> **2 GB RAM da ham ishlaydi**, lekin `setup-server.sh` swap yaratadi —
> usiz `npm run build` "Killed" deb to'xtaydi va sababi ko'rinmaydi.

---

## 1. DNS

Domen provayderingizda **A yozuvlari**ni qo'shing — serveringiz IP siga:

| Yozuv | Turi | Qiymat |
|---|---|---|
| `aliver.uz` | A | `SERVER_IP` |
| `www.aliver.uz` | A | `SERVER_IP` |
| `admin.aliver.uz` | A | `SERVER_IP` |

Tekshirish (tarqalishi 5 daqiqadan bir necha soatgacha):

```bash
dig +short aliver.uz
dig +short admin.aliver.uz
```

> DNS tayyor bo'lmaguncha 4-qadamga o'tmang. Let's Encrypt
> muvaffaqiyatsiz urinishlarni **cheklaydi** (soatiga 5 ta), shuning
> uchun erta urinish sizni bir soatga kutib qo'yishi mumkin.

---

## 2. Serverni tayyorlash

```bash
ssh root@SERVER_IP

git clone https://github.com/otabekvakhobov094-eng/aliver-uz /opt/aliver/app
cd /opt/aliver/app

sudo bash deploy/vps/setup-server.sh
```

Skript: Docker o'rnatadi, xavfsizlik devorini yoqadi (faqat SSH, 80 va
443), `fail2ban` ni ishga tushiradi, 2 GB swap yaratadi va Docker
loglariga chegara qo'yadi.

**PostgreSQL va Redis portlari ataylab ochilmaydi.** Ular faqat Docker
ichki tarmog'ida ishlaydi — ochiq `5432` eng ko'p buziladigan port.

Skriptni qayta ishga tushirish xavfsiz: har bir qadam avval
bajarilganini tekshiradi.

---

## 3. Sozlamalar

```bash
cp deploy/vps/.env.production.example .env.production
nano .env.production
```

**Majburiy** to'ldiriladigan qatorlar:

```bash
DOMAIN=aliver.uz
ADMIN_DOMAIN=admin.aliver.uz
CERTBOT_EMAIL=admin@aliver.uz

# Kuchli parol va kalitlar hosil qiling:
#   openssl rand -base64 32   -> POSTGRES_PASSWORD
#   openssl rand -base64 48   -> JWT_ACCESS_SECRET
#   openssl rand -base64 48   -> JWT_REFRESH_SECRET
```

> `.env.production` repozitoriyga **qo'shilmaydi**. Undan nusxa parol
> menejerida saqlansin: server yiqilsa, tiklash uchun aynan shu fayl
> kerak bo'ladi.

### To'lov, chek va SMS kalitlari

Bular **hali yo'q** bo'lsa, sayt production rejimida **ishga
tushmaydi** — bu ataylab shunday:

| O'zgaruvchi | Nega majburiy |
|---|---|
| `PAYMENTS_MODE=live` | `mock` rejimida webhook imzosi tekshirilmaydi va "to'landi" tugmasi ochiq turadi |
| `OFD_PROVIDER=soliq` | Fiskal cheksiz savdo — qonunbuzarlik |
| `SMS_PROVIDER=eskiz` | `console` rejimida mijoz OTP kodini olmaydi |

Kalitlar hali kelmagan bo'lsa, avval **staging** sifatida ko'taring:
`APP_ENV=staging` qo'ying va sandbox kalitlarini kiriting. Bunda sayt
ishlaydi, lekin haqiqiy pul harakatlanmaydi.

---

## 4. TLS sertifikati

```bash
bash deploy/vps/tls-init.sh
```

Skript avval DNS ni tekshiradi, keyin vaqtincha nginx ni HTTP rejimida
ko'taradi va Let's Encrypt sertifikatini oladi.

**Nega ikki bosqich:** nginx ishga tushishi uchun sertifikat kerak,
sertifikat olish uchun esa nginx ishlab turishi kerak. Shuning uchun
avval faqat HTTP bilan ko'tariladi.

Uchala domen **bitta sertifikatga** olinadi. Yangilanish avtomatik:
`certbot` konteyneri har 12 soatda tekshiradi, nginx esa har 12 soatda
sozlamani qayta o'qiydi.

---

## 5. Ishga tushirish

```bash
bash deploy/vps/deploy.sh
```

Tartib **o'zgarmaydi**:

1. **Zaxira nusxa** — migratsiyadan oldin (birinchi marta o'tkaziladi).
2. **Qurish** — uch tasvir.
3. **Baza va kesh** — tayyor bo'lguncha kutiladi.
4. **Migratsiya** va boshlang'ich ma'lumotlar (takrorlanmaydi).
5. **Ilovalar**.
6. **Sog'liq tekshiruvi** — `/api/health/ready` javob bermasa, skript
   xato bilan to'xtaydi va loglarni ko'rsatadi.

Birinchi qurilish 5–15 daqiqa oladi.

---

## 6. Tutun testi (qo'lda)

Avtomatik testlar kodni tekshiradi; bu yerda **haqiqiy integratsiyalar**
sinaladi. Har bir bandni o'zingiz bajaring.

| № | Amal | Kutilgan natija |
|---|---|---|
| 1 | `https://aliver.uz` | Bosh sahifa, hero surati |
| 2 | Katalog, mahsulot sahifasi | Narx va qoldiq ko'rinadi |
| 3 | Savatga qo'shish | Miqdor yangilanadi |
| 4 | Checkout, Click bilan | Provayder sahifasiga o'tadi |
| 5 | Sinov kartasi bilan to'lash | Buyurtma `PAID` bo'ladi |
| 6 | **Fiskal chek** | Admin panelda `SENT`, havola ochiladi |
| 7 | SMS | Mijozga xabar keladi |
| 8 | `https://admin.aliver.uz` | **Login ishlaydi** |
| 9 | Noto'g'ri parol | "Email yoki parol noto'g'ri" deb yozadi |
| 10 | Telefonda bosh sahifa | Matn kesilmaydi |
| 11 | `https://aliver.uz/robots.txt` | Indekslashga ruxsat bor |
| 12 | Cookie banneri | "Faqat zaruriy" da piksel yuklanmaydi |

**5 va 6-band eng muhimi.** Pul o'tgan, lekin chek berilmagan holat —
soliq muammosi. Topilsa relizni orqaga qaytaring.

---

## 7. Zaxira nusxa

```bash
bash deploy/vps/backup.sh
```

Har kuni avtomatik olish uchun:

```bash
crontab -e
```

```cron
0 3 * * * cd /opt/aliver/app && bash deploy/vps/backup.sh >> /var/log/aliver-backup.log 2>&1
```

> **Nusxa shu serverda yotadi.** Server yiqilsa u ham yo'qoladi.
> Uni boshqa joyga ko'chiring:
> ```bash
> rsync -az backups/ user@boshqa-server:/zaxira/aliver/
> ```

**Tiklashni oyiga bir marta sinab ko'ring.** Sinalmagan zaxira nusxa —
nusxa emas: u faqat tiklash kunida ishlamasligini bilib olish uchun
saqlanadi.

Tiklash:

```bash
bash deploy/vps/restore.sh backups/aliver-2026-09-11-0300.dump
```

---

## 8. Yangilanish

```bash
cd /opt/aliver/app
git pull
bash deploy/vps/deploy.sh
```

### Orqaga qaytarish

Qaror **10 daqiqada** qabul qilinadi. Uzoq "tuzatib ko'ramiz" —
mijozlar xato ko'rib turgan vaqt.

**Migratsiyasiz** (oddiy holat):

```bash
git checkout <oldingi-commit>
bash deploy/vps/deploy.sh
```

**Migratsiyadan keyin** — avtomatik qaytarish **yo'q**:

1. Saytni texnik ishlar rejimiga o'tkazing.
2. `bash deploy/vps/restore.sh backups/<oxirgi>.dump`
3. Eski kodga qayting va qayta deploy qiling.
4. Nusxa olingandan **keyin** kelgan to'lovlarni tekshiring — ular
   provayder kabinetida qoladi. Admin paneldagi "Moslashtirish" bo'limi
   aynan shuning uchun kerak.

> Shuning uchun migratsiyalar **qo'shuvchi** bo'lishi kerak: yangi
> ustun `NULL` bilan qo'shiladi, eskisi bir reliz saqlanadi va faqat
> keyingisida o'chiriladi. Shunda orqaga qaytarish baza tiklashsiz
> ishlaydi.

---

## 9. Kuzatuv

```bash
# Loglar
docker compose -f deploy/vps/docker-compose.yml logs -f api

# Holat
docker compose -f deploy/vps/docker-compose.yml ps

# Biznes ko'rsatkichlari (huquq talab qiladi)
curl -s https://aliver.uz/api/health/metrics -H "Authorization: Bearer $TOKEN" | jq
```

Reliz kuni birinchi ikki soat davomida har 15 daqiqada `metrics` ni
ko'ring. Eng ko'p uchraydigan nosozliklar:

| Ko'rsatkich | Odatda nimani bildiradi |
|---|---|
| `fiscalFailed` | OFD tokeni noto'g'ri yoki terminal faol emas |
| `notificationsStuck` | SMS shabloni tasdiqlanmagan (eSKIZ shablonni oldindan tasdiqlaydi) |
| `webhooksInFlight` | Provayder webhook manzilini ko'ra olmayapti |
| `paidButExpired` | Rezerv muddati to'lov oynasidan qisqa |

---

## 10. Xavfsizlik

Ishga tushirgandan keyin:

- [ ] `SEED_SUPERADMIN_PASSWORD` bilan kiring va parolni **darhol**
      o'zgartiring.
- [ ] Admin panelni IP bo'yicha cheklang —
      `deploy/vps/nginx/conf.d/aliver.conf` dagi `allow` qatorlarini
      oching.
- [ ] SSH ga parol bilan kirishni o'chiring (faqat kalit).
- [ ] HSTS ni yoqing — lekin **faqat** sayt to'liq ishlaganiga ishonch
      hosil qilgandan keyin. Xato qo'yilsa, muddat tugaguncha orqaga
      qaytarib bo'lmaydi. Nginx sozlamasida izohdan chiqaring.

---

## Tez-tez uchraydigan muammolar

**`deploy.sh` sog'liq tekshiruvida to'xtadi**

```bash
docker compose -f deploy/vps/docker-compose.yml logs --tail=100 api
```

Odatiy sabablar: `.env.production` da majburiy kalit yo'q (ilova
sababini aytib to'xtaydi), yoki baza hali ko'tarilmagan.

**Sertifikat olinmadi**

DNS hali tarqalmagan. `dig +short aliver.uz` serveringiz IP sini
qaytarishi kerak. Let's Encrypt cheklovi ishga tushgan bo'lsa, bir soat
kuting.

**Admin panelga kirib bo'lmayapti**

`.env.production` da `COOKIE_DOMAIN` **bo'sh** bo'lishi kerak. Unga
qiymat qo'yilsa (masalan `.aliver.uz`), brauzer cookie'ni rad etishi
mumkin va login jimgina ishlamay qoladi.

**Qurilish "Killed" bilan to'xtadi**

Xotira yetmadi. `free -h` bilan swap borligini tekshiring;
`setup-server.sh` uni yaratishi kerak edi.

**Disk to'ldi**

```bash
docker system prune -af --volumes   # DIQQAT: ishlatilmayotgan volume ham o'chadi
du -sh backups/                     # eski nusxalar
```
