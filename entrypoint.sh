#!/bin/sh
# service-core - TO'LIQ BITTA konteyner kirish nuqtasi.
#
# 1) Majburiy maxfiy qiymatlar mavjudligini tekshiradi.
# 2) Konteynerning haqiqiy IP manzilini aniqlaydi va kutilgan (pin
#    qilingan) qiymat bilan solishtiradi - mos kelmasa to'xtaydi (ICE
#    marshrutlash jimgina buzilishining oldini olish uchun).
# 3) ari.conf va rtp.conf shablonlarini haqiqiy qiymatlar bilan render
#    qiladi.
# 4) supervisord'ni ishga tushiradi (u o'zi postgres/asterisk/coturn/
#    backend/nginx/cloudflared'ni boshqaradi).
set -eu

echo "[entrypoint] service-core BITTA konteynerda ishga tushmoqda..."

required_vars="ASTERISK_ARI_PASSWORD TURN_USER TURN_PASSWORD CLOUDFLARE_TUNNEL_TOKEN JWT_SECRET DB_USER DB_PASSWORD"
missing=""
for v in $required_vars; do
  eval "val=\${$v:-}"
  if [ -z "$val" ]; then
    missing="$missing $v"
  fi
done
if [ -n "$missing" ]; then
  echo "[entrypoint] XATO: quyidagi majburiy environment o'zgaruvchilari yo'q:$missing" >&2
  exit 1
fi

: "${WEBRTC_LAN_IP:=192.168.100.12}"
: "${EXPECTED_CONTAINER_IP:=}"

CONTAINER_IP="$(ip -4 -o addr show eth0 2>/dev/null | awk '{print $4}' | cut -d/ -f1)"
if [ -z "$CONTAINER_IP" ]; then
  echo "[entrypoint] XATO: konteynerning IPv4 manzili (eth0) aniqlanmadi." >&2
  exit 1
fi

if [ -n "$EXPECTED_CONTAINER_IP" ] && [ "$CONTAINER_IP" != "$EXPECTED_CONTAINER_IP" ]; then
  echo "[entrypoint] XATO: konteyner IP kutilganidan farq qiladi (kutilgan=$EXPECTED_CONTAINER_IP, haqiqiy=$CONTAINER_IP)." >&2
  echo "[entrypoint] Bu holatda ICE host-candidate marshrutlash jimgina buzilishi mumkin edi - shuning uchun ATAYLAB to'xtatilyapti." >&2
  exit 1
fi

echo "[entrypoint] Konteyner IP: $CONTAINER_IP | WebRTC LAN IP: $WEBRTC_LAN_IP"

export CONTAINER_IP WEBRTC_LAN_IP
envsubst '$ASTERISK_ARI_PASSWORD' < /etc/core-templates/ari.conf.template > /etc/asterisk/ari.conf
envsubst '$CONTAINER_IP $WEBRTC_LAN_IP' < /etc/core-templates/rtp.conf.template > /etc/asterisk/rtp.conf

mkdir -p /var/lib/asterisk /var/spool/asterisk /var/log/asterisk /var/log/supervisor

echo "[entrypoint] Tayyor, supervisord ishga tushmoqda."
exec supervisord -c /etc/supervisor/conf.d/supervisord.conf -n
