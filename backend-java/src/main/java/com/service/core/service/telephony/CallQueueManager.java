package com.service.core.service.telephony;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Onlayn operator topilmagan kiruvchi qo'ng'iroqlarning xotiradagi navbati -
 * SessionManager/PresenceManager bilan bir xil oddiy naqsh, PBX'ga (Asterisk)
 * bog'liq emas. Haqiqiy "kutish" mexanizmi (musiqa, bridge) SIPAdapter
 * orqali amalga oshadi - bu klass faqat "kim navbatda, qachondan beri" holatini
 * kuzatadi.
 */
@Service
public class CallQueueManager {

    @Getter
    @Builder
    @AllArgsConstructor
    public static class QueuedCall {
        private final String channelUuid;
        private final UUID sipAccountId;
        private final String callerNumber;
        private final String destinationNumber;
        private final LocalDateTime queuedAt;
    }

    private final Map<UUID, List<QueuedCall>> queuesByCompany = new ConcurrentHashMap<>();

    public void enqueue(UUID companyId, QueuedCall call) {
        queuesByCompany.computeIfAbsent(companyId, k -> new CopyOnWriteArrayList<>()).add(call);
    }

    /** Eng eski (birinchi kelgan) navbatdagi qo'ng'iroqni navbatdan chiqarib qaytaradi - topilmasa null. */
    public QueuedCall dequeueOldest(UUID companyId) {
        List<QueuedCall> list = queuesByCompany.get(companyId);
        if (list == null || list.isEmpty()) {
            return null;
        }
        QueuedCall oldest = list.remove(0);
        return oldest;
    }

    public void remove(UUID companyId, String channelUuid) {
        List<QueuedCall> list = queuesByCompany.get(companyId);
        if (list != null) {
            list.removeIf(c -> c.getChannelUuid().equals(channelUuid));
        }
    }

    public Map<UUID, List<QueuedCall>> getAllQueues() {
        return queuesByCompany;
    }
}
