package com.service.core.service.telephony;

import org.springframework.stereotype.Service;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class PresenceManager {

    private final Map<UUID, String> presenceMap = new ConcurrentHashMap<>();

    public void setStatus(UUID userId, String status) {
        presenceMap.put(userId, status);
    }

    public String getStatus(UUID userId) {
        return presenceMap.getOrDefault(userId, "OFFLINE");
    }

    public Map<UUID, String> getAllPresences() {
        return presenceMap;
    }
}
