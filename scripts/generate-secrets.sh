#!/usr/bin/env bash
# Generates strong random secrets for a new Arnia instance and writes them
# into .env (creating it from .env.example if it doesn't exist yet).
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
	echo "No .env found — creating one from .env.example"
	cp .env.example .env
fi

random_base64() {
	openssl rand -base64 "$1" | tr -d '\n'
}

random_hex() {
	openssl rand -hex "$1" | tr -d '\n'
}

set_env_var() {
	local key="$1"
	local value="$2"
	if grep -q "^${key}=" .env; then
		# Escape & and / for sed replacement safety.
		local escaped
		escaped=$(printf '%s' "$value" | sed -e 's/[\/&]/\\&/g')
		sed -i.bak "s/^${key}=.*/${key}=${escaped}/" .env
		rm -f .env.bak
	else
		echo "${key}=${value}" >> .env
	fi
}

get_env_var() {
	grep "^${1}=" .env | head -n1 | cut -d'=' -f2-
}

echo "Generating secrets..."

DB_PASSWORD="$(random_hex 24)"
set_env_var "POSTGRES_PASSWORD" "$DB_PASSWORD"
set_env_var "BETTER_AUTH_SECRET" "$(random_base64 32)"
set_env_var "APP_ENCRYPTION_KEY" "$(random_base64 32)"

DB_USER="$(get_env_var POSTGRES_USER)"
DB_NAME="$(get_env_var POSTGRES_DB)"
set_env_var "DATABASE_URL" "postgres://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}"

echo "Done. Review .env and fill in APP_DOMAIN, email provider and any other settings."
