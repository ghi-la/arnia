#!/bin/sh
# Restores a backup produced by scripts/backup.sh.
#
# Usage (from the host, with the stack running):
#   docker compose exec backup /scripts/restore.sh 20260101T000000Z
#
# This OVERWRITES the current database and uploads. Stop the app/worker
# first if you want to avoid writes racing the restore:
#   docker compose stop app worker
set -eu

TIMESTAMP="${1:-}"
if [ -z "$TIMESTAMP" ]; then
	echo "Usage: restore.sh <timestamp>  (see /backups for available timestamps)"
	ls -1 /backups | sed -n 's/^db_\(.*\)\.dump$/  \1/p'
	exit 1
fi

DUMP="/backups/db_${TIMESTAMP}.dump"
UPLOADS_ARCHIVE="/backups/uploads_${TIMESTAMP}.tar.gz"

if [ ! -f "$DUMP" ]; then
	echo "No such backup: $DUMP"
	exit 1
fi

echo "[restore] restoring database from ${DUMP}"
pg_restore --clean --if-exists --no-owner --dbname="${PGDATABASE:-arnia}" "$DUMP"

if [ -f "$UPLOADS_ARCHIVE" ]; then
	echo "[restore] restoring uploads from ${UPLOADS_ARCHIVE}"
	rm -rf /app/uploads/*
	tar -C /app/uploads -xzf "$UPLOADS_ARCHIVE"
else
	echo "[restore] no uploads archive found for ${TIMESTAMP}, skipping"
fi

echo "[restore] done. Restart the app and worker: docker compose up -d app worker"
