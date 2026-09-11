#!/usr/bin/env bash
#
# Yangi Ubuntu serverini BIR MARTA tayyorlaydi.
#
# Nima qiladi: Docker o'rnatadi, xavfsizlik devorini yoqadi, swap
# yaratadi va zaxira nusxa papkasini tayyorlaydi.
#
# Ishlatish (root sifatida):
#   sudo bash deploy/vps/setup-server.sh
#
# Skript QAYTA ishga tushirilsa xato bermaydi: har bir qadam avval
# bajarilganini tekshiradi.
set -euo pipefail

log() { printf '\n\033[1;35m==>\033[0m %s\n' "$1"; }

if [ "$(id -u)" -ne 0 ]; then
  echo "Bu skript root sifatida ishlatiladi: sudo bash $0" >&2
  exit 1
fi

# ------------------------------- 1. Yangilash -------------------------------
log "Tizim paketlari yangilanmoqda"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq ca-certificates curl gnupg git ufw fail2ban

# -------------------------------- 2. Docker --------------------------------
if command -v docker >/dev/null 2>&1; then
  log "Docker allaqachon o'rnatilgan: $(docker --version)"
else
  log "Docker o'rnatilmoqda"
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io \
    docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
fi

# ------------------------------ 3. Xavfsizlik ------------------------------
log "Xavfsizlik devori sozlanmoqda"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
# PostgreSQL va Redis portlari ATAYLAB ochilmaydi: ular faqat Docker
# ichki tarmog'ida ishlaydi. Ochiq 5432 — eng ko'p buziladigan port.
ufw --force enable
ufw status verbose

log "fail2ban yoqilmoqda (SSH ga parol tanlashdan himoya)"
systemctl enable --now fail2ban

# --------------------------------- 4. Swap ---------------------------------
# Next.js qurilishi xotira talab qiladi. 2 GB RAM li serverda swapsiz
# `npm run build` "Killed" bilan to'xtaydi va sababi ko'rinmaydi.
if swapon --show | grep -q .; then
  log "Swap allaqachon bor"
else
  log "2 GB swap yaratilmoqda"
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# ------------------------------ 5. Papkalar ------------------------------
log "Zaxira nusxa papkasi tayyorlanmoqda"
mkdir -p /opt/aliver/backups
chmod 700 /opt/aliver/backups

# --------------------------- 6. Log aylanishi ---------------------------
# Docker loglari compose faylida ham cheklangan, lekin tizim darajasida
# ham chegara qo'yamiz: to'lgan disk — eng ko'p uchraydigan nosozlik.
if [ ! -f /etc/docker/daemon.json ]; then
  log "Docker log chegarasi qo'yilmoqda"
  cat > /etc/docker/daemon.json <<'JSON'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "20m", "max-file": "5" }
}
JSON
  systemctl restart docker
fi

log "Server tayyor"
cat <<'NEXT'

Keyingi qadamlar:

  1. Repozitoriyni klonlang:
       git clone https://github.com/otabekvakhobov094-eng/aliver-uz /opt/aliver/app
       cd /opt/aliver/app

  2. Sozlamalarni tayyorlang:
       cp deploy/vps/.env.production.example .env.production
       nano .env.production        # domen, parollar, kalitlar

  3. DNS yozuvlarini tekshiring (A yozuvi shu serverga ko'rsatishi kerak):
       dig +short aliver.uz
       dig +short admin.aliver.uz

  4. TLS sertifikatini oling:
       bash deploy/vps/tls-init.sh

  5. Ishga tushiring:
       bash deploy/vps/deploy.sh

To'liq yo'riqnoma: docs/VPS.md
NEXT
