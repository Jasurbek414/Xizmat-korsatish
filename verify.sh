#!/bin/bash
set -eu
CID=service-core-core
echo '=== row counts ==='
docker exec -e PGPASSWORD=ATcYwCwkkT8WxBH4t6RNBnfR43Hq7PyXk7 $CID psql -U postgres -d service_db -c \
  "SELECT (SELECT count(*) FROM companies) companies, (SELECT count(*) FROM users) users, (SELECT count(*) FROM orders) orders, (SELECT count(*) FROM sip_accounts) sip_accounts;"

echo '=== internal HTTP checks ==='
curl -s -o /dev/null -w "port 3005 (admin panel): %{http_code}\n" http://127.0.0.1:3005/
curl -s -o /dev/null -w "port 8080 (api direct): %{http_code}\n" http://127.0.0.1:8080/api/v1/auth/login -X POST -H "Content-Type: application/json" -d '{}'
curl -s -o /dev/null -w "downloads/version.json: %{http_code}\n" http://127.0.0.1:3005/downloads/version.json

echo '=== supervisord error logs (last 5 lines each) ==='
for p in postgres asterisk coturn backend nginx cloudflared; do
  echo "-- $p.err.log --"
  docker exec $CID tail -5 "/var/log/supervisor/$p.err.log"
done
