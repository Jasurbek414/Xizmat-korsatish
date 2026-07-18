package com.service.core.service.telephony;

import com.service.core.model.SipAccount;
import com.service.core.repository.SipAccountRepository;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * FreeSWITCH ESL'ga doimiy ulanib turadigan hodisa tinglovchisi.
 *
 * Bu klass mavjud bo'lishidan oldin backend qo'ng'iroq holati haqida hech
 * qachon FreeSWITCH'ning o'zidan avtoritativ ma'lumot olmagan - hammasi
 * faqat brauzerdan kelgan ANSWER/HANGUP xabariga bog'liq edi. Agar uzoq
 * tomon (mijoz) birinchi trubkani qo'ysa yoki brauzer tab kutilmaganda
 * yopilsa, sessiya hech qachon yopilmay "osilib" qolardi. Endi bu tinglovchi
 * FreeSWITCH'ning haqiqiy CHANNEL_BRIDGE/CHANNEL_HANGUP(_COMPLETE) va
 * sofia::gateway_state hodisalarini o'qib, TelephonyService/RegistrationManager
 * holatini haqiqiy manbadan yangilaydi. CHANNEL_ANSWER emas, CHANNEL_BRIDGE
 * ishlatiladi - operatorning ICHKI (WebRTC) leg'i deyarli DARHOL avtomatik
 * javob berganidan keyin ham, tashqi mijoz hali javob bermagan bo'lishi
 * mumkin; CHANNEL_BRIDGE esa faqat ikkala oyoq haqiqatan birlashganda keladi.
 *
 * Bu ulanish FreeSwitchAdapter'ning buyruq yuboruvchi executor'idan ALOHIDA,
 * o'zining maxsus oqimida ishlaydi - shunga ko'ra bittasi osilib qolsa
 * ikkinchisiga ta'sir qilmaydi.
 *
 * Jonli FreeSWITCH serverida (haqiqiy SIP trunk bilan) tekshirilgan va
 * tasdiqlangan: "Event-Name"/"Event-Subclass"/"Gateway"/"State" sarlavhalari,
 * Content-Length asosidagi tana qatorlarini qayta ishlash, va status
 * o'zgarishi (masalan REGISTERING -> FAILED) haqiqatan ham RegistrationManager
 * orqali bazaga to'g'ri yozilishi - barchasi jonli sinovda ko'rilgan.
 *
 * Muhim topilma (tuzatilgan): gateway "name" atributi FreeSwitchGatewayFileWriter
 * tomonidan har doim SipAccount.id (UUID) sifatida yoziladi - shuning uchun
 * bu yerda "Gateway" sarlavhasi ID sifatida (username emas) qidirilishi SHART
 * (avval username bo'yicha qidirilgani uchun holat hech qachon yangilanmasdi).
 */
@Component
public class FreeSwitchEventListener {

    private static final Logger log = LoggerFactory.getLogger(FreeSwitchEventListener.class);
    private static final int RECONNECT_DELAY_MS = 3000;
    private static final int CONNECT_TIMEOUT_MS = 5000;

    @Value("${freeswitch.esl.host:freeswitch}")
    private String eslHost;

    @Value("${freeswitch.esl.port:8021}")
    private int eslPort;

    @Value("${freeswitch.esl.password:ClueCon}")
    private String eslPassword;

    private final TelephonyService telephonyService;
    private final RegistrationManager registrationManager;
    private final SipAccountRepository sipAccountRepository;

    private volatile boolean running = true;
    private volatile Socket currentSocket;
    private Thread listenerThread;

    public FreeSwitchEventListener(TelephonyService telephonyService,
                                    RegistrationManager registrationManager,
                                    SipAccountRepository sipAccountRepository) {
        this.telephonyService = telephonyService;
        this.registrationManager = registrationManager;
        this.sipAccountRepository = sipAccountRepository;
    }

    @PostConstruct
    public void start() {
        listenerThread = new Thread(this::runLoop, "freeswitch-esl-event-listener");
        listenerThread.setDaemon(true);
        listenerThread.start();
    }

    @PreDestroy
    public void stop() {
        running = false;
        Socket socket = currentSocket;
        if (socket != null) {
            try {
                socket.close();
            } catch (IOException ignored) {
                // Yopilayotganda xatolik muhim emas.
            }
        }
        if (listenerThread != null) {
            listenerThread.interrupt();
        }
    }

    private void runLoop() {
        while (running) {
            try {
                connectAndListen();
            } catch (Exception e) {
                if (running) {
                    log.warn("FreeSWITCH ESL hodisa oqimi uzildi, {} ms dan keyin qayta ulanamiz: {}",
                            RECONNECT_DELAY_MS, e.getMessage());
                }
            }
            if (running) {
                sleepQuietly(RECONNECT_DELAY_MS);
            }
        }
    }

    private void connectAndListen() throws IOException {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(eslHost, eslPort), CONNECT_TIMEOUT_MS);
            socket.setSoTimeout(0); // Uzoq muddatli tinglash oqimi - o'qishda timeout bo'lmasligi kerak.
            currentSocket = socket;

            InputStream in = new BufferedInputStream(socket.getInputStream());
            PrintWriter writer = new PrintWriter(
                    new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.UTF_8), true);

            Map<String, String> banner = readEventBlock(in);
            if (!"auth/request".equals(banner.get("Content-Type"))) {
                throw new IOException("Kutilmagan ESL banner: " + banner);
            }

            writer.print("auth " + eslPassword + "\n\n");
            writer.flush();
            Map<String, String> authReply = readEventBlock(in);
            String replyText = authReply.get("Reply-Text");
            if (replyText == null || !replyText.startsWith("+OK")) {
                throw new IOException("FreeSWITCH ESL autentifikatsiyasi rad etildi");
            }

            // MUHIM (audit: 8-band): "haqiqiy javob" endi CHANNEL_ANSWER
            // (operatorning ICHKI leg'i - WebRTC brauzer avtomatik javob
            // bergani uchun deyarli DARHOL keladi, tashqi tomon hali
            // jiringlab turgan bo'lsa ham) emas, CHANNEL_BRIDGE orqali
            // aniqlanadi - bu hodisa faqat ikkala oyoq (operator VA tashqi
            // mijoz) haqiqatan bog'langanda keladi.
            writer.print("event plain CHANNEL_BRIDGE CHANNEL_HANGUP CHANNEL_HANGUP_COMPLETE CHANNEL_PARK "
                    + "CUSTOM sofia::register sofia::register_failure sofia::gateway_state\n\n");
            writer.flush();
            readEventBlock(in); // "event" buyrug'iga +OK javobi.

            log.info("FreeSWITCH ESL hodisa oqimi muvaffaqiyatli ulandi ({}:{})", eslHost, eslPort);

            while (running) {
                Map<String, String> event = readEventBlock(in);
                if (event == null) {
                    // EOF - socket masofadan yopildi, tashqi runLoop qayta ulanadi.
                    break;
                }
                if (!event.isEmpty()) {
                    handleEvent(event);
                }
            }
        } finally {
            currentSocket = null;
        }
    }

    /**
     * ESL "plain" formatidagi bitta hodisa blokini o'qiydi: sarlavhalarni
     * bo'sh qatorgacha o'qiydi; "Content-Length" mavjud bo'lsa mos tanani
     * ham o'qib, agar u "Key: Value" formatida bo'lsa, xuddi shu xaritaga
     * qo'shib qo'yadi (ko'p CUSTOM hodisalarning tanasi shunday keladi).
     *
     * MUHIM (audit'da topilgan bayt/belgi xatosi, tuzatildi): "Content-Length"
     * ESL protokolida HAR DOIM BAYT sonini bildiradi. Avvalgi kod
     * BufferedReader (belgi asosida, UTF-8 dekodlangan) orqali xuddi shu
     * sonni CHAR sifatida o'qirdi - agar tana ichida biror ko'p-baytli UTF-8
     * belgisi (masalan kiril harflar bilan qurilma/mijoz nomi) uchrasa, bu
     * chegaradan chiqib ketib, oqimdagi KEYINGI hodisa sarlavhalarini butunlay
     * buzib yuborishi mumkin edi. Endi butun ulanish xom BAYT darajasida
     * o'qiladi (qatorlar ham, tana ham) va faqat oxirida UTF-8 sifatida
     * dekodlanadi - bayt/belgi chegarasi hech qachon adashmaydi.
     */
    private Map<String, String> readEventBlock(InputStream in) throws IOException {
        Map<String, String> headers = new HashMap<>();
        String line;
        boolean anyHeaderLine = false;
        while ((line = readLine(in)) != null && !line.isEmpty()) {
            anyHeaderLine = true;
            int idx = line.indexOf(':');
            if (idx > 0) {
                headers.put(line.substring(0, idx).trim(), line.substring(idx + 1).trim());
            }
        }
        if (line == null && !anyHeaderLine && headers.isEmpty()) {
            return null; // EOF - hech qanday sarlavha o'qilmadi (ulanish yopildi).
        }

        String contentLengthStr = headers.get("Content-Length");
        if (contentLengthStr != null) {
            try {
                int contentLength = Integer.parseInt(contentLengthStr.trim());
                byte[] body = in.readNBytes(contentLength);
                String bodyStr = new String(body, StandardCharsets.UTF_8);
                for (String bodyLine : bodyStr.split("\n")) {
                    int idx = bodyLine.indexOf(':');
                    if (idx > 0) {
                        String key = bodyLine.substring(0, idx).trim();
                        // ESL "plain" formatida qiymatlar URL-encode qilingan bo'lishi
                        // mumkin (masalan "sofia%3A%3Agateway_state") - shuning uchun
                        // har doim dekodlaymiz (encode qilinmagan qiymat uchun bu no-op).
                        String rawValue = bodyLine.substring(idx + 1).trim();
                        String value;
                        try {
                            value = java.net.URLDecoder.decode(rawValue, StandardCharsets.UTF_8);
                        } catch (IllegalArgumentException e) {
                            value = rawValue;
                        }
                        headers.put(key, value);
                    }
                }
            } catch (NumberFormatException ignored) {
                // Content-Length raqam sifatida o'qilmasa - tanani e'tiborsiz qoldiramiz.
            }
        }
        return headers;
    }

    /** Bitta qatorni XOM BAYT darajasida o'qiydi (LF'gacha, CR olib tashlanadi), faqat oxirida UTF-8 dekodlaydi. */
    private String readLine(InputStream in) throws IOException {
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        int b = in.read();
        if (b == -1) {
            return null;
        }
        while (b != -1 && b != '\n') {
            if (b != '\r') {
                buf.write(b);
            }
            b = in.read();
        }
        return buf.toString(StandardCharsets.UTF_8);
    }

    private void handleEvent(Map<String, String> event) {
        String eventName = event.get("Event-Name");
        if (eventName == null) return;

        try {
            switch (eventName) {
                case "CHANNEL_BRIDGE" -> {
                    // Operatorning ICHKI leg'i (brauzer/WebRTC) odatda DARHOL
                    // avtomatik javob beradi - tashqi mijoz hali jiringlab
                    // turgan bo'lsa ham. Shuning uchun haqiqiy "javob berildi"
                    // daqiqasi CHANNEL_ANSWER emas, aynan CHANNEL_BRIDGE - u
                    // faqat ikkala oyoq (operator VA tashqi mijoz) haqiqatan
                    // birlashtirilganda keladi (audit: 8-band).
                    UUID sessionUuid = resolveSessionUuid(event);
                    if (sessionUuid != null) {
                        telephonyService.answerCall(sessionUuid);
                    }
                }
                case "CHANNEL_PARK" -> {
                    // KIRUVCHI qo'ng'iroq: tashqi mijoz kompaniya raqamiga qo'ng'iroq
                    // qildi, dialplan uni "public" kontekstда park qildi. Endi backend
                    // kompaniyani aniqlab, onlayn operator(lar)ning brauzeriga ulaydi.
                    // Faqat KIRUVCHI (inbound) leg'larni ishlaymiz - chiquvchi
                    // qo'ng'iroqlarda park bo'lmaydi.
                    String direction = event.get("Call-Direction");
                    if (!"inbound".equals(direction)) break;
                    String channelUuid = event.get("Unique-ID");
                    String destination = event.get("Caller-Destination-Number");
                    String caller = event.get("Caller-Caller-ID-Number");
                    if (channelUuid != null && destination != null) {
                        telephonyService.handleIncomingCall(destination, caller, channelUuid);
                    }
                }
                case "CHANNEL_HANGUP", "CHANNEL_HANGUP_COMPLETE" -> {
                    UUID sessionUuid = resolveSessionUuid(event);
                    if (sessionUuid != null) {
                        telephonyService.endCall(sessionUuid, event.getOrDefault("Hangup-Cause", "NORMAL_CLEARING"));
                    }
                }
                case "CUSTOM" -> handleCustomEvent(event);
                default -> { /* qolgan hodisalar hozircha e'tiborga olinmaydi */ }
            }
        } catch (Exception e) {
            log.warn("Telephony hodisasi ('{}') qayta ishlanmadi: {}", eventName, e.getMessage());
        }
    }

    private void handleCustomEvent(Map<String, String> event) {
        String subclass = event.get("Event-Subclass");
        if (!"sofia::gateway_state".equals(subclass)) {
            // sofia::register / sofia::register_failure - bular INBOUND
            // (boshqa qurilmalar FreeSWITCH'ga ro'yxatdan o'tishi) uchun,
            // bizning trunk (gateway) holatimizga aloqasi yo'q - e'tiborga olinmaydi.
            return;
        }

        String gatewayName = event.get("Gateway");
        String state = event.get("State");
        if (gatewayName == null || state == null) return;

        // MUHIM: FreeSwitchGatewayFileWriter gateway "name" atributi sifatida
        // har doim SipAccount.id'ni (UUID) yozadi, username'ni EMAS (jonli testda
        // "findByUsername(gatewayName)" hech qachon mos kelmasligi - status doim
        // "REGISTERING"da qolib ketishi sifatida aniqlangan xato edi). Shu bilan
        // izchil bo'lish uchun bu yerda ID orqali qidiramiz.
        UUID sipAccountId;
        try {
            sipAccountId = UUID.fromString(gatewayName);
        } catch (IllegalArgumentException e) {
            // Bizning tizimimiz yozmagan boshqa gateway (masalan vanilla
            // "example.com" namunasi) - e'tiborga olinmaydi.
            return;
        }

        Optional<SipAccount> accountOpt = sipAccountRepository.findById(sipAccountId);
        if (accountOpt.isEmpty()) {
            log.warn("sofia::gateway_state: '{}' ID'li SipAccount topilmadi", gatewayName);
            return;
        }

        SipAccount account = accountOpt.get();
        String mappedStatus = switch (state) {
            case "REGED" -> "REGISTERED";
            case "TRYING", "REGISTER" -> "REGISTERING";
            case "FAILED", "FAIL_WAIT", "TIMEOUT", "NOREG" -> "FAILED";
            default -> "UNREGISTERED";
        };
        registrationManager.updateStatus(account.getId(), mappedStatus, "FAILED".equals(mappedStatus) ? state : null);
    }

    private UUID resolveSessionUuid(Map<String, String> event) {
        String uniqueId = event.get("Unique-ID");
        if (uniqueId != null) {
            try {
                return UUID.fromString(uniqueId);
            } catch (IllegalArgumentException ignored) {
                // Kutilmagan format - pastdagi zaxira maydonga o'tamiz.
            }
        }
        String originationUuid = event.get("variable_origination_uuid");
        if (originationUuid != null) {
            try {
                return UUID.fromString(originationUuid);
            } catch (IllegalArgumentException ignored) {
                // Ikkalasi ham topilmasa - bu hodisa bizning sessiyalarimizga aloqasi yo'q.
            }
        }
        return null;
    }

    private void sleepQuietly(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
