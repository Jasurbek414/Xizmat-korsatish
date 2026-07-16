# Telefoniya tizimi — to'liq audit natijalari (2026-07-16)

> ## ✅ YAKUNIY HOLAT (2026-07-16, tuzatildi)
> Quyidagi 20 ta banddagi barcha xatolar tuzatildi, backend qayta build qilinib
> jonli joylashtirildi, frontend bundle yangilandi (`index-CVjDzWFP.js`),
> `proxy`/`tunnel` qayta ishga tushirildi. Sayt 200 qaytaryapti, konteynerlar
> sog'lom (FreeSWITCH ham "healthy"). Ikkinchi (chuqurroq) tekshiruvda topilgan
> qo'shimcha xatolar ham tuzatildi:
> - `answerCall` idempotent qilindi (mijozdan kelgan kech ANSWER haqiqiy
>   CHANNEL_BRIDGE javob vaqtini qayta yozib davomiylikni buzmasligi uchun).
> - Javobsiz osilib qolgan sessiyalar uchun `@Scheduled` tozalash (3 daqiqa
>   timeout) qo'shildi (ESL buyrug'i jim xato bersa sessiya abadiy qolmasin).
> - Rad etilgan DIAL uchun mijozga "FAILED" xabari qaytariladi (UI abadiy
>   "CONNECTING"da qolmasin) + frontend uni ushlab, alert ko'rsatadi va tozalaydi.
> - Frontend DIAL raqamni tozalaydi (probel/tire olib tashlaydi) — backend'ning
>   qat'iy regex'i to'g'ri raqamni jimgina rad etmasligi uchun.
> - Mijoz ismi mosligida telefon NORMALLASHTIRILADI (oxirgi 9 raqam) — "+998..."
>   va "..." formatlari mos kelishi uchun (jonli tekshiruvda tasdiqlangan).
> - FreeSWITCH konteynerining doim "unhealthy" ko'rsatishi (parolsiz eski
>   healthcheck) tuzatildi.
>
> ⚠️ **Kod bilan bog'liq bo'lmagan yagona ochiq masala:** UzTelecom trunk hali
> `FAIL_WAIT` (408 Request Timeout) — bu operator tomonidagi holat (ehtimol
> avvalgi qayta-qayta urinishlardan keyingi cheklov), kod xatosi emas.


Bu hujjat telefoniya menyusi va backend'ining to'liq tekshiruvi natijasidir.
Har bir band jonli tizimda (Docker konteynerlar, haqiqiy FreeSWITCH va baza)
tekshirilgan — taxmin emas. Ish shu yerda TO'XTATILDI, davom ettirish uchun
quyidagi ro'yxatdan foydalaning.

## Tizimning hozirgi holati (audit paytida o'lchangan)

- **Brauzer ichki extension'i ISHLAYAPTI**: `sofia status profile internal reg`
  → `2001@172.20.0.3`, `Registered(WSS-NAT)`, JsSIP 3.13.8. Ya'ni brauzer ↔
  FreeSWITCH ulanishi (registratsiya) sog'lom.
- **Trunk (UzTelecom) ISHLAMAYAPTI**: barcha gateway'lar `FAIL_WAIT`,
  `Failed Registration with status Request Timeout [408]` — operatordan
  umuman javob yo'q. Sababi katta ehtimol 3-band (quyida).
- **Bazada 9 ta SipAccount** (8 tasi bir xil `101`), FreeSWITCH'da 10 gateway.
- `operator_devices`: 2 ta extension — `2000` (user a2222222), `2001` (user a1111111).
- `call_sessions`: atigi 1 yozuv.

---

## 🔴 KRITIK — qo'ng'iroq umuman ishlamasligining sababi

### 1. Originate A-leg noto'g'ri — qo'ng'iroq brauzerga yetib bormaydi
**Fayl:** `backend-java/src/main/java/com/service/core/service/telephony/FreeSwitchAdapter.java`, `makeCall()`

Hozirgi kod operatorga `sofia/internal/<caller>` deb qo'ng'iroq qiladi.

**Tasdiq (jonli fs_cli):**
```
fs_cli -x "sofia_contact 2001@172.20.0.3"
→ sofia/internal/sip:gdc5is4n@uuui354ohnsj.invalid;transport=ws;fs_nat=yes;fs_path=sip%3A...%3Btransport%3Dwss
```
Ya'ni ro'yxatdan o'tgan WebRTC brauzerining haqiqiy dial-string'i butunlay
boshqacha. `sofia/internal/2001` shakli hech qachon brauzerga yetmaydi.

**Tuzatish:** `user/<caller>@<domain>` ishlatish kerak (bu directory'dagi
`dial-string` orqali avtomatik `sofia_contact`ga kengayadi).
Domain = FreeSWITCH ichki domeni (hozir `172.20.0.3` — bu konteyner IP'si,
o'zgaruvchan! `$${domain}` yoki konfiguratsiyadan olinishi kerak, qattiq
kodlanmasin).

### 2. Originate B-leg trunk hisobini umuman ishlatmaydi
**Fayl:** xuddi shu `FreeSwitchAdapter.makeCall()`

Hozirgi kod: `sofia/external/<callee>@<sipServer>` — bu UzTelecom'ga
**autentifikatsiyasiz**, to'g'ridan-to'g'ri INVITE. `101`/parol hisobi
(gateway) umuman ishlatilmaydi → operator albatta rad etadi.

**Tuzatish:** `sofia/gateway/<gateway-nomi>/<callee>`.
⚠️ Gateway nomi = `SipAccount.getId()` (UUID), `username` EMAS — buni
`FreeSwitchGatewayFileWriter.buildGatewayXml()` shunday yozadi.
Demak `makeCall()` imzosi ham o'zgarishi kerak: `sipServer` o'rniga
gateway nomi (account ID) uzatilsin (`TelephonyService.initiateCall`da).

### 3. "Saqlash" har bosilganda YANGI trunk yaratadi — 9 dublikat yig'ilgan
**Fayllar:** `frontend-admin/src/features/Telephony.jsx` (`handleSaveSettings`),
`backend-java/.../controller/SipAccountController.java` (PUT endpoint yo'q)

`handleSaveSettings` doim `api.createSipAccount(payload)` (POST) chaqiradi —
yangilash yo'q, bazada unique cheklov ham yo'q.

**Tasdiq (baza):**
```
09:00 101 | 09:01 100 | 09:02 101 | 09:08 101 | 12:29 101
12:30 101 | 12:38 101 | 12:40 101 | 12:44 101      → jami 9 ta
```
Har biri alohida gateway → **bir xil `101` hisobi bilan bir vaqtda 8 marta**
UzTelecom'ga registratsiya. **Bu — operator "Request Timeout" berayotganining
eng ehtimoliy sababi.**

**Tuzatish:**
1. Darhol: dublikatlarni tozalash (bittasini qoldirib). Faqat bazadan
   o'chirish YETARLI EMAS — gateway fayllari ham o'chirilishi kerak
   (`/freeswitch-gateways` volume) + `sofia profile external rescan`.
   ⚠️ 5-bandga qarang: `unregister` hozir buzuq, qo'lda tekshirish kerak.
2. Doimiy: `PUT /api/v1/sip-accounts/{id}` qo'shish; frontend `sipSettings.id`
   bo'lsa POST emas, PUT qilsin; bazada `company_id`ga unique cheklov o'ylab
   ko'rilsin.

---

## 🟠 JIDDIY

### 4. Xavfsizlik: DIAL'dagi `caller` tekshirilmaydi
**Fayl:** `.../service/telephony/TelephonyWebSocketHandler.java` (`handleTextMessage`)

```java
String caller = (String) data.get("caller");   // mijozdan, tekshirilmaydi!
telephonyService.initiateCall(sipAccountId, caller, callee, requestingCompanyId);
```
Operator boshqa operatorning extension'ini (`2000`) yuborib, **uning
brauzerini jiringlatib**, tashqi qo'ng'iroqqa ulab qo'yishi mumkin.
`sipAccountId` uchun egalik tekshiruvi bor, `caller` uchun YO'Q.

**Tuzatish:** `caller`ni mijozdan olmaslik — sessiyaning `userId` atributidan
(JWT orqali tasdiqlangan) `Device.extensionNumber`ni server tomonda topish.

### 5. Trunk o'chirish ishlamaydi — noto'g'ri nom bilan killgw
**Fayl:** `.../service/telephony/FreeSwitchAdapter.java` (`unregister`)

```java
executeCommand("api sofia profile external killgw " + account.getUsername());
```
Gateway nomi = `account.getId()` (UUID), `username` emas → killgw noto'g'ri
nishonga uradi, gateway hech qachon o'chmaydi (o'chirilgan trunk ham
registratsiyada davom etadi). Bu 3-banddagi dublikatlarni tozalashga ham
to'sqinlik qiladi.

**Tuzatish:** `killgw <account.getId()>`. Qo'shimcha: qiymat ESL buyrug'iga
tozalanmasdan qo'yilyapti (in'ektsiya himoyasi yo'q, `makeCall`da bor).

### 6. Tugatish tugmasi FreeSWITCH'ga buyruq bermaydi
**Fayl:** `.../service/telephony/TelephonyService.java` (`endCall`)

`SIPAdapter.hangupCall()` interfeysda bor, lekin **hech qayerdan
chaqirilmaydi**. `endCall` faqat bazaga yozadi + sessiyani xotiradan
o'chiradi. Brauzer o'z SIP oyog'ini uzsa bridge tarqaladi, lekin brauzer
osilib qolsa/tab yopilsa **tashqi kanal band qolib, pul ketishi mumkin**.

**Tuzatish:** `endCall`da `sipAdapter.hangupCall(sessionUuid.toString())`.

### 7. Qo'ng'iroq davomiyligi noto'g'ri
**Fayl:** `TelephonyService.endCall`
```java
Duration.between(session.getStartTime(), session.getEndTime())
```
`startTime` = raqam terilgan payt → **jiringlash vaqti ham qo'shiladi**.
`answerTime` ishlatilishi kerak (javob berilmagan bo'lsa 0).

### 8. CHANNEL_ANSWER haqiqiy javobni bildirmaydi
Yangi originate tartibida A-leg = operator brauzeri va u **avtomatik javob
beradi** (`Telephony.jsx`, `dialingNumberRef` mantiqi). Demak
`CHANNEL_ANSWER` deyarli darhol keladi va `answerCall()` "CONNECTED" deb
belgilaydi — **mijoz javob berganini emas**. Haqiqiy javob B-leg'da
(`sofia/gateway/...`) sodir bo'ladi. Bridge/B-leg hodisalarini ajratish kerak.

### 9-11. Qo'ng'iroq tarixi haqiqiy ma'lumot bilan to'ldirilmaydi
**Fayl:** `.../controller/CallSessionController.java` va `TelephonyService.endCall`

- `map.put("client_name", "Noma'lum");` ← **qattiq kodlangan**, mijoz
  bazadan hech qachon qidirilmaydi. Eski `CallController` buni
  `clientRepository.findByCompanyIdAndPhone(...)` orqali qilardi — bu
  regressiya (foydalanuvchi "haqiqiy ma'lumot bilan ishlamayapti" degani
  ehtimol shu).
- `CallSession.dispatcher` hech qachon to'ldirilmaydi → operator doim
  "Noma'lum". `ActiveSession`da `userId` maydoni yo'q — qo'shish kerak.
- `direction` doim `"OUTBOUND"` qattiq kodlangan.

---

## 🟡 O'RTA

12. **Extension fayllari uchun o'z-o'zini tiklash yo'q.**
    `RegistrationManager.checkAndRegisterTrunks` gateway fayllarini har safar
    qayta yozadi (o'z-o'zini tuzatish), lekin `ExtensionService` faylni faqat
    Device YARATILGANDA yozadi. `freeswitch_extensions` volume tozalansa,
    mavjud Device'lar uchun fayl qayta yozilmaydi → registratsiya buziladi.

13. **`Device.status` hech qachon ONLINE bo'lmaydi.** `PresenceManager`
    `TelephonyService`ga in'ektsiya qilingan, lekin **umuman ishlatilmaydi**
    (o'lik kod). Kiruvchi qo'ng'iroq (Faza 2) uchun "qaysi operator onlayn"
    shart — bu bo'lmasa Faza 2 qurilmaydi.

14. **ESL `Content-Length` baytda, kod belgi (char) o'qiydi.**
    **Fayl:** `FreeSwitchEventListener.readEventBlock`
    ```java
    int contentLength = Integer.parseInt(...);   // BAYT
    char[] body = new char[contentLength];
    reader.read(body, ...);                       // BELGI
    ```
    Non-ASCII (o'zbek ismlari `effective_caller_id_name`da) kelsa oqim
    desinxronlanadi va keyingi barcha hodisalar buziladi. Hozir FreeSWITCH
    qiymatlarni URL-encode qilgani uchun yashirin turibdi.

15. **Extension raqami satr sifatida tartiblanadi.**
    `findTopByExtensionNumberIsNotNullOrderByExtensionNumberDesc` — `"9999"`
    > `"10000"` (satr solishtiruvi). 10000dan oshsa raqam takrorlanadi.

16. **SIP sozlamalari formasi DISPATCHER'ga ham ko'rinadi** — parol maydoni
    bo'sh keladi (403), saqlashga urinsa yana 403. UI'da rolga qarab
    yashirilishi kerak (`SipSettings.jsx` / `Telephony.jsx`).

17. **Trunk o'chirish uchun UI yo'q.** `deleteSipAccount` endpoint va
    `api.deleteSipAccount()` bor, lekin interfeysda tugma yo'q → 9 dublikatni
    foydalanuvchi o'zi tozalay olmaydi.

18. **`loadSipSettings` `data[0]` ni oladi** — 9 dublikat orasidan tasodifiy
    birinchisi (qaysi biri `FAIL_WAIT`, qaysi biri ishlaydi — noma'lum).

19. **Har 30 soniyada FAILED trunk'lar uchun `sofia profile external rescan`**
    (`RegistrationManager`) — 9 trunk bilan juda shovqinli, keraksiz yuk.

20. **Eski `/api/v1/calls` (`CallController`) hali mavjud** — frontend endi
    `/call-sessions`dan o'qiydi, eski `calls` jadvalidagi tarix ko'rinmaydi.
    Ikkita parallel jadval (`calls` va `call_sessions`) — konsolidatsiya kerak.

---

## Muhim texnik eslatmalar (keyingi ish uchun)

- **Gateway nomi = `SipAccount.getId()` (UUID)**, `username` emas. Bu
  `FreeSwitchGatewayFileWriter`da shunday, va `FreeSwitchEventListener`
  (`sofia::gateway_state`) ham ID bo'yicha qidiradi. `unregister` faqat shu
  qoidani buzyapti (5-band).
- **FreeSWITCH ichki domeni = konteyner IP'si** (hozir `172.20.0.3`,
  `vars.xml`: `domain=$${local_ip_v4}`). Konteyner qayta yaratilsa
  **o'zgaradi** — hech qayerda qattiq kodlanmasin.
- **Deploy tartibi (bugungi saboq):** `backend`/`freeswitch`/`frontend`
  qayta yaratilgandan keyin **albatta `docker compose restart proxy tunnel`** —
  aks holda nginx eski IP'ni keshlab, 502 beradi; tunnel esa proxy tarmog'ida
  bo'lgani uchun 530 beradi.
- **nginx `/ws/sip` → `https://freeswitch:7443`** (WSS, TLS bilan) bo'lishi
  SHART. `ws://...:5066`ga yuborilsa, brauzer `Via: WSS` deb e'lon qilgani
  uchun FreeSWITCH REGISTER'ni jimgina tashlab yuboradi ("Request Timeout").
- **ESL paroli** `.env` → `FREESWITCH_ESL_PASSWORD`, ikkala konteynerda bir xil.
  fs_cli: `fs_cli -p <parol> -x "<buyruq>"`.
- **Foydali tekshiruv buyruqlari:**
  ```
  fs_cli -x "sofia status"                        # gateway/profil holati
  fs_cli -x "sofia status profile internal reg"   # brauzer ro'yxatdan o'tganmi
  fs_cli -x "sofia_contact 2001@172.20.0.3"       # originate uchun dial-string
  ```

## Tavsiya etilgan tartib

1. **Darhol:** 9 dublikat trunk'ni tozalash (operator ustidagi yukni
   to'xtatadi) — 3-band. Buning uchun avval 5-bandni (killgw) tuzatish kerak.
2. **Qo'ng'iroq ishlashi uchun:** 1 va 2-band (originate A-leg va B-leg).
3. **Xavfsizlik:** 4-band (`caller` tekshiruvi).
4. **Sifat:** 6, 7, 9-11 (hangup buyrug'i, davomiylik, tarix ma'lumotlari).
5. **Qolganlari** — 12-20.

⚠️ **Faza 2 (kiruvchi qo'ng'iroq) hali umuman qurilmagan** — reja
`C:\Users\Windows\.claude\plans\modular-hatching-lagoon.md` faylida
hujjatlashtirilgan, lekin 13-band (Device.status/PresenceManager) hal
bo'lmaguncha boshlab bo'lmaydi.
