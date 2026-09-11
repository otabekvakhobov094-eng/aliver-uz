#!/usr/bin/env sh
set -eu
: "${DATABASE_URL:?DATABASE_URL majburiy}"
: "${1:?Backup faylini ko‘rsating}"
backup_file="$1"
sha256sum -c "$backup_file.sha256"
pg_restore --clean --if-exists --no-owner --no-acl --dbname="$DATABASE_URL" "$backup_file"
