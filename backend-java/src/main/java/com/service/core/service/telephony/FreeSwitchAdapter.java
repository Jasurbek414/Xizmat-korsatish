package com.service.core.service.telephony;

import com.service.core.model.SipAccount;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.*;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Pattern;

@Service
public class FreeSwitchAdapter implements SIPAdapter {

    private static final Logger log = LoggerFactory.getLogger(FreeSwitchAdapter.class);

    // Buyruqqa in'ektsiya oldini olish uchun ikkinchi (himoya qatlami) tekshiruv -
    // birinchi tekshiruv TelephonyService.initiateCall'da, chaqiruvchi hali ham
    // shu adapterni to'g'ridan-to'g'ri chaqirishi mumkin bo'lgani uchun bu yerda ham takrorlanadi.
    private static final Pattern PHONE_PATTERN = Pattern.compile("^[0-9+*#]{1,20}$");

    // Extension raqami ham xuddi shu qoidaga bo'ysunadi (faqat raqamlar).
    private static final Pattern EXTENSION_PATTERN = PHONE_PATTERN;

    // Gateway nomi har doim SipAccount.getId().toString() (UUID) - qat'iy UUID
    // formatini tekshirish orqali ESL buyrug'iga in'ektsiya qilinishining
    // oldini olamiz.
    private static final Pattern UUID_PATTERN = Pattern.compile(
            "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$");

    // Chiquvchi caller ID (trunk username, masalan "101") - ESL buyrug'iga
    // in'ektsiya qilinishining oldini olish uchun faqat xavfsiz belgilar.
    private static final Pattern CALLER_ID_PATTERN = Pattern.compile("^[a-zA-Z0-9._+-]{1,64}$");

    // Kiruvchi qo'ng'iroq bridge dial-string, masalan "user/2001,user/2002" -
    // faqat "user/<raqam>" (vergul bilan ajratilgan) ko'rinishida ruxsat etamiz
    // (ESL in'ektsiyasi va faqat ICHKI extension'larga ulanishini kafolatlash).
    private static final Pattern BRIDGE_TARGET_PATTERN = Pattern.compile("^(user/[0-9]{1,15})(,user/[0-9]{1,15})*$");

    private static final int CONNECT_TIMEOUT_MS = 5000;
    private static final int READ_TIMEOUT_MS = 8000;

    @Value("${freeswitch.esl.host:freeswitch}")
    private String eslHost;

    @Value("${freeswitch.esl.port:8021}")
    private int eslPort;

    @Value("${freeswitch.esl.password:ClueCon}")
    private String eslPassword;

    // Yagona-oqimli executor o'rniga kichik belgilangan pool - bitta osilib
    // qolgan ESL buyrug'i (masalan FreeSWITCH javob bermay qolsa) butun
    // telefoniya tizimidagi barcha keyingi buyruqlarni cheksiz bloklamasligi
    // uchun (socket timeout bilan birga ishlaydi).
    private final ExecutorService executor = Executors.newFixedThreadPool(4);

    @Override
    public void register(SipAccount account) {
        // Sofia profile rescan to register configured gateways
        executeCommand("api sofia profile external rescan");
    }

    @Override
    public void unregister(SipAccount account) {
        // MUHIM (audit'da topilgan xato): gateway nomi HAR DOIM
        // account.getId() (UUID) - FreeSwitchGatewayFileWriter shunday
        // yozadi. Bu yerda oldin account.getUsername() ishlatilgani uchun
        // killgw hech qachon to'g'ri nishonga urmagan (trunk o'chirilgach
        // ham FreeSWITCH'da ro'yxatdan o'tishda davom etardi).
        String gatewayName = account.getId().toString();
        executeCommand("api sofia profile external killgw " + gatewayName);
    }

    @Override
    public void makeCall(UUID sessionUuid, String callerExtension, String callee, String gatewayName, String callerIdNumber) {
        if (callerExtension == null || !EXTENSION_PATTERN.matcher(callerExtension).matches()
                || callee == null || !PHONE_PATTERN.matcher(callee).matches()) {
            throw new IllegalArgumentException("Noto'g'ri raqam formati: ESL buyrug'i yuborilmadi");
        }
        if (gatewayName == null || !UUID_PATTERN.matcher(gatewayName).matches()) {
            throw new IllegalArgumentException("Noto'g'ri gateway nomi: ESL buyrug'i yuborilmadi");
        }
        if (callerIdNumber == null || !CALLER_ID_PATTERN.matcher(callerIdNumber).matches()) {
            throw new IllegalArgumentException("Noto'g'ri caller ID: ESL buyrug'i yuborilmadi");
        }

        // MUHIM (audit'da topilgan ikkita xato):
        // 1) A-leg operatorning ICHKI extensioniga "sofia/internal/<ext>" deb
        //    emas, "user/<ext>" (directory dial-string) orqali qo'ng'iroq
        //    qilinishi kerak - ro'yxatdan o'tgan WebRTC/WSS mijozining haqiqiy
        //    "sofia_contact" manzili tasodifiy (.invalid) domen va boshqa
        //    parametrlar bilan keladi, "sofia/internal/<ext>" bunga to'g'ri
        //    kelmaydi (jonli tekshiruvda tasdiqlangan).
        // 2) B-leg (tashqi raqam) UzTelecom'ga trunk hisobisiz to'g'ridan-to'g'ri
        //    emas, "sofia/gateway/<gatewayName>/<callee>" orqali - shundagina
        //    haqiqiy trunk (login/parol) autentifikatsiyasi ishlatiladi.
        //
        // MUHIM (jonli sinovda bosqichma-bosqich aniqlangan asosiy MEDIA xatosi):
        // Avval "originate BRAUZER &bridge(TRUNK)" tartibi ishlatilardi - ya'ni
        // brauzer A-leg AVVAL javob berardi, keyin trunk chaqirilardi. Bu holatda
        // UzTelecom trunk'ga INVITE ketardi, u 183 (early media) qaytarardi,
        // lekin brauzerning WebRTC DTLS-SRTP media'si ~1.8 soniyada tayyor
        // bo'lgani uchun FreeSWITCH shu vaqt ichida UzTelecom'ga RTP yubormasdi,
        // UzTelecom esa media kutib, olmagach qo'ng'iroqni HAR DOIM "503 Service
        // Unavailable" bilan tashlardi (jonli logda: 183 -> 1.8s -> 503).
        // Kodek (ko'p kodek), From domeni (101@84.54.75.26) tuzatilsa ham 503
        // saqlanardi - chunki sabab media TARTIBIDA edi.
        //
        // YAKUNIY TO'G'RI YECHIM (jonli, bosqichma-bosqich izolyatsiya bilan):
        //  503 SABABI: brauzer (WebRTC) trunk'ga u hali JIRINGLAYOTGANDA (183
        //  early media) BRIDGE qilinsa, UzTelecom IPBX aniq ~1.8 soniyada "503
        //  Service Unavailable" beradi. Kodek, From domeni, ignore_early_media,
        //  consume_media, send_silence, instant_ringback, sleep - HECH BIRI
        //  yordam bermadi (barchasi jonli sinovda tekshirildi). To'g'ridan-to'g'ri
        //  "&echo"/"&park" (trunk JAVOB bergandan keyin media) ISHLAYDI.
        //
        //  YECHIM: AVVAL TRUNK originate qilinadi. Trunk jiringlayotganda
        //  FreeSWITCH uni o'zi boshqaradi (bridge YO'Q -> 503 YO'Q). Trunk
        //  HAQIQATAN JAVOB berganda (200 OK) "trunk_answered" dialplaniga
        //  tushadi va brauzerga (user/<ext>) bridge qilinadi. Bridge faqat
        //  JAVOBdan keyin bo'lgani uchun UzTelecom 503 bermaydi.
        //  origination_uuid trunk oyog'ida (sessiya boshqaruvi); operator_ext -
        //  dialplan brauzerga ulanish uchun ishlatadigan o'zgaruvchi.
        // call_timeout=60: tashqi raqam 60 soniya javob bermasa qo'ng'iroq
        // avtomatik tugaydi (cheksiz jiringlamaydi). continue_on_fail=false va
        // hangup_after_bridge=true dialplan faylida.
        //
        // MUHIM (jonli sinovda aniqlangan ASOSIY sabab - 2026-07-18):
        // Chiquvchi caller ID ko'rsatilmasa, FreeSWITCH UzTelecom'ga
        // "Remote-Party-ID: 0000000000" (bo'sh) yuboradi va UzTelecom IPBX
        // qo'ng'iroqni HAR DOIM "503 Service Unavailable" (X-Asterisk-HangupCause:
        // Circuit/channel congestion, Q.850 cause=34) bilan ~1.8 soniyada RAD
        // ETADI. YECHIM: origination_caller_id_number ni trunk hisob username'iga
        // (masalan "101") o'rnatamiz - shundagina UzTelecom qabul qiladi (jonli
        // sinovda tasdiqlangan: 0000000000 -> 503; 101 -> 180 Ringing, javob).
        // sip_cid_type=rpid: caller ID Remote-Party-ID sifatida yuboriladi.
        //
        // "bgapi" (api emas): originate FONDA (alohida FreeSWITCH threadida)
        // bajariladi va ESL soketi yopilishidan MUSTAQIL - "api" bo'lsa
        // executeCommand javobni kutmasdan soketni yopib, uzun originate'ni
        // yarim yo'lda uzib qo'yishi mumkin edi. Natija (javob/xato) esa
        // FreeSwitchEventListener orqali (CHANNEL_BRIDGE/HANGUP) keladi.
        String command = String.format(
                "bgapi originate {origination_uuid=%s,operator_ext=%s,call_timeout=60,"
                        + "origination_caller_id_number=%s,origination_caller_id_name=%s,sip_cid_type=rpid}"
                        + "sofia/gateway/%s/%s bridge_to_operator XML trunk_answered",
                sessionUuid.toString(), callerExtension, callerIdNumber, callerIdNumber, gatewayName, callee);
        log.info("makeCall originate yuborilmoqda: callee={}, callerId={}, operatorExt={}, gateway={}",
                callee, callerIdNumber, callerExtension, gatewayName);
        executeCommand(command);
    }

    @Override
    public void hangupCall(String channelUuid) {
        executeCommand("api uuid_kill " + channelUuid);
    }

    @Override
    public void bridgeIncomingCall(String channelUuid, String bridgeTarget) {
        if (channelUuid == null || !UUID_PATTERN.matcher(channelUuid).matches()) {
            throw new IllegalArgumentException("Noto'g'ri kanal UUID: bridge yuborilmadi");
        }
        if (bridgeTarget == null || !BRIDGE_TARGET_PATTERN.matcher(bridgeTarget).matches()) {
            throw new IllegalArgumentException("Noto'g'ri bridge target: bridge yuborilmadi");
        }
        // Park qilingan kiruvchi qo'ng'iroqni operator(lar)ning brauzeriga ulaymiz.
        // uuid_transfer '<app>:<args>' inline -> park holatidagi leg AYNAN shu app'ni
        // (bridge) darhol bajaradi. Bir nechta operator vergul bilan berilsa - bir
        // vaqtda jiringlaydi, birinchi javob bergan ulanadi (hangup_after_bridge
        // standart - operator tugatsa qo'ng'iroq yopiladi).
        String command = String.format("bgapi uuid_transfer %s 'bridge:%s' inline", channelUuid, bridgeTarget);
        log.info("Kiruvchi qo'ng'iroq bridge: channel={}, target={}", channelUuid, bridgeTarget);
        executeCommand(command);
    }

    @Override
    public String getAdapterName() {
        return "FreeSWITCH B2BUA Adapter";
    }

    @Override
    public void reloadDirectory() {
        // Butun XML konfiguratsiya daraxtini (directory, dialplan, profillar
        // ro'yxati) qayta yuklaydi - faol qo'ng'iroqlarga ta'sir qilmaydi,
        // sofia profillarining o'zini qayta ishga tushirmaydi.
        executeCommand("api reloadxml");
    }

    @Override
    public String queryRegistrationStatus(String gatewayName) {
        if (gatewayName == null || !UUID_PATTERN.matcher(gatewayName).matches()) {
            return null;
        }
        // FreeSWITCH'ning HAQIQIY holatini to'g'ridan-to'g'ri so'raymiz - bu
        // hodisaga (sofia::gateway_state) bog'liq emas, shuning uchun trunk
        // listener ulanmasdan oldin ro'yxatdan o'tgan bo'lsa ham (hodisa
        // o'tkazib yuborilgan bo'lsa ham) holat har doim to'g'ri bo'ladi.
        String response = executeApiCommandWithResponse("api sofia status gateway " + gatewayName);
        if (response == null) {
            return null;
        }
        // Javobda "State   \tREGED" kabi qator bo'ladi. Har bir qatorni tekshiramiz.
        for (String line : response.split("\n")) {
            String trimmed = line.trim();
            if (trimmed.startsWith("State")) {
                String[] parts = trimmed.split("\\s+");
                if (parts.length >= 2) {
                    return mapGatewayState(parts[parts.length - 1]);
                }
            }
        }
        // "Invalid Gateway!" - FreeSWITCH bu gateway'ni umuman bilmaydi.
        return "UNREGISTERED";
    }

    private String mapGatewayState(String state) {
        return switch (state) {
            case "REGED" -> "REGISTERED";
            case "TRYING", "REGISTER", "UNREGED" -> "REGISTERING";
            case "FAILED", "FAIL_WAIT", "TIMEOUT" -> "FAILED";
            default -> "UNREGISTERED";
        };
    }

    /**
     * ESL "api" buyrug'ini SINXRON yuboradi va javob tanasini qaytaradi.
     * executeCommand()'dan farqi: bu javobni kutadi va o'qiydi (holatni
     * so'rash uchun kerak). Xato bo'lsa null qaytaradi.
     */
    private String executeApiCommandWithResponse(String command) {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(eslHost, eslPort), CONNECT_TIMEOUT_MS);
            socket.setSoTimeout(READ_TIMEOUT_MS);

            try (BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream()));
                 PrintWriter writer = new PrintWriter(new OutputStreamWriter(socket.getOutputStream()), true)) {

                String line;
                while ((line = reader.readLine()) != null) {
                    if (line.startsWith("Content-Type: auth/request")) {
                        break;
                    }
                }

                writer.print("auth " + eslPassword + "\n\n");
                writer.flush();

                boolean authOk = false;
                while ((line = reader.readLine()) != null) {
                    if (line.startsWith("Reply-Text: +OK")) {
                        authOk = true;
                        break;
                    }
                }
                if (!authOk) {
                    log.warn("FreeSWITCH ESL autentifikatsiyasi muvaffaqiyatsiz tugadi (status so'rovi)");
                    return null;
                }

                writer.print(command + "\n\n");
                writer.flush();

                // "api" javobi: Content-Type: api/response, Content-Length: N,
                // bo'sh qator, keyin N BAYT tana.
                int contentLength = -1;
                while ((line = reader.readLine()) != null && !line.isEmpty()) {
                    if (line.toLowerCase().startsWith("content-length:")) {
                        try {
                            contentLength = Integer.parseInt(line.substring(line.indexOf(':') + 1).trim());
                        } catch (NumberFormatException ignored) {
                            // e'tiborsiz
                        }
                    }
                }
                if (contentLength <= 0) {
                    return null;
                }
                char[] body = new char[contentLength];
                int total = 0;
                while (total < contentLength) {
                    int n = reader.read(body, total, contentLength - total);
                    if (n == -1) break;
                    total += n;
                }
                return new String(body, 0, total);
            }
        } catch (Exception e) {
            log.warn("FreeSWITCH ESL status so'rovi bajarilmadi: {}", e.getMessage());
            return null;
        }
    }

    private void executeCommand(String command) {
        executor.submit(() -> {
            try (Socket socket = new Socket()) {
                socket.connect(new InetSocketAddress(eslHost, eslPort), CONNECT_TIMEOUT_MS);
                socket.setSoTimeout(READ_TIMEOUT_MS);

                try (BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream()));
                     PrintWriter writer = new PrintWriter(new OutputStreamWriter(socket.getOutputStream()), true)) {

                    String line;
                    while ((line = reader.readLine()) != null) {
                        if (line.startsWith("Content-Type: auth/request")) {
                            break;
                        }
                    }

                    writer.print("auth " + eslPassword + "\n\n");
                    writer.flush();

                    boolean authOk = false;
                    while ((line = reader.readLine()) != null) {
                        if (line.startsWith("Reply-Text: +OK")) {
                            authOk = true;
                            break;
                        }
                    }

                    if (authOk) {
                        writer.print(command + "\n\n");
                        writer.flush();
                        // MUHIM: buyruq javobini O'QIYMIZ va shundan keyingina soketni
                        // yopamiz - aks holda FreeSWITCH buyruqni (ayniqsa "bgapi")
                        // to'liq qabul qilishidan oldin soket yopilib qolishi mumkin
                        // edi. Javobda "bgapi" uchun Job-UUID keladi - uni loglaymiz
                        // (originate haqiqatan yuborilganini diagnostika qilish uchun).
                        StringBuilder reply = new StringBuilder();
                        String rl;
                        while ((rl = reader.readLine()) != null) {
                            reply.append(rl).append(' ');
                            if (rl.startsWith("Reply-Text:") || rl.toLowerCase().startsWith("job-uuid:")) {
                                break;
                            }
                            if (reply.length() > 2000) break;
                        }
                        log.info("ESL buyruq bajarildi: '{}' -> {}", command, reply.toString().trim());
                    } else {
                        log.warn("FreeSWITCH ESL autentifikatsiyasi muvaffaqiyatsiz tugadi");
                    }
                }
            } catch (Exception e) {
                log.error("FreeSWITCH ESL command execution failed: {}", e.getMessage());
            }
        });
    }
}
