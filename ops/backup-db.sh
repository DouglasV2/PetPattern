#!/usr/bin/env bash
# Back up the PetPattern Postgres database to ./backups/ (gzipped, timestamped).
# The whole product value is the longitudinal record — run this on a schedule.
#
# Cron example (daily 03:00, log to a file):
#   0 3 * * *  cd /opt/petpattern && ops/backup-db.sh >> /var/log/petpattern-backup.log 2>&1
#
# Env overrides: DB_CONTAINER, POSTGRES_DB, POSTGRES_USER, BACKUP_DIR, BACKUP_KEEP
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# Load .env if present so POSTGRES_* match the running stack.
[ -f "$ROOT/.env" ] && set -a && . "$ROOT/.env" && set +a

OUT="${BACKUP_DIR:-$ROOT/backups}"
CONTAINER="${DB_CONTAINER:-petpattern-postgres}"
DB="${POSTGRES_DB:-petpattern}"
USER="${POSTGRES_USER:-petpattern}"
KEEP="${BACKUP_KEEP:-14}"

mkdir -p "$OUT"
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$OUT/petpattern-$STAMP.sql.gz"

# --clean --if-exists so a restore into an existing (Flyway-created) DB overwrites
# cleanly instead of erroring on every "already exists".
docker exec "$CONTAINER" pg_dump --clean --if-exists -U "$USER" -d "$DB" | gzip > "$FILE"
echo "$(date -Is) backup written: $FILE ($(du -h "$FILE" | cut -f1))"

# Retention: keep the newest $KEEP, delete older.
ls -1t "$OUT"/petpattern-*.sql.gz 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f
