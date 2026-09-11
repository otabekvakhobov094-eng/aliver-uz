#!/usr/bin/env bash
#
# Zaxira nusxadan tiklash.
#
# BU AMAL QAYTARILMAYDI: joriy ma'lumotlar o'chiriladi. Shuning uchun
# skript tasdiq so'raydi va avval joriy holatdan nusxa oladi.
#
# Ishlatish:  bash deploy/vps/restore.sh backups/aliver-2026-09-11-0300.dump
set -euo pipefail

cd "$(dirname "$0")/../.."
set -a; . ./.env.production; set +a

file="${1:-}"
[ -n "$file" ] || { echo "Ishlatish: bash $0 <nusxa-fayli>" >&2; ls -1 backups/*.dump 2>/dev/null | tail -5; exit 1; }
[ -f "$file" ] || { echo "XATO: $file topilmadi" >&2; exit 1; }

COMPOSE="docker compose -f deploy/vps/docker-compose.yml --env-file .env.production"

echo "Tiklanadigan fayl: $file"
echo "JORIY MA'LUMOTLAR O'CHIRILADI. Davom etilsinmi? 'ha' deb yozing:"
read -r answer
[ "$answer" = "ha" ] || { echo "Bekor qilindi"; exit 1; }

echo "==> Ilovalar to'xtatilmoqda (yozuv davom etmasligi uchun)"
$COMPOSE stop api web admin

echo "==> Joriy holatdan ehtiyot nusxa"
bash deploy/vps/backup.sh || echo "(ehtiyot nusxa olinmadi — davom etamiz)"

echo "==> Tiklanmoqda"
$COMPOSE exec -T postgres pg_restore \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --clean --if-exists --no-owner \
  "/backups/$(basename "$file")"

echo "==> Ilovalar qayta ishga tushirilmoqda"
$COMPOSE up -d

cat <<'AFTER'

Tiklandi. Endi TEKSHIRING:

  1. Nusxa olingandan KEYIN kelgan buyurtmalar yo'qoldi. Provayder
     kabinetidagi to'lovlarni admin paneldagi "Moslashtirish" bo'limi
     bilan solishtiring.
  2. Fiskal cheklar navbatini ko'ring.
AFTER
