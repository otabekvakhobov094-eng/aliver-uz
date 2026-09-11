#!/usr/bin/env bash
#
# Birinchi TLS sertifikatini oladi.
#
# Muammo: nginx ishga tushishi uchun sertifikat kerak, sertifikat olish
# uchun esa nginx ishlab turishi kerak. Shuning uchun ikki bosqich:
# avval nginx FAQAT HTTP bilan ko'tariladi, sertifikat olinadi, keyin
# haqiqiy sozlama qo'yiladi.
#
# Ishlatish:  bash deploy/vps/tls-init.sh
set -euo pipefail

cd "$(dirname "$0")/../.."
log() { printf '\n\033[1;35m==>\033[0m %s\n' "$1"; }

test -f .env.production || {
  echo "XATO: .env.production topilmadi." >&2
  echo "  cp deploy/vps/.env.production.example .env.production" >&2
  exit 1
}

set -a; . ./.env.production; set +a
: "${DOMAIN:?DOMAIN .env.production da berilmagan}"
: "${ADMIN_DOMAIN:?ADMIN_DOMAIN berilmagan}"
: "${CERTBOT_EMAIL:?CERTBOT_EMAIL berilmagan}"

COMPOSE="docker compose -f deploy/vps/docker-compose.yml --env-file .env.production"

# ------------------------------ DNS tekshiruvi ------------------------------
# Sertifikat DNS to'g'ri sozlanmagan bo'lsa berilmaydi, Let's Encrypt
# esa muvaffaqiyatsiz urinishlarni CHEKLAYDI (soatiga 5 ta). Shuning
# uchun avval o'zimiz tekshiramiz.
server_ip=$(curl -fsS --max-time 10 https://api.ipify.org || echo '')
for host in "$DOMAIN" "$ADMIN_DOMAIN"; do
  resolved=$(getent hosts "$host" | awk '{print $1}' | head -1 || echo '')
  if [ -z "$resolved" ]; then
    echo "XATO: $host hech qayerga yo'naltirilmagan. DNS A yozuvini qo'shing." >&2
    exit 1
  fi
  if [ -n "$server_ip" ] && [ "$resolved" != "$server_ip" ]; then
    echo "OGOHLANTIRISH: $host -> $resolved, bu server esa $server_ip" >&2
    echo "DNS hali tarqalmagan bo'lishi mumkin. Davom etilsinmi? [y/N]" >&2
    read -r answer
    [ "$answer" = "y" ] || exit 1
  fi
done
log "DNS tekshiruvidan o'tdi"

# --------------------------- Vaqtinchalik nginx ---------------------------
log "Nginx vaqtincha HTTP rejimida ko'tarilmoqda"
$COMPOSE up -d --no-deps nginx 2>/dev/null || true
$COMPOSE stop nginx >/dev/null 2>&1 || true

docker run --rm -d --name aliver-certbot-nginx \
  -p 80:80 \
  -v "$PWD/deploy/vps/nginx/bootstrap:/etc/nginx/conf.d:ro" \
  -v aliver_certbot-www:/var/www/certbot \
  nginx:1.27-alpine >/dev/null

cleanup() { docker rm -f aliver-certbot-nginx >/dev/null 2>&1 || true; }
trap cleanup EXIT

sleep 3

# ------------------------------- Sertifikat -------------------------------
log "Let's Encrypt sertifikati so'ralmoqda"
# Ikkala domen BITTA sertifikatga olinadi — nginx sozlamasi shunga
# moslangan (admin ham `live/$DOMAIN/` dan o'qiydi).
docker run --rm \
  -v aliver_certbot-conf:/etc/letsencrypt \
  -v aliver_certbot-www:/var/www/certbot \
  certbot/certbot:latest certonly \
    --webroot -w /var/www/certbot \
    --email "$CERTBOT_EMAIL" \
    --agree-tos --no-eff-email \
    --non-interactive \
    -d "$DOMAIN" -d "www.$DOMAIN" -d "$ADMIN_DOMAIN"

cleanup
trap - EXIT

# --------------------------- Haqiqiy sozlama ---------------------------
log "Nginx sozlamasiga domenlar qo'yilmoqda"
sed -e "s/ALIVER_ADMIN_DOMAIN/$ADMIN_DOMAIN/g" \
    -e "s/ALIVER_DOMAIN/$DOMAIN/g" \
    deploy/vps/nginx/conf.d/aliver.conf > deploy/vps/nginx/conf.d/.aliver.generated.conf
mv deploy/vps/nginx/conf.d/.aliver.generated.conf deploy/vps/nginx/conf.d/aliver.conf

log "Sertifikat olindi"
echo "Endi ishga tushiring:  bash deploy/vps/deploy.sh"
