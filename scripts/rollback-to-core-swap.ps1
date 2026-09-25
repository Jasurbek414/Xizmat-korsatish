<#
    Cutover MUVAFFAQIYATSIZ bo'lsa DARHOL ishga tushiriladi. "core"ni
    to'xtatib, eski 7-konteynerli docker-compose.yml'ni qayta ko'taradi.
    "db" hech qachon o'chirilmagani/o'zgartirilmagani uchun bu operatsiya
    ma'lumot yo'qotish xavfisiz - faqat qaysi konteynerlar ishlayotganini
    almashtiradi.

    Ishlatish:
      powershell -ExecutionPolicy Bypass -File rollback-to-core-swap.ps1
#>
$ErrorActionPreference = 'Stop'
Set-Location C:\service-core

Write-Host "[rollback] 'core' konteynerini to'xtatilmoqda..."
docker compose -f docker-compose.core.yml stop core 2>&1 | Out-Null

Write-Host "[rollback] Eski 7-konteynerli stack qayta ko'tarilmoqda (docker-compose.yml)..."
docker compose -f docker-compose.yml up -d
if ($LASTEXITCODE -ne 0) { throw "Eski stackni qayta ko'tarish muvaffaqiyatsiz tugadi (exit $LASTEXITCODE)" }

Write-Host "[rollback] Tayyor. Holatni tekshiring: docker ps"
Write-Host "[rollback] Cloudflare Tunnel marshrutlashini ham eski holatga qaytarishni unutmang (agar cutover paytida o'zgartirilgan bo'lsa)."
