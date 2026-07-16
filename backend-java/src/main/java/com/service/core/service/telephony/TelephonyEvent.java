package com.service.core.service.telephony;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.util.UUID;

/**
 * companyId - hodisani faqat shu kompaniyaga tegishli WebSocket sessiyalariga
 * yetkazish uchun (tenant izolyatsiyasi). Har bir voqea nashr qilinganda
 * albatta to'ldirilishi kerak - aks holda hech kimga yetib bormaydi.
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@ToString
public class TelephonyEvent {
    private String type; // INVITE, RINGING, ANSWER, BYE, FAILED, REGISTRATION
    private Object payload;
    private UUID companyId;
}
