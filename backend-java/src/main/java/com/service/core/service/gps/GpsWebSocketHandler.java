package com.service.core.service.gps;

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
 */
@Component
public class GpsWebSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(GpsWebSocketHandler.class);

    private final ObjectMapper objectMapper = new ObjectMapper();
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
        // Keepalive PING faqat
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
                    // Ignore
                }
            }
        }
    }
}
