package com.service.core.controller;

import com.service.core.model.CallSession;
import com.service.core.model.Client;
import com.service.core.repository.CallSessionRepository;
import com.service.core.repository.ClientRepository;
import com.service.core.tenant.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * FreeSwitchEventListener orqali backend o'zi avtoritativ yozadigan qo'ng'iroq
 * tarixini (CallSession) o'qish uchun. Bundan oldin bu yozuvlar faqat bazaga
 * saqlanardi-yu, ularni o'qish uchun hech qanday endpoint yo'q edi.
 */
@RestController
@RequestMapping("/api/v1/call-sessions")
public class CallSessionController {

    private final CallSessionRepository callSessionRepository;
    private final ClientRepository clientRepository;

    public CallSessionController(CallSessionRepository callSessionRepository, ClientRepository clientRepository) {
        this.callSessionRepository = callSessionRepository;
        this.clientRepository = clientRepository;
    }

    @GetMapping
    public ResponseEntity<?> getCallSessions() {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }
        UUID companyId = UUID.fromString(tenantId);

        List<CallSession> sessions = callSessionRepository.findBySipAccount_Company_Id(companyId);

        // MUHIM (audit: 9-band) - avval "client_name" har doim "Noma'lum" deb
        // qattiq yozilgan edi, garchi mijoz shu telefon raqami bilan "clients"
        // jadvalida mavjud bo'lsa ham. Endi shu kompaniyaning barcha mijozlari
        // BIR MARTA olinib, telefon raqami -> ism xaritasiga aylantiriladi (har
        // bir qo'ng'iroq qatori uchun alohida so'rov yubormaslik uchun), keyin
        // shu xarita orqali haqiqiy ism qo'yiladi (topilmasa "Noma'lum").
        //
        // Telefon raqami NORMALLASHTIRILADI (faqat oxirgi 9 raqam - milliy raqam)
        // chunki bir xil mijoz baъzida "+998970504202", baъzida "970504202" deb
        // saqlanishi mumkin (operator terganda prefikssiz, bazada prefiks bilan) -
        // aks holda ular mos kelmasdan "Noma'lum" chiqib qolardi (jonli sinovda
        // aynan shu holat aniqlangan).
        Map<String, String> nameByPhone = clientRepository.findByCompanyId(companyId).stream()
                .collect(Collectors.toMap(
                        c -> normalizePhone(c.getPhone()),
                        Client::getFullName,
                        (a, b) -> a));

        List<Map<String, Object>> mapped = sessions.stream().map(s -> {
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", s.getId());
            map.put("direction", s.getDirection());
            map.put("status", s.getStatus());
            map.put("duration", s.getDuration());
            map.put("recording_url", s.getRecordingUrl() != null ? s.getRecordingUrl() : "");
            map.put("created_at", s.getCreatedAt());
            map.put("client_phone", s.getClientPhone());
            map.put("client_name", nameByPhone.getOrDefault(normalizePhone(s.getClientPhone()), "Noma'lum"));
            map.put("dispatcher_name", s.getDispatcher() != null ? s.getDispatcher().getFullName() : "Noma'lum");
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(mapped);
    }

    /**
     * Telefon raqamini mos kelishi uchun normallashtiradi: faqat raqamlarni
     * qoldiradi va oxirgi 9 tasini (O'zbekiston milliy raqami) oladi - shunda
     * "+998970504202", "998970504202" va "970504202" hammasi bir xil kalitga
     * tushadi.
     */
    private static String normalizePhone(String phone) {
        if (phone == null) return "";
        String digits = phone.replaceAll("[^0-9]", "");
        return digits.length() > 9 ? digits.substring(digits.length() - 9) : digits;
    }
}
