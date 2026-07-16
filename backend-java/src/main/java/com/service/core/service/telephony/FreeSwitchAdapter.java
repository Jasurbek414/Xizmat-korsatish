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
    public void makeCall(UUID sessionUuid, String callerExtension, String callee, String gatewayName) {
        if (callerExtension == null || !EXTENSION_PATTERN.matcher(callerExtension).matches()
                || callee == null || !PHONE_PATTERN.matcher(callee).matches()) {
            throw new IllegalArgumentException("Noto'g'ri raqam formati: ESL buyrug'i yuborilmadi");
        }
        if (gatewayName == null || !UUID_PATTERN.matcher(gatewayName).matches()) {
            throw new IllegalArgumentException("Noto'g'ri gateway nomi: ESL buyrug'i yuborilmadi");
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
        String command = String.format(
                "api originate {origination_uuid=%s}user/%s &bridge(sofia/gateway/%s/%s)",
                sessionUuid.toString(), callerExtension, gatewayName, callee);
        executeCommand(command);
    }

    @Override
    public void hangupCall(String channelUuid) {
        executeCommand("api uuid_kill " + channelUuid);
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
