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
    // MUHIM (audit'da topilgan xato, tuzatildi): avval CallSession.direction
    // hisobotda HAR DOIM qattiq yozilgan "OUTBOUND" edi - kiruvchi
    // qo'ng'iroqlar ham "chiquvchi" sifatida tarixga yozilardi. Endi bu
    // qiymat sessiya yaratilgan joyning o'zida (initiateCall/handleIncomingCall)
    // aniq belgilanadi.
    private String direction; // INBOUND, OUTBOUND
    private LocalDateTime startTime;
    private LocalDateTime answerTime;
    private LocalDateTime endTime;
    private Integer duration;
}
