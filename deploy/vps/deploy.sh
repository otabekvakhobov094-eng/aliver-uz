#!/usr/bin/env bash
#
# Production relizi.
#
# Tartib O'ZGARMAYDI va har bir qadam oldingisiga tayanadi:
#   1. zaxira nusxa   2. qurish   3. migratsiya   4. ishga tushirish
#   5. sog'liq tekshiruvi
#
# Nosozlikda skript to'xtaydi va loglarni ko'rsatadi. Migratsiya
# BAJARILGANDAN keyin avtomatik orqaga qaytarish YO'Q — sababi
# docs/VPS.md da tushuntirilgan.
set -euo pipefail

cd "$(dirname "$0")/../.."
log() { printf '\n\033[1;35m==>\033[0m %s\n' "$1"; }

test -f .env.production || { echo "XATO: .env.production topilmadi" >&2; exit 1; }
set -a; . ./.env.production; set +a
: "${DOMAIN:?DOMAIN berilmagan}"

COMPOSE="docker compose -f deploy/vps/docker-compose.yml --env-file .env.production"

# ------------------------------ 1. Zaxira nusxa ------------------------------
# Migratsiyadan OLDIN. `DROP COLUMN` ma'lumotni o'chiradi va uni faqat
# nusxadan tiklash mumkin.
if $COMPOSE ps --status running postgres 2>/dev/null | grep -q postgres; then
  log "Zaxira nusxa olinmoqda"
  bash deploy/vps/backup.sh
else
  log "Baza hali ishlamayapti — birinchi ishga tushirish, nusxa olinmaydi"
fi

# -------------------------------- 2. Qurish --------------------------------
log "Tasvirlar qurilmoqda"
$COMPOSE build --pull

# ------------------------------ 3. Baza va kesh ------------------------------
log "Baza va kesh ko'tarilmoqda"
$COMPOSE up -d postgres redis
$COMPOSE exec -T postgres sh -c 'until pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"; do sleep 2; done'

# ------------------------------- 4. Migratsiya -------------------------------
log "Migratsiyalar qo'llanmoqda"
$COMPOSE run --rm --no-deps api \
  ./node_modules/.bin/prisma migrate deploy --schema apps/api/prisma/schema.prisma

log "Boshlang'ich ma'lumotlar (idempotent)"
$COMPOSE run --rm --no-deps api npm run -w @aliver/api prisma:seed

# ---------------------------- 5. Ishga tushirish ----------------------------
log "Ilovalar ishga tushirilmoqda"
$COMPOSE up -d --remove-orphans

# --------------------------- 6. Sog'liq tekshiruvi ---------------------------
log "Sog'liq tekshirilmoqda"
ok=0
for _ in $(seq 1 40); do
  # `ready` — bog'liqliklarni ham tekshiradi; nosozlikda 503 qaytaradi.
  if curl -fsS --max-time 5 "https://$DOMAIN/api/health/ready" >/dev/null 2>&1; then
    ok=1
    break
  fi
  sleep 3
done

if [ "$ok" -ne 1 ]; then
  echo >&2
  echo "XATO: API sog'liq tekshiruvidan o'tmadi." >&2
  echo "Oxirgi loglar:" >&2
  $COMPOSE logs --tail=100 api nginx >&2
  exit 1
fi

log "Reliz muvaffaqiyatli"
printf '  Do‘kon:  https://%s\n  Admin:   https://%s\n' "$DOMAIN" "${ADMIN_DOMAIN:-admin.$DOMAIN}"
echo
echo "Endi qo'lda tekshiring (docs/VPS.md, 'Tutun testi' bo'limi)."
