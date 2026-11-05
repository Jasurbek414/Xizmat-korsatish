@echo off
setlocal
cd /d "D:\Jasurbek tegilmasin\Xizmat-korsatish"
if exist mobile-flutter-update.tar.gz del /f /q mobile-flutter-update.tar.gz

echo Archiving mobile-flutter...
tar -czf mobile-flutter-update.tar.gz --exclude="build" --exclude=".dart_tool" --exclude=".git" -C "D:\Jasurbek tegilmasin\Xizmat-korsatish\mobile-flutter" .

echo Uploading to VPS...
scp -i "C:\Users\sheikh\.ssh\maktab_vps" -o StrictHostKeyChecking=no mobile-flutter-update.tar.gz root@62.169.27.106:/root/mobile-flutter-update.tar.gz

echo Extracting on VPS...
ssh -i "C:\Users\sheikh\.ssh\maktab_vps" -o StrictHostKeyChecking=no root@62.169.27.106 "mkdir -p /root/servicecore-mobile-build && tar -xzf /root/mobile-flutter-update.tar.gz -C /root/servicecore-mobile-build && echo 'Extracted successfully'"

echo Running APK build on VPS in Docker...
ssh -i "C:\Users\sheikh\.ssh\maktab_vps" -o StrictHostKeyChecking=no root@62.169.27.106 "rm -f /root/servicecore-mobile-build/build/app/outputs/flutter-apk/app-release.apk && docker run --rm --name servicecore-apk-build -m 5g -v /root/servicecore-mobile-build:/app -w /app -v ishchi-apk-gradle-cache:/root/.gradle -v ishchi-flutter-pub-cache:/root/.pub-cache ghcr.io/cirruslabs/flutter:3.29.3 sh -c 'flutter pub get && flutter build apk --release'"

echo Deploying APK to web downloads on VPS...
ssh -i "C:\Users\sheikh\.ssh\maktab_vps" -o StrictHostKeyChecking=no root@62.169.27.106 "mkdir -p /opt/service-core/downloads && cp /root/servicecore-mobile-build/build/app/outputs/flutter-apk/app-release.apk /opt/service-core/downloads/servicecore-test.apk && ls -la /opt/service-core/downloads/servicecore-test.apk"

echo Downloading APK to local machine via HTTPS...
curl.exe -f -k -o "C:\Users\sheikh\Downloads\servicecore-mobile-test.apk" https://servicecore.ecos.uz/downloads/servicecore-test.apk
copy /y "C:\Users\sheikh\Downloads\servicecore-mobile-test.apk" "D:\Jasurbek tegilmasin\Xizmat-korsatish\downloads\servicecore-mobile-test.apk"

echo Build and download complete!
