#!/bin/sh
# Scheduled backup: runs in the `backup` service (see docker-compose.yml).
# Every $BACKUP_INTERVAL_HOURS, dumps the database and archives the uploads
# volume into /backups, then deletes backups older than $BACKUP_RETENTION_DAYS.
set -eu

INTERVAL_HOURS="${BACKUP_INTERVAL_HOURS:-24}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

run_backup() {
	timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
	echo "[backup] starting backup ${timestamp}"

	pg_dump --format=custom --file="/backups/db_${timestamp}.dump"
	tar -C /app/uploads -czf "/backups/uploads_${timestamp}.tar.gz" .

	echo "[backup] done: db_${timestamp}.dump, uploads_${timestamp}.tar.gz"

	echo "[backup] pruning backups older than ${RETENTION_DAYS} days"
	find /backups -maxdepth 1 -type f -mtime "+${RETENTION_DAYS}" -delete
}

echo "[backup] service started (every ${INTERVAL_HOURS}h, keeping ${RETENTION_DAYS} days)"

while true; do
	run_backup || echo "[backup] backup run failed, will retry next interval"
	sleep "$((INTERVAL_HOURS * 3600))"
done
