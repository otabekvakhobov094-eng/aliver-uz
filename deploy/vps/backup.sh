#!/usr/bin/env bash
#
# Bazaning zaxira nusxasi.
#
# `--format=custom` ATAYLAB: u siqilgan, `pg_restore` bilan tanlab
# tiklash mumkin va katta bazada ancha tez.
#
# Cron uchun (har kuni 03:00 da):
#   0 3 * * * cd /opt/aliver/app && bash deploy/vps/backup.sh >> /var/log/aliver-backup.log 2>&1
set -euo pipefail

cd "$(dirname "$0")/../.."
set -a; . ./.env.production; set +a

KEEP_DAYS="${BACKUP_KEEP_DAYS:-30}"
stamp=$(date +%F-%H%M)
file="aliver-$stamp.dump"

mkdir -p backups

docker compose -f deploy/vps/docker-compose.yml --env-file .env.production \
  exec -T postgres pg_dump \
    --username "$POSTGRES_USER" \
    --dbname "$POSTGRES_DB" \
    --format=custom \
    --file "/backups/$file"

# Nusxa haqiqatan yozilganini tekshiramiz: bo'sh fayl — nusxa emas.
size=$(stat -c%s "backups/$file" 2>/dev/null || echo 0)
if [ "$size" -lt 1024 ]; then
  echo "XATO: zaxira nusxa juda kichik ($size bayt) — tekshiring" >&2
  exit 1
fi

printf 'Zaxira nusxa: backups/%s (%s)\n' "$file" "$(numfmt --to=iec "$size" 2>/dev/null || echo "$size b")"

# Eskilarini tozalaymiz.
find backups -name 'aliver-*.dump' -mtime "+$KEEP_DAYS" -delete 2>/dev/null || true

cat <<'WARN'

DIQQAT: nusxa shu serverda yotibdi. Server yiqilsa u ham yo'qoladi.
Uni boshqa joyga ko'chiring (S3, boshqa server, ofis kompyuteri):
  rsync -az backups/ user@boshqa-server:/zaxira/aliver/
WARN
