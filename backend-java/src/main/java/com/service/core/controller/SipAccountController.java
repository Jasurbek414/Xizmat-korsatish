package com.service.core.controller;

import com.service.core.model.Company;
import com.service.core.model.SipAccount;
import com.service.core.repository.CompanyRepository;
import com.service.core.repository.SipAccountRepository;
import com.service.core.service.telephony.TelephonyService;
import com.service.core.tenant.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/sip-accounts")
public class SipAccountController {

    private final SipAccountRepository sipAccountRepository;
    private final CompanyRepository companyRepository;
    private final TelephonyService telephonyService;

    public SipAccountController(SipAccountRepository sipAccountRepository,
                                CompanyRepository companyRepository,
                                TelephonyService telephonyService) {
        this.sipAccountRepository = sipAccountRepository;
        this.companyRepository = companyRepository;
        this.telephonyService = telephonyService;
    }

    // Parolni hech qachon API javobida qaytarmaydigan javob shakli - frontend
    // saqlangan parolni qayta o'qishga muhtoj emas, faqat "sozlangan/sozlanmagan"
    // holatini bilishi kifoya.
    public record SipAccountResponse(
            UUID id,
            String name,
            String sipServer,
            Integer sipPort,
            String username,
            String authUsername,
            Integer keepaliveInterval,
            boolean hasPassword,
            LocalDateTime createdAt
    ) {
        static SipAccountResponse from(SipAccount account) {
            return new SipAccountResponse(
                    account.getId(),
                    account.getName(),
                    account.getSipServer(),
                    account.getSipPort(),
                    account.getUsername(),
                    account.getAuthUsername(),
                    account.getKeepaliveInterval(),
                    account.getPassword() != null && !account.getPassword().isBlank(),
                    account.getCreatedAt()
            );
        }
    }

    // Ro'yxat (parolsiz) - istalgan autentifikatsiya qilingan foydalanuvchi
    // (jumladan DISPATCHER) ko'ra oladi, chunki chiquvchi qo'ng'iroq qilish
    // uchun ularga trunk ID kerak (sirlar emas).
    @GetMapping
    public ResponseEntity<?> getSipAccounts() {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }
        List<SipAccount> accounts = sipAccountRepository.findByCompanyIdOrderByCreatedAtAsc(UUID.fromString(tenantId));
        List<SipAccountResponse> response = accounts.stream().map(SipAccountResponse::from).toList();
        return ResponseEntity.ok(response);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMIN','MANAGER')")
    public ResponseEntity<?> createSipAccount(@RequestBody Map<String, Object> request) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        Company company = companyRepository.findById(UUID.fromString(tenantId))
                .orElseThrow(() -> new RuntimeException("Kompaniya topilmadi"));

        SipAccount account = SipAccount.builder()
                .company(company)
                .name((String) request.get("name"))
                .sipServer((String) request.get("sip_server"))
                .sipPort(Integer.parseInt(request.getOrDefault("sip_port", 5060).toString()))
                .username((String) request.get("username"))
                .password((String) request.get("password"))
                .authUsername((String) request.get("auth_username"))
                .keepaliveInterval(Integer.parseInt(request.getOrDefault("keepalive_interval", 60).toString()))
                .build();

        SipAccount saved = sipAccountRepository.save(account);
        telephonyService.registerSipAccount(saved);
        return ResponseEntity.status(HttpStatus.CREATED).body(SipAccountResponse.from(saved));
    }

    // MUHIM (audit: "dublikat trunk yaratilishi" xatosi) - sozlamalarni
    // saqlashda frontend endi shu endpoint'ga murojaat qiladi (POST o'rniga),
    // shunda har safar YANGI SipAccount qatori yaratilib, eskisi yetim
    // (FreeSWITCH'da ro'yxatdan hali ham o'tgan holda) qolib ketmaydi.
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMIN','MANAGER')")
    public ResponseEntity<?> updateSipAccount(@PathVariable UUID id, @RequestBody Map<String, Object> request) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        SipAccount account = sipAccountRepository.findById(id).orElse(null);
        if (account == null || !account.getCompany().getId().equals(UUID.fromString(tenantId))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "SIP akkaunt topilmadi"));
        }

        if (request.get("name") != null) {
            account.setName((String) request.get("name"));
        }
        if (request.get("sip_server") != null) {
            account.setSipServer((String) request.get("sip_server"));
        }
        if (request.get("sip_port") != null) {
            account.setSipPort(Integer.parseInt(request.get("sip_port").toString()));
        }
        if (request.get("username") != null) {
            account.setUsername((String) request.get("username"));
        }
        if (request.get("password") != null && !((String) request.get("password")).isBlank()) {
            // Parol faqat foydalanuvchi HAQIQATDA yangi qiymat kiritganda
            // yangilanadi - bo'sh maydon eskisini o'chirib yubormaydi (frontend
            // parolni hech qachon qayta ko'rsatmaydi, shuning uchun bo'sh
            // qoldirish "o'zgartirmaslik" degani).
            account.setPassword((String) request.get("password"));
        }
        if (request.get("auth_username") != null) {
            account.setAuthUsername((String) request.get("auth_username"));
        }
        if (request.get("keepalive_interval") != null) {
            account.setKeepaliveInterval(Integer.parseInt(request.get("keepalive_interval").toString()));
        }

        SipAccount saved = sipAccountRepository.save(account);
        telephonyService.updateSipAccount(saved);
        return ResponseEntity.ok(SipAccountResponse.from(saved));
    }

    // Brauzerning o'z JsSIP klienti bilan haqiqiy SIP REGISTER qilishi uchun
    // yagona joy - parol atayin shu alohida, aniq nomlangan endpoint orqali
    // beriladi (umumiy ro'yxat endpoint'ida hech qachon qaytarilmaydi).
    public record SipCredentialsResponse(String sipServer, Integer sipPort, String username,
                                          String authUsername, String password) {
    }

    @GetMapping("/{id}/credentials")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMIN','MANAGER')")
    public ResponseEntity<?> getSipAccountCredentials(@PathVariable UUID id) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        SipAccount account = sipAccountRepository.findById(id).orElse(null);
        if (account == null || !account.getCompany().getId().equals(UUID.fromString(tenantId))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "SIP akkaunt topilmadi"));
        }

        return ResponseEntity.ok(new SipCredentialsResponse(
                account.getSipServer(), account.getSipPort(), account.getUsername(),
                account.getAuthUsername(), account.getPassword()
        ));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMIN','MANAGER')")
    public ResponseEntity<?> deleteSipAccount(@PathVariable UUID id) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        SipAccount account = sipAccountRepository.findById(id).orElse(null);
        if (account != null && account.getCompany().getId().equals(UUID.fromString(tenantId))) {
            telephonyService.unregisterSipAccount(account);
            sipAccountRepository.delete(account);
            return ResponseEntity.ok(Map.of("message", "SIP akkaunt o'chirildi"));
        }

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "SIP akkaunt topilmadi"));
    }
}
