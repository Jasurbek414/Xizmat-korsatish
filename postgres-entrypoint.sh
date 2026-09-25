#!/bin/sh
# Postgres'ni shu (bitta, hamma narsani jamlagan) konteyner ichida ishga
# tushiradi. Birinchi marta ishga tushganda (PGDATA bo'sh bo'lsa) initdb
# qiladi va "service_db" bazasini yaratadi - keyingi ishga tushishlarda
# buni o'tkazib yuboradi (volume orqali ma'lumot saqlanib qoladi).
set -eu

PGBIN=/usr/lib/postgresql/16/bin
PGDATA=/var/lib/postgresql/data
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:?DB_PASSWORD kerak}"
DB_NAME="service_db"

mkdir -p "$PGDATA"
chown -R postgres:postgres /var/lib/postgresql

FRESH=0
if [ ! -s "$PGDATA/PG_VERSION" ]; then
  FRESH=1
  echo "[postgres] initdb: yangi ma'lumotlar katalogi yaratilmoqda..."
  pwfile=$(mktemp)
  printf '%s' "$DB_PASSWORD" > "$pwfile"
  chown postgres:postgres "$pwfile"
  su postgres -c "$PGBIN/initdb -D '$PGDATA' -U '$DB_USER' --pwfile='$pwfile' --auth=scram-sha-256 --encoding=UTF8"
  rm -f "$pwfile"
  echo "host all all 0.0.0.0/0 scram-sha-256" >> "$PGDATA/pg_hba.conf"
  sed -i "s/^#listen_addresses.*/listen_addresses = '*'/" "$PGDATA/postgresql.conf"
  chown -R postgres:postgres "$PGDATA"
fi

su postgres -c "$PGBIN/postgres -D '$PGDATA'" &
PG_PID=$!

if [ "$FRESH" = "1" ]; then
  echo "[postgres] '$DB_NAME' bazasi yaratilishi kutilmoqda..."
  until su postgres -c "$PGBIN/pg_isready -h 127.0.0.1" >/dev/null 2>&1; do
    sleep 1
  done
  # MUHIM: --auth=scram-sha-256 tufayli LOKAL (Unix socket) ulanish ham
  # parol talab qiladi - shuning uchun PGPASSWORD ANIQ berilishi va -h bilan
  # TCP orqali ulanish SHART, aks holda createdb parol so'rab abadiy
  # to'xtab qoladi (jonli sinovda aniqlangan xato - "|| true" buni
  # yashirib, backend keyin "database does not exist" bilan qulagan edi).
  su postgres -c "PGPASSWORD='$DB_PASSWORD' $PGBIN/createdb -h 127.0.0.1 -U '$DB_USER' '$DB_NAME'"
  echo "[postgres] '$DB_NAME' yaratildi."
fi

wait "$PG_PID"
