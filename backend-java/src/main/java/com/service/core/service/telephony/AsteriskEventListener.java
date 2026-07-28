package com.service.core.service.telephony;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;

/**
 * Asterisk ARI'ning WebSocket hodisa oqimiga doimiy ulanib turadi va
 * "telephony-app" Stasis ilovasiga tegishli hodisalarni qayta ishlaydi.
 *
 * FreeSwitchEventListener'dan asosiy farq: bu yerda faqat hodisalarni
 * TelephonyService'ga uzatib qo'yish YETARLI EMAS - chiquvchi/kiruvchi
 * qo'ng'iroqlarni ikkinchi (operator) oyoqqa ulash ORKESTRATSIYASI ham shu
 * yerda amalga oshadi (ilgari FreeSWITCH dialplan fayllari - trunk_answered.xml,
 * public_incoming.xml - bajargan ishning katta qismi endi Java'da, ARI Stasis
 * modeliga mos ravishda).
 *
 * ⚠️ Bu klass hali haqiqiy qo'ng'iroq oqimi bilan (faqat trunk REGISTER'i
 * bilan) sinalmagan - operator ring-group va trunk-first-originate mantig'i
 * 5-bosqichda (haqiqiy UzTelecom qo'ng'irog'i bilan) tasdiqlanishi kerak.
 */
@Component
public class AsteriskEventListener {

    private static final Logger log = LoggerFactory.getLogger(AsteriskEventListener.class);
    private static final String APP_NAME = "telephony-app";
    private static final int RECONNECT_DELAY_MS = 3000;
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final AriClient ariClient;
    private final TelephonyService telephonyService;
    private final AsteriskCallState callState;

    private volatile boolean running = true;
    private volatile WebSocket webSocket;
    private Thread listenerThread;

    public AsteriskEventListener(AriClient ariClient, TelephonyService telephonyService, AsteriskCallState callState) {
        this.ariClient = ariClient;
        this.telephonyService = telephonyService;
        this.callState = callState;
    }

    @PostConstruct
    public void start() {
        listenerThread = new Thread(this::runLoop, "asterisk-ari-event-listener");
        listenerThread.setDaemon(true);
        listenerThread.start();
    }

    @PreDestroy
    public void stop() {
        running = false;
        WebSocket ws = webSocket;
        if (ws != null) {
            ws.abort();
        }
        if (listenerThread != null) {
            listenerThread.interrupt();
        }
    }

    private void runLoop() {
        HttpClient httpClient = HttpClient.newHttpClient();
        while (running) {
            try {
                connectAndListen(httpClient);
            } catch (Exception e) {
                if (running) {
                    log.warn("Asterisk ARI hodisa oqimi uzildi, {} ms dan keyin qayta ulanamiz: {}",
                            RECONNECT_DELAY_MS, e.getMessage());
                }
            }
            if (running) {
                sleepQuietly(RECONNECT_DELAY_MS);
            }
        }
    }

    private void connectAndListen(HttpClient httpClient) throws Exception {
        CompletableFuture<Void> closed = new CompletableFuture<>();
        StringBuilder buffer = new StringBuilder();

        WebSocket.Listener listener = new WebSocket.Listener() {
            @Override
            public CompletionStage<?> onText(WebSocket ws, CharSequence data, boolean last) {
                buffer.append(data);
                if (last) {
                    String message = buffer.toString();
                    buffer.setLength(0);
                    try {
                        handleEvent(MAPPER.readTree(message));
                    } catch (Exception e) {
                        log.warn("ARI hodisasini qayta ishlashda xato: {}", e.getMessage());
                    }
                }
                ws.request(1);
                return null;
            }

            @Override
            public void onOpen(WebSocket ws) {
                log.info("Asterisk ARI hodisa oqimi muvaffaqiyatli ulandi");
                ws.request(1);
            }

            @Override
            public CompletionStage<?> onClose(WebSocket ws, int statusCode, String reason) {
                closed.complete(null);
                return null;
            }

            @Override
            public void onError(WebSocket ws, Throwable error) {
                closed.completeExceptionally(error);
            }
        };

        WebSocket ws = httpClient.newWebSocketBuilder()
                .buildAsync(URI.create(ariClient.eventsWebSocketUrl(APP_NAME)), listener)
                .join();
        this.webSocket = ws;
        closed.join();
    }

    private void handleEvent(JsonNode event) {
        String type = event.path("type").asText("");
        JsonNode channel = event.path("channel");
        String channelId = channel.path("id").asText(null);

        try {
            switch (type) {
                case "StasisStart" -> handleStasisStart(event, channel, channelId);
                case "ChannelStateChange" -> handleChannelStateChange(channel, channelId);
                case "StasisEnd" -> handleStasisEnd(channelId);
                default -> { /* Dial, ChannelEnteredBridge va h.k. hozircha kerak emas */ }
            }
        } catch (Exception e) {
            log.warn("ARI hodisasi ('{}') qayta ishlanmadi: {}", type, e.getMessage());
        }
    }

    /**
     * Yangi kanal Stasis ilovasiga kirdi. "args" faqat shu hodisada keladi -
     * shuning uchun rolni AsteriskCallState'ga yozib qo'yamiz (keyingi
     * ChannelStateChange/StasisEnd hodisalarida qayta o'qish uchun).
     */
    private void handleStasisStart(JsonNode event, JsonNode channel, String channelId) {
        if (channelId == null) return;

        List<String> args = new ArrayList<>();
        event.path("args").forEach(n -> args.add(n.asText()));
        if (args.isEmpty()) return;
        String roleType = args.get(0);

        switch (roleType) {
            case "inbound-trunk" -> {
                // Eski FreeSWITCH CHANNEL_PARK hodisasi bilan bir xil daqiqa -
                // UzTelecom'dan tashqi qo'ng'iroq keldi, Java kompaniya/onlayn
                // operatorlarni aniqlab, bridge qarorini beradi (TelephonyService
                // hech qanday ActiveSession yaratmaydi - bu mavjud FreeSWITCH
                // xatti-harakati bilan bir xil, alohida ma'lum kamchilik: kiruvchi
                // qo'ng'iroqlar CallSession tarixiga yozilmaydi).
                callState.putRole(channelId, "inbound-trunk", null);
                String destination = channel.path("dialplan").path("exten").asText(null);
                String caller = channel.path("caller").path("number").asText(null);
                if (destination != null) {
                    telephonyService.handleIncomingCall(destination, caller, channelId);
                }
            }
            case "operator-leg" -> {
                // AsteriskAdapter.bridgeIncomingCall() bu rolni allaqachon
                // originate qilishdan OLDIN yozib qo'ygan (kiruvchi qo'ng'iroq
                // ring group'i uchun) - qayta yozishning hojati yo'q, faqat
                // chiquvchi qo'ng'iroqdagi operator oyog'i uchun (ChannelStateChange
                // ichida yaratilgani) qo'lda kelgan bo'lsa ham xavfsiz (idempotent).
                if (args.size() > 1) {
                    callState.putRole(channelId, "operator-leg", args.get(1));
                }
            }
            default -> { /* "outbound-trunk" AsteriskAdapter.makeCall()'da oldindan yozilgan */ }
        }
    }

    private void handleChannelStateChange(JsonNode channel, String channelId) {
        if (channelId == null) return;
        if (!"Up".equals(channel.path("state").asText(""))) return;

        AsteriskCallState.ChannelRole role = callState.getRole(channelId);
        if (role == null) return;

        switch (role.type()) {
            case "outbound-trunk" -> handleTrunkLegAnswered(channelId, role.extra());
            case "operator-leg" -> handleOperatorLegAnswered(channelId, role.extra());
            default -> { /* boshqa rollar uchun state-change'ga reaksiya kerak emas */ }
        }
    }

    /**
     * Chiquvchi qo'ng'iroqning trunk oyog'i HAQIQATAN javob berdi (UzTelecom
     * 200 OK). Endi operator (brauzer) oyog'ini originate qilib, bridge
     * yaratamiz - FreeSWITCH'dagi "trunk_answered" dialplan konteksti bajargan
     * ishning ekvivalenti.
     */
    private void handleTrunkLegAnswered(String trunkChannelId, String operatorExtension) {
        if (operatorExtension == null) return;

        String bridgeId = trunkChannelId + "-bridge";
        ariClient.createBridge(bridgeId);
        ariClient.addChannelToBridge(bridgeId, trunkChannelId);

        String opChannelId = trunkChannelId + "-op";
        callState.putRole(opChannelId, "operator-leg", bridgeId);
        ariClient.originate(opChannelId, "PJSIP/" + operatorExtension, APP_NAME,
                "operator-leg," + bridgeId, null, Map.of());
    }

    /**
     * Operator (ichki extension) oyog'i javob berdi - bridge'ga qo'shamiz,
     * ring group qolgan a'zolarini uzamiz, va ota-sessiyani "javob berildi"
     * deb belgilaymiz - FreeSWITCH'dagi CHANNEL_BRIDGE hodisasining
     * ekvivalenti (ikkala oyoq ham HAQIQATAN birlashtirilgandagina keladi).
     *
     * MUHIM (audit'da topilgan xato, tuzatildi): ota-sessiya ID'si avval
     * channelId'ning "-op" SUFFIKSIDAN olinardi - bu FAQAT chiquvchi
     * qo'ng'iroq oqimida ishlaydi (operator kanali AYNAN "&lt;sessionUuid&gt;-op"
     * shaklida). Kiruvchi qo'ng'iroq ring-group'ida operator kanallari
     * "&lt;channelUuid&gt;-op-&lt;extension&gt;" shaklida (AsteriskAdapter.
     * bridgeIncomingCall'ga qarang) - bu suffiks bilan HECH QACHON mos
     * kelmasdi, shuning uchun kiruvchi qo'ng'iroqlar uchun answerCall
     * umuman chaqirilmasdi (backend hech qachon "javob berildi" demasdi).
     * Endi ota-sessiya ID'si BRIDGE NOMIDAN olinadi - bu invariant ikkala
     * oqimda ham izchil: chiquvchi "&lt;sessionUuid&gt;-bridge"
     * (handleTrunkLegAnswered), kiruvchi "&lt;channelUuid&gt;-bridge"
     * (AsteriskAdapter.bridgeIncomingCall) - ikkalasida ham "-bridge"
     * suffiksini olib tashlash to'g'ri ota ID'ni beradi.
     */
    private void handleOperatorLegAnswered(String channelId, String bridgeId) {
        if (bridgeId == null || !bridgeId.endsWith("-bridge")) return;
        ariClient.addChannelToBridge(bridgeId, channelId);

        List<String> siblings = callState.removeRingGroup(bridgeId);
        if (siblings != null) {
            for (String sibling : siblings) {
                if (!sibling.equals(channelId)) {
                    ariClient.hangup(sibling);
                }
            }
        }

        String parentIdStr = bridgeId.substring(0, bridgeId.length() - "-bridge".length());
        try {
            telephonyService.answerCall(UUID.fromString(parentIdStr));
        } catch (IllegalArgumentException ignored) {
            // Nazariy jihatdan bo'lmasligi kerak - "-bridge"dan oldingi qism
            // har doim yo sessionUuid (chiquvchi) yo channelUuid (kiruvchi,
            // ham UUID formatida - Asterisk ARI kanal ID'lari originate
            // qilinganda biz bergan qiymat, ikkalasi ham UUID.toString()).
        }
    }

    private void handleStasisEnd(String channelId) {
        if (channelId == null) return;
        AsteriskCallState.ChannelRole role = callState.removeRole(channelId);

        // Chiquvchi qo'ng'iroqning trunk oyog'i (channelId = sessionUuid) tugadi -
        // FreeSWITCH'dagi CHANNEL_HANGUP/CHANNEL_HANGUP_COMPLETE ekvivalenti.
        try {
            UUID sessionUuid = UUID.fromString(channelId);
            telephonyService.endCall(sessionUuid, "NORMAL_CLEARING");
            return;
        } catch (IllegalArgumentException ignored) {
            // channelId sessionUuid emas - operator/inbound oyog'i, pastga davom etamiz.
        }

        // Ring group a'zosi javob bermay tugagan bo'lsa (masalan boshqa operator
        // javob berdi yoki mijoz kutmay qo'ydi) - ro'yxatdan tozalaymiz.
        if (role != null && role.extra() != null) {
            List<String> siblings = callState.getRingGroup(role.extra());
            if (siblings != null) {
                siblings.remove(channelId);
            }
        }
    }

    private void sleepQuietly(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
