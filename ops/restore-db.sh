#!/usr/bin/env bash
# Restore a PetPattern backup created by backup-db.sh.
#   ops/restore-db.sh backups/petpattern-YYYYmmdd-HHMMSS.sql.gz
# WARNING: this overwrites the current database contents.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
[ -f "$ROOT/.env" ] && set -a && . "$ROOT/.env" && set +a

FILE="${1:?usage: restore-db.sh <backup.sql.gz>}"
CONTAINER="${DB_CONTAINER:-petpattern-postgres}"
DB="${POSTGRES_DB:-petpattern}"
USER="${POSTGRES_USER:-petpattern}"

[ -f "$FILE" ] || { echo "no such file: $FILE" >&2; exit 1; }
echo "About to OVERWRITE database '$DB' with $FILE — Ctrl-C to abort."
sleep 4
# ON_ERROR_STOP + single transaction: a bad restore aborts loudly and rolls back,
# instead of silently skipping failed statements and reporting success.
gunzip -c "$FILE" | docker exec -i "$CONTAINER" psql -v ON_ERROR_STOP=1 --single-transaction -U "$USER" -d "$DB"
echo "$(date -Is) restore complete from $FILE"
