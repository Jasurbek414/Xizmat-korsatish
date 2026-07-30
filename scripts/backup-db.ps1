<#
    service_db uchun avtomatik zaxira nusxa (backup) skripti.

    NIMA UCHUN KERAK (auditda topilgan): loyihada zaxira nusxa tizimi UMUMAN
    yo'q edi - butun biznes ma'lumoti (buyurtmalar, moliya, qarzlar, mijozlar)
    faqat BITTA joyda, "xizmat-korsatish_postgres_data" Docker volume'ida
    turardi. Docker Desktop qayta o'rnatilsa, WSL2 diski buzilsa yoki
    "docker volume rm" tasodifan bajarilsa - hamma narsa qaytarib bo'lmaydigan
    darajada yo'qolardi.

    ISHLASH TARTIBI:
      1. Ishlab turgan "service-core-db" konteynerida pg_dump'ni bajaradi
         (-Fc = PostgreSQL "custom" formati: siqilgan va pg_restore bilan
         tanlab tiklash imkonini beradi, oddiy .sql dan afzal).
      2. Natijani konteynerdan xost diskiga oqim (stdout) orqali yozadi -
         konteyner ichida vaqtinchalik fayl qoldirmaydi.
      3. Faylni pg_restore --list bilan TEKSHIRADI - buzilgan/bo'sh dump
         "muvaffaqiyatli" deb hisoblanib qolmasligi uchun (aks holda kerak
         bo'lganda zaxira ishlamasligi faqat tiklash paytida ma'lum bo'lardi).
      4. RETENTION_DAYS'dan eski fayllarni o'chiradi.

    QO'LDA ISHGA TUSHIRISH:
      powershell -ExecutionPolicy Bypass -File "<shu fayl yo'li>"

    TIKLASH (restore) - MISOL:
      # 1) Dump faylni konteynerga ko'chirish
      docker cp D:\Backups\service_db\service_db_2026-07-30_0900.dump service-core-db:/tmp/r.dump
      # 2) Mavjud bazani almashtirib tiklash (DIQQAT: joriy ma'lumot o'chadi)
      docker exec service-core-db pg_restore -U postgres -d service_db --clean --if-exists /tmp/r.dump
#>

[CmdletBinding()]
param(
    # Zaxiralar saqlanadigan papka. ATAYIN D: diskda - C: da 134 GB bo'sh
    # bo'lsa-da, tizim diski to'lib qolsa Windows ham, Docker ham ishlamay
    # qoladi; bundan tashqari OS qayta o'rnatilganda D: saqlanib qoladi.
    [string]$BackupDir = 'D:\Backups\service_db',

    [string]$ContainerName = 'service-core-db',
    [string]$DbName = 'service_db',
    [string]$DbUser = 'postgres',

    # Shu kundan eski zaxiralar o'chiriladi. 14 kun - tasodifan o'chirilgan
    # yoki buzilgan ma'lumot ikki hafta ichida sezilishi uchun yetarli oraliq.
    [int]$RetentionDays = 14
)

$ErrorActionPreference = 'Stop'

$stamp   = Get-Date -Format 'yyyy-MM-dd_HHmm'
$logFile = Join-Path $BackupDir 'backup.log'

function Write-Log {
    param([string]$Message, [string]$Level = 'INFO')
    $line = '{0} [{1}] {2}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Level, $Message
    Write-Host $line
    # Log fayli zaxira papkasi bilan bir joyda - agar papka hali yo'q bo'lsa
    # (birinchi ishga tushirish) log yozishga urinib xato bermaymiz.
    if (Test-Path $BackupDir) { Add-Content -Path $logFile -Value $line -Encoding utf8 }
}

try {
    if (-not (Test-Path $BackupDir)) {
        New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    }
    Write-Log "Zaxira boshlandi -> $BackupDir"

    # --- Konteyner ishlayaptimi? ---
    # Ishlamayotgan konteynerda "docker exec" xato beradi, lekin biz buni
    # ANIQ xabar bilan to'xtatamiz - cron logida "exit 1" dan ko'ra tushunarli.
    $running = (docker ps --filter "name=^/$ContainerName$" --filter 'status=running' --format '{{.Names}}') -join ''
    if ($running -ne $ContainerName) {
        throw "'$ContainerName' konteyneri ishlamayapti - zaxira olinmadi. Avval 'docker compose up -d db' bajaring."
    }

    $outFile = Join-Path $BackupDir ("{0}_{1}.dump" -f $DbName, $stamp)

    # --- pg_dump ---
    # Natijani stdout orqali olamiz. cmd.exe ">" yo'naltirishi ishlatiladi,
    # chunki PowerShell'ning ">" operatori matn sifatida talqin qilib, BINAR
    # dump'ni kodlash bilan BUZIB qo'yadi (bu juda oson e'tibordan qoladigan
    # xato: fayl yaratiladi, hajmi ham bor, lekin pg_restore uni o'qiy olmaydi).
    Write-Log "pg_dump bajarilmoqda (-Fc, siqilgan)..."
    $dockerExe = (Get-Command docker).Source
    & cmd.exe /c "`"$dockerExe`" exec $ContainerName pg_dump -U $DbUser -d $DbName -Fc > `"$outFile`""
    if ($LASTEXITCODE -ne 0) { throw "pg_dump xato bilan tugadi (exit=$LASTEXITCODE)." }

    if (-not (Test-Path $outFile)) { throw "Dump fayli yaratilmadi: $outFile" }
    $sizeKB = [math]::Round((Get-Item $outFile).Length / 1KB, 1)
    if ($sizeKB -lt 1) { throw "Dump fayli bo'sh (${sizeKB} KB) - zaxira ISHONCHSIZ." }

    # --- Butunlik tekshiruvi ---
    # Faqat hajmga ishonish yetarli emas: yarim yozilgan dump ham katta
    # bo'lishi mumkin. pg_restore --list dump sarlavhasi va TOC'ni haqiqatan
    # o'qiy olishini tasdiqlaydi (bazaga hech narsa yozmaydi).
    docker cp $outFile "${ContainerName}:/tmp/verify.dump" | Out-Null
    $toc = docker exec $ContainerName pg_restore --list /tmp/verify.dump 2>&1
    docker exec $ContainerName rm -f /tmp/verify.dump | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Dump BUZUQ - pg_restore uni o'qiy olmadi: $($toc | Select-Object -First 3)"
    }
    $tableCount = ($toc | Select-String -Pattern 'TABLE DATA').Count
    Write-Log "Tekshiruv OK: ${sizeKB} KB, $tableCount jadval ma'lumoti."

    # --- Eski zaxiralarni tozalash ---
    $cutoff = (Get-Date).AddDays(-$RetentionDays)
    $old = Get-ChildItem $BackupDir -Filter "$DbName`_*.dump" | Where-Object { $_.LastWriteTime -lt $cutoff }
    foreach ($f in $old) {
        Remove-Item $f.FullName -Force
        Write-Log "Eski zaxira o'chirildi: $($f.Name)"
    }

    $total = (Get-ChildItem $BackupDir -Filter "$DbName`_*.dump" | Measure-Object).Count
    Write-Log "TUGADI. Yangi zaxira: $(Split-Path $outFile -Leaf) | Jami saqlanayotgan zaxira: $total"
    exit 0
}
catch {
    Write-Log $_.Exception.Message 'XATO'
    exit 1
}
