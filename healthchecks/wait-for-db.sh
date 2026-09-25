#!/bin/sh
# Postgres so'rovga HAQIQATAN tayyor bo'lgunicha kutadi. Endi Postgres shu
# konteynerning o'zida (127.0.0.1) ishlaydi.
set -e

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"

echo "[wait-for-db] $DB_HOST:$DB_PORT tayyor bo'lishi kutilmoqda..."
until /usr/lib/postgresql/16/bin/pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d service_db >/dev/null 2>&1; do
  sleep 2
done
echo "[wait-for-db] Baza tayyor."

exec "$@"
