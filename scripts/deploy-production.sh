#!/usr/bin/env sh
set -eu
project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$project_dir"
test -f .env.production
./scripts/backup-postgres.sh
docker compose -f infra/docker-compose.prod.yml build --pull
docker compose -f infra/docker-compose.prod.yml run --rm api ./node_modules/.bin/prisma migrate deploy --schema apps/api/prisma/schema.prisma
docker compose -f infra/docker-compose.prod.yml up -d --remove-orphans
for i in $(seq 1 30); do wget -qO- http://localhost/api/health >/dev/null && echo "Production reliz muvaffaqiyatli" && exit 0; sleep 2; done
docker compose -f infra/docker-compose.prod.yml logs --tail=200
exit 1
