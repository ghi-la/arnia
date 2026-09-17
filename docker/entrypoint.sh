#!/bin/sh
# Runs pending DB migrations (guarded by a Postgres advisory lock, see
# src/lib/server/db/migrate.ts) before starting the app server, on every
# container start. Safe for rolling/concurrent restarts.
set -e

echo "[entrypoint] running migrations..."
node_modules/.bin/tsx src/lib/server/db/migrate.ts

echo "[entrypoint] starting: $*"
exec "$@"
