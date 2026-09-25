#!/bin/bash
set -eu
set -o pipefail
CID=service-core-core

echo '=== restoring service_db (clean + if-exists) ==='
docker cp /opt/service-core/service_db_restore.dump $CID:/tmp/restore.dump
docker exec -e PGPASSWORD=ATcYwCwkkT8WxBH4t6RNBnfR43Hq7PyXk7 $CID \
  pg_restore -U postgres -d service_db --clean --if-exists --no-owner -v /tmp/restore.dump > /tmp/pg_restore.log 2>&1
echo "pg_restore exit=$? (log tail follows)"
tail -20 /tmp/pg_restore.log || true

echo '=== restoring asterisk runtime data (excluding moh/, which is its own bind mount) ==='
docker exec $CID rm -rf /var/lib/asterisk_new
docker exec $CID mkdir -p /var/lib/asterisk_new
docker cp /opt/service-core/asterisk-data.tar.gz $CID:/tmp/asterisk-data.tar.gz
docker exec $CID tar -xzf /tmp/asterisk-data.tar.gz -C /var/lib/asterisk_new
docker exec $CID sh -c '
  for entry in /var/lib/asterisk/*; do
    name=$(basename "$entry")
    if [ "$name" = "moh" ]; then continue; fi
    rm -rf "$entry"
  done
  for entry in /var/lib/asterisk_new/*; do
    name=$(basename "$entry")
    if [ "$name" = "moh" ]; then continue; fi
    cp -a "$entry" /var/lib/asterisk/
  done
  rm -rf /var/lib/asterisk_new
'
docker exec $CID chown -R root:root /var/lib/asterisk

echo '=== restarting backend + asterisk ==='
docker exec $CID supervisorctl start asterisk
sleep 3
docker exec $CID supervisorctl start backend
sleep 10
docker exec $CID supervisorctl status

echo '=== cleanup ==='
docker exec $CID rm -f /tmp/restore.dump /tmp/asterisk-data.tar.gz
rm -f /opt/service-core/service_db_restore.dump /opt/service-core/asterisk-data.tar.gz
