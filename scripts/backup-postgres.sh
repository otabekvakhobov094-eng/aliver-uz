#!/usr/bin/env sh
set -eu
: "${DATABASE_URL:?DATABASE_URL majburiy}"
backup_dir="${BACKUP_DIR:-./backups}"
mkdir -p "$backup_dir"
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
target="$backup_dir/aliver-$timestamp.dump"
pg_dump --format=custom --no-owner --no-acl --file="$target" "$DATABASE_URL"
sha256sum "$target" > "$target.sha256"
echo "$target"
