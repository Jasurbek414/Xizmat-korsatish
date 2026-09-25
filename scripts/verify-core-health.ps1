<#
    Bosqich 6 tekshiruv ro'yxatining AVTOMATLASHTIRILADIGAN qismini
    bajaradi (TO'LIQ BITTA konteyner: Postgres+Asterisk+coturn+backend+
    frontend+nginx+cloudflared). Real WebRTC qo'ng'iroq testi va operator
    trunk ro'yxatdan o'tishi BU YERDA YO'Q - ular qo'lda tekshirilishi
    SHART.

    Ishlatish (sinov konteyneri uchun, soxta cloudflared token bilan):
      powershell -File verify-core-health.ps1 -ContainerName service-core-core-test -HttpPort 4005 -SkipCloudflared

    Ishlatish (production uchun, cutover'dan keyin, haqiqiy token bilan):
      powershell -File verify-core-health.ps1 -ContainerName service-core-core -HttpPort 3005
#>
[CmdletBinding()]
param(
    [string]$ContainerName = 'service-core-core',
    [int]$HttpPort = 3005,
    [switch]$SkipCloudflared
)

$ErrorActionPreference = 'Continue'
$failures = @()

function Check($name, [scriptblock]$block) {
    Write-Host "[check] $name ..." -NoNewline
    try {
        $result = & $block
        if ($result) {
            Write-Host " OK" -ForegroundColor Green
        } else {
            Write-Host " MUVAFFAQIYATSIZ" -ForegroundColor Red
            $script:failures += $name
        }
    } catch {
        Write-Host " XATO: $($_.Exception.Message)" -ForegroundColor Red
        $script:failures += $name
    }
}

Check "Konteyner ishlab turibdi" {
    (docker inspect -f '{{.State.Running}}' $ContainerName) -eq 'true'
}

Check "supervisord: postgres/asterisk/coturn/backend/nginx RUNNING" {
    $status = docker exec $ContainerName supervisorctl status
    $status | Write-Host
    $relevant = $status
    if ($SkipCloudflared) {
        $relevant = $status | Where-Object { $_ -notmatch '^cloudflared\s' }
    }
    -not ($relevant | Select-String -Pattern 'FATAL|BACKOFF|EXITED' -Quiet)
}

Check "Frontend ('/') 200 qaytaradi" {
    $resp = Invoke-WebRequest -Uri "http://127.0.0.1:$HttpPort/" -UseBasicParsing -TimeoutSec 10
    $resp.StatusCode -eq 200
}

Check "Backend portga ulanish mumkin (127.0.0.1:8090, konteyner ichidan)" {
    $r = docker exec $ContainerName curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8090/actuator/health
    $r -ne '000' -and $r -ne ''
}

Check "Asterisk ARI javob beryapti (shu konteyner ichida, 127.0.0.1:8088)" {
    $ariPass = docker exec $ContainerName printenv ASTERISK_ARI_PASSWORD
    $r = docker exec $ContainerName curl -s -o /dev/null -w "%{http_code}" -u "asterisk:$ariPass" http://127.0.0.1:8088/ari/asterisk/info
    $r -eq '200'
}

Check "coturn 3478-portda tinglayapti (konteyner ichida)" {
    $r = docker exec $ContainerName sh -c "timeout 3 bash -c '</dev/tcp/127.0.0.1/3478' && echo OK"
    $r -match 'OK'
}

Check "'/downloads/' APK xizmat qilyapti" {
    $resp = Invoke-WebRequest -Uri "http://127.0.0.1:$HttpPort/downloads/version.json" -UseBasicParsing -TimeoutSec 10
    $resp.StatusCode -eq 200
}

Check "PostgreSQL'ga ulanish va 'service_db' mavjudligi (konteyner ichida)" {
    $r = docker exec $ContainerName sh -c '/usr/lib/postgresql/16/bin/pg_isready -h 127.0.0.1 -U "$DB_USER" -d service_db'
    $LASTEXITCODE -eq 0
}

Write-Host ""
if ($failures.Count -eq 0) {
    Write-Host "BARCHA AVTOMATIK TEKSHIRUVLAR O'TDI." -ForegroundColor Green
    Write-Host "ESLATMA: hali ham QO'LDA tekshirilishi SHART - real WebRTC qo'ng'iroq (ikki tomonlama audio, nol bo'lmagan davomiylik), TURN allocation, operator trunk ro'yxatdan o'tishi." -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "MUVAFFAQIYATSIZ TEKSHIRUVLAR: $($failures -join ', ')" -ForegroundColor Red
    exit 1
}
