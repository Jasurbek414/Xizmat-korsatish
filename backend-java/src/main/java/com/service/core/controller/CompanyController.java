package com.service.core.controller;

import com.service.core.model.Company;
import com.service.core.repository.CompanyRepository;
import com.service.core.tenant.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/company")
public class CompanyController {

    private final CompanyRepository companyRepository;

    public CompanyController(CompanyRepository companyRepository) {
        this.companyRepository = companyRepository;
    }

    @GetMapping
    @PreAuthorize("@perm.has('settings')")
    public ResponseEntity<?> getCompanySettings() {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        Company company = companyRepository.findById(UUID.fromString(tenantId)).orElse(null);
        if (company == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Kompaniya topilmadi"));
        }

        return ResponseEntity.ok(company);
    }

    @PutMapping
    @PreAuthorize("@perm.has('settings')")
    public ResponseEntity<?> updateCompanySettings(@RequestBody Map<String, Object> request) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        Company company = companyRepository.findById(UUID.fromString(tenantId)).orElse(null);
        if (company == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Kompaniya topilmadi"));
        }

        if (request.containsKey("name")) company.setName((String) request.get("name"));
        if (request.containsKey("phone")) company.setPhone((String) request.get("phone"));
        if (request.containsKey("email")) company.setEmail((String) request.get("email"));
        if (request.containsKey("address")) company.setAddress((String) request.get("address"));
        if (request.containsKey("latitude")) {
            Object v = request.get("latitude");
            company.setLatitude(v == null ? null : Double.parseDouble(v.toString()));
        }
        if (request.containsKey("longitude")) {
            Object v = request.get("longitude");
            company.setLongitude(v == null ? null : Double.parseDouble(v.toString()));
        }

        if (request.containsKey("minOrderPrice")) {
            company.setMinOrderPrice(Integer.parseInt(request.get("minOrderPrice").toString()));
        }
        if (request.containsKey("driverKpiPercent")) {
            company.setDriverKpiPercent(Integer.parseInt(request.get("driverKpiPercent").toString()));
        }
        if (request.containsKey("workStartTime")) company.setWorkStartTime((String) request.get("workStartTime"));
        if (request.containsKey("workEndTime")) company.setWorkEndTime((String) request.get("workEndTime"));

        if (request.containsKey("measurementUnits")) {
            Object raw = request.get("measurementUnits");
            if (raw instanceof List<?> rawList) {
                // MUHIM: Hibernate @ElementCollection'ni yangilashda kolleksiyani ICHKARIDAN
                // clear() qiladi - shu sabab .toList() qaytaradigan O'ZGARMAS (immutable)
                // ro'yxatni emas, albatta O'ZGARUVCHAN (mutable) ArrayList berish kerak,
                // aks holda UnsupportedOperationException bilan saqlash butunlay barbod bo'ladi.
                List<String> units = rawList.stream()
                        .map(Object::toString)
                        .map(String::trim)
                        .filter(s -> !s.isBlank())
                        .distinct()
                        .collect(Collectors.toCollection(ArrayList::new));
                company.setMeasurementUnits(units);
            }
        }

        if (request.containsKey("customExpenseCategories")) {
            Object raw = request.get("customExpenseCategories");
            if (raw instanceof List<?> rawList) {
                company.setCustomExpenseCategories(rawList.stream()
                        .map(Object::toString)
                        .map(String::trim)
                        .filter(s -> !s.isBlank())
                        .distinct()
                        .collect(Collectors.toCollection(ArrayList::new)));
            }
        }
        if (request.containsKey("customIncomeCategories")) {
            Object raw = request.get("customIncomeCategories");
            if (raw instanceof List<?> rawList) {
                company.setCustomIncomeCategories(rawList.stream()
                        .map(Object::toString)
                        .map(String::trim)
                        .filter(s -> !s.isBlank())
                        .distinct()
                        .collect(Collectors.toCollection(ArrayList::new)));
            }
        }

        if (request.containsKey("smsEnabled")) {
            company.setSmsEnabled((Boolean) request.get("smsEnabled"));
        }
        if (request.containsKey("smsApiToken")) company.setSmsApiToken((String) request.get("smsApiToken"));
        if (request.containsKey("smsTemplateCreated")) company.setSmsTemplateCreated((String) request.get("smsTemplateCreated"));
        if (request.containsKey("smsTemplateAssigned")) company.setSmsTemplateAssigned((String) request.get("smsTemplateAssigned"));
        if (request.containsKey("smsTemplateCompleted")) company.setSmsTemplateCompleted((String) request.get("smsTemplateCompleted"));

        if (request.containsKey("receiptEnabled")) company.setReceiptEnabled((Boolean) request.get("receiptEnabled"));
        if (request.containsKey("receiptPaperSize")) company.setReceiptPaperSize((String) request.get("receiptPaperSize"));
        if (request.containsKey("receiptShowAddress")) company.setReceiptShowAddress((Boolean) request.get("receiptShowAddress"));
        if (request.containsKey("receiptShowPhone")) company.setReceiptShowPhone((Boolean) request.get("receiptShowPhone"));
        if (request.containsKey("receiptFooterText")) company.setReceiptFooterText((String) request.get("receiptFooterText"));
        if (request.containsKey("receiptHeaderText")) company.setReceiptHeaderText((String) request.get("receiptHeaderText"));
        if (request.containsKey("receiptShowItems")) company.setReceiptShowItems((Boolean) request.get("receiptShowItems"));
        if (request.containsKey("receiptShowPaymentMethod")) company.setReceiptShowPaymentMethod((Boolean) request.get("receiptShowPaymentMethod"));
        if (request.containsKey("receiptShowOrderNumber")) company.setReceiptShowOrderNumber((Boolean) request.get("receiptShowOrderNumber"));
        if (request.containsKey("receiptShowEmployeeName")) company.setReceiptShowEmployeeName((Boolean) request.get("receiptShowEmployeeName"));
        if (request.containsKey("receiptCopies")) company.setReceiptCopies(Integer.parseInt(request.get("receiptCopies").toString()));
        if (request.containsKey("receiptFontSize")) company.setReceiptFontSize((String) request.get("receiptFontSize"));
        if (request.containsKey("receiptLogoBase64")) company.setReceiptLogoBase64((String) request.get("receiptLogoBase64"));

        Company saved = companyRepository.save(company);
        return ResponseEntity.ok(saved);
    }

    /**
     * Mobil ilova (haydovchi) uchun - to'lov qabul qilingach chek chiqarish
     * kerakmi va uni qanday chop etish (o'lcham, qaysi maydonlar, pastki
     * matn) kerakligini bildiradi. ATAYIN alohida, yengil endpoint - to'liq
     * getCompanySettings() 'settings' huquqini talab qiladi va smsApiToken
     * kabi sirlarni qaytaradi, lekin haydovchida hech qachon 'settings'
     * huquqi bo'lmaydi (faqat 'mobile_orders').
     */
    public record ReceiptSettingsResponse(
            boolean enabled, String paperSize, boolean showAddress, boolean showPhone,
            boolean showItems, boolean showPaymentMethod,
            boolean showOrderNumber, boolean showEmployeeName,
            int copies, String fontSize, String logoBase64,
            String headerText, String footerText,
            String companyName, String companyAddress, String companyPhone) {
    }

    @GetMapping("/receipt-settings")
    @PreAuthorize("@perm.has('mobile_orders','orders','settings')")
    public ResponseEntity<?> getReceiptSettings() {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }
        Company company = companyRepository.findById(UUID.fromString(tenantId)).orElse(null);
        if (company == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Kompaniya topilmadi"));
        }
        return ResponseEntity.ok(new ReceiptSettingsResponse(
                Boolean.TRUE.equals(company.getReceiptEnabled()),
                company.getReceiptPaperSize() != null ? company.getReceiptPaperSize() : "58",
                Boolean.TRUE.equals(company.getReceiptShowAddress()),
                Boolean.TRUE.equals(company.getReceiptShowPhone()),
                Boolean.TRUE.equals(company.getReceiptShowItems()),
                Boolean.TRUE.equals(company.getReceiptShowPaymentMethod()),
                Boolean.TRUE.equals(company.getReceiptShowOrderNumber()),
                Boolean.TRUE.equals(company.getReceiptShowEmployeeName()),
                company.getReceiptCopies() != null ? company.getReceiptCopies() : 1,
                company.getReceiptFontSize() != null ? company.getReceiptFontSize() : "normal",
                company.getReceiptLogoBase64(),
                company.getReceiptHeaderText() != null && !company.getReceiptHeaderText().isBlank()
                        ? company.getReceiptHeaderText() : company.getName(),
                company.getReceiptFooterText() != null ? company.getReceiptFooterText() : "",
                company.getName(),
                company.getAddress(),
                company.getPhone()
        ));
    }

    /**
     * Xarita bo'limi (Xodimlar Monitoringi) uchun - korxonaning markaziy
     * koordinatasi. ATAYIN alohida, yengil endpoint: to'liq
     * getCompanySettings() 'settings' huquqini talab qiladi (va smsApiToken
     * kabi maxfiy maydonlarni ham qaytaradi) - lekin Xarita bo'limiga
     * 'map' huquqi bilan kiradigan xodimlar (masalan Dispetcher) 'settings'
     * huquqiga ega bo'lmasligi mumkin. Shu sabab faqat koordinata (hech
     * qanday sir emas) alohida, kengroq ruxsat bilan ochilgan.
     */
    public record CompanyLocationResponse(Double latitude, Double longitude) {
    }

    @GetMapping("/location")
    @PreAuthorize("@perm.has('map','settings')")
    public ResponseEntity<?> getCompanyLocation() {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }
        Company company = companyRepository.findById(UUID.fromString(tenantId)).orElse(null);
        if (company == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Kompaniya topilmadi"));
        }
        return ResponseEntity.ok(new CompanyLocationResponse(company.getLatitude(), company.getLongitude()));
    }

    @PutMapping("/location")
    @PreAuthorize("@perm.has('map','settings')")
    public ResponseEntity<?> updateCompanyLocation(@RequestBody Map<String, Object> request) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }
        Object latObj = request.get("latitude");
        Object lngObj = request.get("longitude");
        if (latObj == null || lngObj == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "latitude va longitude kiritilishi shart"));
        }
        Company company = companyRepository.findById(UUID.fromString(tenantId)).orElse(null);
        if (company == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Kompaniya topilmadi"));
        }
        company.setLatitude(Double.parseDouble(latObj.toString()));
        company.setLongitude(Double.parseDouble(lngObj.toString()));
        Company saved = companyRepository.save(company);
        return ResponseEntity.ok(new CompanyLocationResponse(saved.getLatitude(), saved.getLongitude()));
    }
}
