<#
    Cutover'dan darhol OLDIN ishga tushiriladi (Bosqich 5). Joriy 7-konteynerli
    stackdagi "db"dan yangi pg_dump (--format=custom) va "asterisk_data"
    volume'idan zaxira oladi. 2026-09-08 dagi mavjud service_db.dump YETARLI
    EMAS deb hisoblanadi (bugungi kundan oldingi) - bu skript har doim
    YANGI zaxira oladi.

    Ishlatish:
      powershell -ExecutionPolicy Bypass -File backup-before-cutover.ps1

    Chiqish: C:\service-core\backups\<timestamp>\ ostida
      - service_db.dump (pg_dump --format=custom)
      - asterisk_data.tar
#>
[CmdletBinding()]
param(
    [string]$DbContainer = 'service-core-db',
    [string]$DbUser = $env:DB_USER,
    [string]$BackupRoot = 'C:\service-core\backups'
)

$ErrorActionPreference = 'Stop'

if (-not $DbUser) { $DbUser = 'postgres' }

$timestamp = Get-Date -Format 'yyyy-MM-dd_HHmmss'
$outDir = Join-Path $BackupRoot $timestamp
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

Write-Host "[backup] '$DbContainer'dan pg_dump olinmoqda..."
docker exec $DbContainer pg_dump -U $DbUser --format=custom -f /tmp/service_db_backup.dump service_db
if ($LASTEXITCODE -ne 0) { throw "pg_dump muvaffaqiyatsiz tugadi (exit $LASTEXITCODE)" }

docker cp "${DbContainer}:/tmp/service_db_backup.dump" (Join-Path $outDir 'service_db.dump')
docker exec $DbContainer rm -f /tmp/service_db_backup.dump

$dumpFile = Join-Path $outDir 'service_db.dump'
if (-not (Test-Path $dumpFile) -or (Get-Item $dumpFile).Length -eq 0) {
    throw "pg_dump fayli bo'sh yoki topilmadi: $dumpFile"
}
Write-Host "[backup] DB zaxirasi tayyor: $dumpFile ($((Get-Item $dumpFile).Length) bayt)"

Write-Host "[backup] 'asterisk_data' volume'idan zaxira olinmoqda..."
$asteriskTar = Join-Path $outDir 'asterisk_data.tar'
docker run --rm -v service-core_asterisk_data:/from -v "${outDir}:/to" alpine `
    tar -cf /to/asterisk_data.tar -C /from .
if ($LASTEXITCODE -ne 0) { throw "asterisk_data zaxirasi muvaffaqiyatsiz tugadi" }

Write-Host "[backup] Tayyor: $outDir"
Write-Host "[backup] KEYINGI QADAM: bu zaxirani ALOHIDA joyga tiklab (pg_restore) tekshiring - tiklanmagan zaxira rollback rejasi hisoblanmaydi."
