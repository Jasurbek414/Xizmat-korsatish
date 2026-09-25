#!/usr/bin/env bash
# Mobil APK qurishdan OLDIN ishga tushiriladi - pubspec.yaml dagi versiya
# jonli serverdagi downloads/version.json dan OSHMASA, build TO'XTATILADI.
#
# NEGA KERAK: 2026-08-05/06 da bir necha marta versiya oshirilmasdan APK
# qurilib, foydalanuvchi "yangi versiya eski deb ko'rsatilyapti" muammosiga
# duch kelgan edi. Bu skript o'sha xatoni kod darajasida MAJBURIY oldini
# oladi - foydalanuvchi "har build'da versiya oshir" deb qayta-qayta
# eslatishga majbur bo'lmasligi kerak.
#
# Ishlatish (build'dan oldin):
#   bash scripts/check_version_bumped.sh && <APK build buyrug'i>
set -euo pipefail

PUBSPEC="$(dirname "$0")/../mobile-flutter/pubspec.yaml"
VERSION_URL="https://servicecore.ecos.uz/downloads/version.json"

local_code=$(grep -oP '^version:\s*\K[0-9.]+\+\K[0-9]+' "$PUBSPEC" || true)
if [ -z "$local_code" ]; then
  echo "XATO: pubspec.yaml dan versionCode o'qib bo'lmadi." >&2
  exit 1
fi

remote_code=$(curl -s --max-time 10 "$VERSION_URL" | grep -oP '"versionCode"\s*:\s*\K[0-9]+' || true)
if [ -z "$remote_code" ]; then
  echo "OGOHLANTIRISH: jonli version.json o'qilmadi (tarmoq yoki server muammosi) - tekshiruv o'tkazib yuborildi." >&2
  exit 0
fi

if [ "$local_code" -le "$remote_code" ]; then
  echo "XATO: pubspec.yaml versionCode ($local_code) jonli serverdagidan ($remote_code) OSHMAGAN." >&2
  echo "  -> mobile-flutter/pubspec.yaml dagi 'version:' qatorini oshiring (masalan +$((remote_code + 1)))." >&2
  echo "  -> Build tugagach downloads/version.json ni ham YANGI versionCode bilan yangilashni unutmang." >&2
  exit 1
fi

echo "OK: versionCode $local_code > jonli $remote_code - build davom etishi mumkin."
