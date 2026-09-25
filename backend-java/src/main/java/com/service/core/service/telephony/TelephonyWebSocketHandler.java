package com.service.core.service.telephony;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.service.core.model.Device;
import com.service.core.repository.DeviceRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class TelephonyWebSocketHandler extends TextWebSocketHandler implements TelephonyEventListener {

    private static final Logger log = LoggerFactory.getLogger(TelephonyWebSocketHandler.class);
    private static final String DEVICE_TYPE_WEBRTC = "WEBRTC";

    private final TelephonyService telephonyService;
    private final TelephonyEventBus eventBus;
    private final PresenceManager presenceManager;
    private final DeviceRepository deviceRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // MUHIM (audit'da topilgan thread-xavfsizlik xatosi): Spring'ning
    // WebSocketSession implementatsiyalari BIR VAQTNING O'ZIDA (concurrent)
    // sendMessage() chaqirilishiga mo'ljallanmagan - eventBus har bir hodisani
    // alohida thread'da (newCachedThreadPool) yuboradi, shu sabab bitta
    // operatorga ikki hodisa (masalan INCOMING va shu ortidan QUEUED) deyarli
    // bir vaqtda kelsa, ikkita thread bitta xom session'ga parallel yozardi -
    // bu xabarni yo'qotishi yoki ulanishni uzib qo'yishi mumkin edi.
    // ConcurrentWebSocketSessionDecorator yozuvlarni ichki navbatga qo'yib,
    // ketma-ket jo'natadi.
    private final Map<UUID, ConcurrentWebSocketSessionDecorator> userSessions = new ConcurrentHashMap<>();

    public TelephonyWebSocketHandler(TelephonyService telephonyService, TelephonyEventBus eventBus,
                                      PresenceManager presenceManager, DeviceRepository deviceRepository) {
        this.telephonyService = telephonyService;
        this.eventBus = eventBus;
        this.presenceManager = presenceManager;
        this.deviceRepository = deviceRepository;
    }

    private UUID companyIdOf(WebSocketSession session) {
        Object companyId = session.getAttributes().get("companyId");
        return companyId == null ? null : UUID.fromString(companyId.toString());
    }

    private UUID userIdOf(WebSocketSession session) {
        Object userId = session.getAttributes().get("userId");
        return userId instanceof UUID ? (UUID) userId : null;
    }

    @PostConstruct
    public void init() {
        eventBus.register(this);
    }

    @PreDestroy
    public void destroy() {
        eventBus.unregister(this);
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        // userId/companyId endi TelephonyHandshakeInterceptor tomonidan JWT'dan
        // tasdiqlangandan keyin session attributlariga yozilgan - bu yerda
        // mijozdan kelgan hech qanday qiymatga ishonilmaydi.
        UUID userId = (UUID) session.getAttributes().get("userId");
        if (userId != null) {
            userSessions.put(userId, new ConcurrentWebSocketSessionDecorator(session, 10_000, 512 * 1024));
            // MUHIM (audit: 13-band, "onlayn holat") - PresenceManager avval
            // hech qayerdan chaqirilmagani uchun har doim "OFFLINE" qaytarardi.
            // Endi operatorning nazorat kanali (/ws/telephony) ulanganda ONLINE,
            // uzilganda OFFLINE deb belgilanadi - bu operatorning haqiqiy
            // tizimga kirgan/chiqqanligini bildiruvchi yagona ishonchli signal.
            presenceManager.setStatus(userId, "ONLINE");
            setDeviceStatus(userId, "ONLINE");
            log.info("Telephony WebSocket established for user: {}", userId);
            // Navbat (queue): operator endi ONLINE - shu kompaniya uchun
            // musiqa bilan kutayotgan qo'ng'iroq bo'lsa, unga ulanishga
            // harakat qilamiz (avval hech qayerdan chaqirilmagani uchun
            // navbatdagi mijoz operator qaytishini "sezmasdi").
            UUID companyId = companyIdOf(session);
            telephonyService.tryServeQueuedCalls(companyId);
        } else {
            session.close(CloseStatus.NOT_ACCEPTABLE);
        }
    }

    private void setDeviceStatus(UUID userId, String status) {
        deviceRepository.findFirstByUserIdAndDeviceType(userId, DEVICE_TYPE_WEBRTC)
                .ifPresent(device -> {
                    device.setStatus(status);
                    deviceRepository.save(device);
                });
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        UUID requestingCompanyId = companyIdOf(session);
        UUID requestingUserId = userIdOf(session);
        if (requestingCompanyId == null || requestingUserId == null) {
            return;
        }

        String payload = message.getPayload();
        Map<String, Object> data = objectMapper.readValue(payload, Map.class);
        String action = (String) data.get("action");

        // Xabar jo'natishning HAMMASI (bu yerdagi PONG/xato javoblari va
        // onEvent()dagi broadcastlar) bitta ConcurrentWebSocketSessionDecorator
        // orqali ketishi shart - xom `session` parametriga to'g'ridan-to'g'ri
        // yozish parallel jo'natishlarni sinxronlamaydi (yuqoridagi izohga qarang).
        ConcurrentWebSocketSessionDecorator outbound = userSessions.get(requestingUserId);

        if ("PING".equals(action)) {
            // Keepalive: mijoz har ~40 soniyada yuboradi (Cloudflare/nginx bo'sh
            // WebSocket'ni ~100 soniyadan keyin uzadi). PONG bilan javob berib,
            // ikki tomonlama trafik hosil qilamiz - shunda control kanali tirik
            // qoladi va DIAL/HANGUP buyruqlari har doim yetib boradi.
            try {
                if (outbound != null) {
                    outbound.sendMessage(new TextMessage("{\"type\":\"PONG\"}"));
                }
            } catch (IOException ignored) {
                // Ulanish yopilgan - mijoz o'zi qayta ulanadi.
            }
            return;
        }

        try {
            if ("DIAL".equals(action)) {
                UUID sipAccountId = UUID.fromString((String) data.get("sipAccountId"));
                String callee = (String) data.get("callee");
                // MUHIM (audit'da topilgan xavfsizlik xatosi): "caller"
                // (extension) mijozdan OLINMAYDI - aks holda operator
                // o'zgacha extension yuborib, boshqa operatorning qurilmasini
                // chaqirib, tashqi raqamga ulab qo'yishi mumkin edi. Extension
                // endi TelephonyService ichida requestingUserId orqali
                // serverning o'zi aniqlaydi.
                telephonyService.initiateCall(sipAccountId, callee, requestingCompanyId, requestingUserId);
            } else if ("HANGUP".equals(action)) {
                UUID sessionUuid = UUID.fromString((String) data.get("callUuid"));
                telephonyService.endCall(sessionUuid, "CANCELLED", requestingCompanyId);
            } else if ("ANSWER".equals(action)) {
                UUID sessionUuid = UUID.fromString((String) data.get("callUuid"));
                telephonyService.answerCall(sessionUuid, requestingCompanyId);
            }
        } catch (Exception e) {
            // Mijoz noto'g'ri/ruxsatsiz so'rov yuborsa - ulanishni uzmasdan, faqat
            // shu amalni rad etamiz va sababini logga yozamiz.
            log.warn("Telephony action '{}' bajarilmadi (company={}): {}", action, requestingCompanyId, e.getMessage());
            // MUHIM: xato haqida SO'ROVCHINING O'ZIGA xabar qaytaramiz - aks
            // holda brauzer UI'si hech qanday javob olmay, abadiy "CONNECTING"
            // holatida qolib ketardi.
            try {
                String errorText = e.getMessage() != null ? e.getMessage() : "Amal bajarilmadi";
                if (outbound != null) {
                    outbound.sendMessage(new TextMessage(objectMapper.writeValueAsString(
                            Map.of("type", "FAILED", "payload", Map.of("message", errorText)))));
                }
            } catch (IOException ignored) {
                // Ulanish yopilgan bo'lsa - xabar yetkazishning iloji yo'q.
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        UUID userId = userIdOf(session);
        if (userId != null) {
            // Faqat SHU ulanishga tegishli yozuvni olib tashlaymiz - agar
            // foydalanuvchi allaqachon YANGI sessiya bilan qayta ulangan bo'lsa
            // (masalan tez qayta ulanish), eski yopilayotgan sessiya yangisini
            // xaritadan o'chirib yubormasin.
            userSessions.computeIfPresent(userId, (id, decorator) ->
                    decorator.getDelegate() == session ? null : decorator);
            presenceManager.setStatus(userId, "OFFLINE");
            setDeviceStatus(userId, "OFFLINE");
        }
    }

    @Override
    public void onEvent(TelephonyEvent event) {
        if (event.getCompanyId() == null) {
            // Kompaniyasi noma'lum hodisa - hech kimga yuborilmaydi (tenant
            // izolyatsiyasini buzmaslik uchun "hammaga translyatsiya" o'rniga
            // xavfsiz tomonda xato qilamiz).
            log.warn("companyId'siz TelephonyEvent e'tiborsiz qoldirildi: {}", event);
            return;
        }

        String json;
        try {
            json = objectMapper.writeValueAsString(event);
        } catch (IOException e) {
            return;
        }

        TextMessage message = new TextMessage(json);
        for (ConcurrentWebSocketSessionDecorator session : userSessions.values()) {
            if (session.isOpen() && event.getCompanyId().equals(companyIdOf(session))) {
                try {
                    session.sendMessage(message);
                } catch (IOException e) {
                    // Ignore
                }
            }
        }
    }
}
