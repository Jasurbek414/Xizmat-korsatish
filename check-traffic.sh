#!/bin/bash
set -eu
CID=service-core-core
echo '=== nginx access log, non-local requests ==='
docker exec $CID sh -c "grep -v '127.0.0.1' /var/log/nginx/access.log 2>/dev/null | tail -40 || echo 'no matching lines or no log file'"
echo '=== total line count in access log ==='
docker exec $CID sh -c "wc -l /var/log/nginx/access.log 2>/dev/null || echo 'no log file'"
