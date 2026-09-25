package com.service.core.service.telephony;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * /ws/gps - "Xodimlar Monitoringi" xaritasi uchun REAL VAQT kanali.
 *
 * NEGA KERAK: avval veb-admin har 6 soniyada backendni SO'RAB turardi
 * (polling) - lekin haydovchi GPS'ni har 15 soniyada yuboradi, ya'ni yangi
 * nuqta ALLAQACHON bor bo'lsa ham, admin uni ko'rish uchun keyingi so'rov
 * (~0-6s kutish) navbatini kutishga majbur edi. Foydalanuvchi "hatto bir
 * soniya ham farq qilmasin" deb so'ragani uchun - GpsController har bir
 * yangi nuqtani saqlagan ZAHOTI shu kanal orqali DARHOL (kutishsiz)
 * ulangan barcha admin brauzerlariga yuboradi. Polling (6s) FALLBACK
 * sifatida saqlanadi (masalan WebSocket vaqtincha uzilib qolsa).
 *
 * Telefoniya kanali (/ws/telephony, TelephonyWebSocketHandler) bilan BIR
 * XIL autentifikatsiya (TelephonyHandshakeInterceptor - umumiy, nomiga
 * qaramasdan telefoniyaga xos emas) va keepalive/broadcast naqshi
 * qo'llaniladi, lekin bu yerda faqat BITTA yo'nalish bor: server -> mijoz
 * (mijozdan PING'dan boshqa hech narsa kutilmaydi).
 */
@Component
public class GpsWebSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(GpsWebSocketHandler.class);

    private final ObjectMapper objectMapper = new ObjectMapper();

    // Bir kompaniyada BIR NECHTA admin/menejer xaritani BIR VAQTDA ochib
    // turishi mumkin - shu sabab foydalanuvchi emas, KOMPANIYA bo'yicha
    // guruhlangan sessiyalar to'plami.
    private final Map<UUID, Set<ConcurrentWebSocketSessionDecorator>> companySessions = new ConcurrentHashMap<>();

    private UUID companyIdOf(WebSocketSession session) {
        Object companyId = session.getAttributes().get("companyId");
        if (companyId == null) return null;
        try {
            return UUID.fromString(companyId.toString());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        UUID companyId = companyIdOf(session);
        if (companyId == null) {
            try {
                session.close(CloseStatus.NOT_ACCEPTABLE);
            } catch (IOException ignored) {
            }
            return;
        }
        companySessions
                .computeIfAbsent(companyId, k -> ConcurrentHashMap.newKeySet())
                .add(new ConcurrentWebSocketSessionDecorator(session, 10_000, 512 * 1024));
        log.info("GPS WebSocket established for company: {}", companyId);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        // Mijozdan FAQAT keepalive PING keladi - boshqa hech qanday amal
        // qabul qilinmaydi (bu kanal FAQAT server -> mijoz translyatsiya).
        // Alohida PONG yubormaymiz - brauzer tomoni buni kutmaydi (faqat
        // ulanish ochiq/tirik ekanini ta'minlash uchun trafik hosil qiladi).
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        UUID companyId = companyIdOf(session);
        if (companyId == null) return;
        Set<ConcurrentWebSocketSessionDecorator> sessions = companySessions.get(companyId);
        if (sessions == null) return;
        sessions.removeIf(s -> s.getDelegate() == session);
        if (sessions.isEmpty()) {
            companySessions.remove(companyId);
        }
    }

    /**
     * GpsController.logCoordinates() har bir yangi nuqtani saqlagandan
     * so'ng chaqiradi - shu kompaniyaning xaritasini ochib turgan BARCHA
     * admin brauzerlariga darhol yuboriladi.
     */
    public void broadcastGpsUpdate(UUID companyId, UUID driverId, double latitude, double longitude, LocalDateTime recordedAt) {
        Set<ConcurrentWebSocketSessionDecorator> sessions = companySessions.get(companyId);
        if (sessions == null || sessions.isEmpty()) return;

        String json;
        try {
            json = objectMapper.writeValueAsString(Map.of(
                    "type", "GPS_UPDATE",
                    "payload", Map.of(
                            "driverId", driverId.toString(),
                            "latitude", latitude,
                            "longitude", longitude,
                            "recordedAt", recordedAt.toString()
                    )
            ));
        } catch (IOException e) {
            return;
        }

        TextMessage message = new TextMessage(json);
        for (ConcurrentWebSocketSessionDecorator session : sessions) {
            if (session.isOpen()) {
                try {
                    session.sendMessage(message);
                } catch (IOException e) {
                    // Ignore - ulanish keyingi tsiklda o'zi tozalanadi (afterConnectionClosed).
                }
            }
        }
    }
}
