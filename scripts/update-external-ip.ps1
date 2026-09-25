<#
    Asterisk pjsip.conf dagi external_media_address/external_signaling_address
    ni joriy ochiq (public) IP bilan sinxronda ushlab turadi.

    NIMA UCHUN KERAK (2026-09-03 migratsiyada topilgan xato): router ISP'dan
    dinamik ochiq IP oladi va bu qiymat oldin qo'lda, qattiq matn sifatida
    yozib qo'yilgan edi (asterisk-config/pjsip.conf). Router IP'si o'zgarganda
    (tarixda kamida 3 marta o'zgargan: 213.230.93.109 -> boshqa -> 213.230.93.28)
    bu qiymat ESKIRIB QOLARDI - Asterisk noto'g'ri manzilni SDP'da e'lon qilib,
    UzTelecom trunk RTP'ni yubora olmay qolishi yoki WebRTC ICE candidate
    xato bo'lishi mumkin edi, buni sezish qiyin (xatolik ochiq-oydin
    ko'rinmaydi, ovoz "jimgina" ulanmay qoladi - xuddi [[telefoniya-turn-nat-muammosi]]
    dagi kabi).

    ISHLASH TARTIBI:
      1. api.ipify.org orqali joriy ochiq IP so'raladi.
      2. pjsip.conf dagi mavjud qiymat bilan solishtiriladi.
      3. Farq bo'lsa - faylga yoziladi va FAQAT "asterisk" konteyneri qayta
         ishga tushiriladi (butun stack emas - qo'ng'iroqlar minimal uzilish
         bilan).
      4. O'zgarish bo'lmasa - hech narsa qilinmaydi (jim, log yozilmaydi -
         har soatlik tekshiruv logni keraksiz to'ldirmasligi uchun).

    QO'LDA ISHGA TUSHIRISH:
      powershell -ExecutionPolicy Bypass -File "<shu fayl yo'li>"

    AVTOMATLASHTIRISH (tavsiya etiladi):
      Windows Task Scheduler'da har 2-3 soatda + "At startup" trigger bilan
      ishga tushiriladigan vazifa yarating (backup-db.ps1 uchun mavjud
      vazifaga o'xshash naqsh).
#>

[CmdletBinding()]
param(
    [string]$PjsipConfPath = (Join-Path $PSScriptRoot '..\asterisk-config\pjsip.conf'),
    [string]$ContainerName = 'service-core-asterisk',
    [string]$LogFile = (Join-Path $PSScriptRoot '..\asterisk-config\update-external-ip.log')
)

$ErrorActionPreference = 'Stop'

function Write-Log {
    param([string]$Message, [string]$Level = 'INFO')
    $line = '{0} [{1}] {2}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Level, $Message
    Add-Content -Path $LogFile -Value $line -Encoding utf8
}

try {
    if (-not (Test-Path $PjsipConfPath)) {
        throw "pjsip.conf topilmadi: $PjsipConfPath"
    }

    $currentIp = (Invoke-RestMethod -Uri 'https://api.ipify.org' -TimeoutSec 10).Trim()
    if ($currentIp -notmatch '^\d{1,3}(\.\d{1,3}){3}$') {
        throw "api.ipify.org dan noto'g'ri javob keldi: '$currentIp'"
    }

    $content = Get-Content $PjsipConfPath -Raw
    $existingMatch = [regex]::Match($content, 'external_media_address=([\d.]+)')
    if (-not $existingMatch.Success) {
        throw "pjsip.conf da external_media_address topilmadi - fayl formati kutilganidan farq qiladi."
    }
    $existingIp = $existingMatch.Groups[1].Value

    if ($existingIp -eq $currentIp) {
        # O'zgarish yo'q - jim chiqamiz, log yozmaymiz.
        exit 0
    }

    Write-Log "Ochiq IP o'zgardi: $existingIp -> $currentIp. pjsip.conf yangilanmoqda."

    $newContent = $content -replace 'external_media_address=[\d.]+', "external_media_address=$currentIp"
    $newContent = $newContent -replace 'external_signaling_address=[\d.]+', "external_signaling_address=$currentIp"
    Set-Content -Path $PjsipConfPath -Value $newContent -Encoding utf8 -NoNewline

    $running = (docker ps --filter "name=^/$ContainerName$" --filter 'status=running' --format '{{.Names}}') -join ''
    if ($running -eq $ContainerName) {
        docker restart $ContainerName | Out-Null
        Write-Log "'$ContainerName' konteyneri yangi IP bilan qayta ishga tushirildi."
    } else {
        Write-Log "'$ContainerName' ishlamayapti - fayl yangilandi, konteyner qayta ishga tushirilmadi (keyingi 'docker compose up' da yangi qiymat bilan ko'tariladi)." 'WARN'
    }

    exit 0
}
catch {
    Write-Log $_.Exception.Message 'XATO'
    exit 1
}
