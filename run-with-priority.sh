#!/bin/sh
# Foydalanish: run-with-priority.sh <oom_score_adj> <nice_daraja> <buyruq...>
#
# oom_score_adj: xotira tugaganda kernel qaysi protsessni "qurbon qilishi"ni
# afzal ko'rishini boshqaradi (-1000..1000, kichikroq = himoyalanganroq).
# nice: CPU rejalashtirish ustuvorligi (-20..19, kichikroq = ustunroq).
#
# Docker'ning per-konteyner cgroup izolyatsiyasi bitta konteynerda barcha
# xizmatlar uchun YO'QOLGANI sababli (7->2 konteynerga birlashtirishning
# bilinadigan kelishuvi), bu skript shu izolyatsiyaning bir qismini protsess
# darajasida qayta tiklashga urinadi - lekin bu ENGILLASHTIRISH, cgroup
# limitining o'rnini TO'LIQ bosolmaydi.
set -e

OOM_SCORE="$1"
NICE_LEVEL="$2"
shift 2

echo "$OOM_SCORE" > /proc/self/oom_score_adj 2>/dev/null || true

exec nice -n "$NICE_LEVEL" "$@"
