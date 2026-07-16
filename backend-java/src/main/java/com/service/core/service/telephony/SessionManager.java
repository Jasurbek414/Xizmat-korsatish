package com.service.core.service.telephony;

import org.springframework.stereotype.Service;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SessionManager {

    private final Map<UUID, ActiveSession> sessions = new ConcurrentHashMap<>();

    public void startSession(ActiveSession session) {
        sessions.put(session.getCallUuid(), session);
    }

    public ActiveSession getSession(UUID callUuid) {
        return sessions.get(callUuid);
    }

    public void removeSession(UUID callUuid) {
        sessions.remove(callUuid);
    }

    public Map<UUID, ActiveSession> getAllActiveSessions() {
        return sessions;
    }
}
