@echo off
echo ==========================================================
echo ServiceCore Telephony Driver Installer
echo ==========================================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js topilmadi! Iltimos kompyuterga Node.js-ni o'rnating.
    echo Yuklab olish manzili: https://nodejs.org/
    pause
    exit /b
)

echo [1/3] Node.js muhiti tekshirildi.
echo [2/3] Kerakli paketlarni o'rnatish boshlanmoqda...
echo.

:: Initialize npm if package.json doesn't exist
if not exist package.json (
    call npm init -y >nul
)

:: Install ws library
call npm install ws

echo.
echo [3/3] O'rnatish yakunlandi.
echo.
echo Drayverni ishga tushirish uchun quyidagi buyruqni bosing:
echo node sip_bridge.js
echo.
pause
node sip_bridge.js
