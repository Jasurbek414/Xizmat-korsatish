package com.service.core.service.telephony;

import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ActiveSession {
    private UUID callUuid;
    private String caller;
    private String callee;
    private UUID companyId;
    private UUID sipAccountId;
    // Chaqiruvni boshlagan operator (Device/dispatcher) - qo'ng'iroqlar
    // tarixida "kim qo'ng'iroq qildi" ma'lumotini to'g'ri yozish uchun.
    private UUID userId;
    private String extension;
    private String state; // INITIATED, RINGING, CONNECTED, FAILED, ENDED
    private LocalDateTime startTime;
    private LocalDateTime answerTime;
    private LocalDateTime endTime;
    private Integer duration;
}
