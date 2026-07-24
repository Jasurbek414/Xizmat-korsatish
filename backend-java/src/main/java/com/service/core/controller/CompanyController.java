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
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMIN')")
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

        if (request.containsKey("smsEnabled")) {
            company.setSmsEnabled((Boolean) request.get("smsEnabled"));
        }
        if (request.containsKey("smsApiToken")) company.setSmsApiToken((String) request.get("smsApiToken"));
        if (request.containsKey("smsTemplateCreated")) company.setSmsTemplateCreated((String) request.get("smsTemplateCreated"));
        if (request.containsKey("smsTemplateAssigned")) company.setSmsTemplateAssigned((String) request.get("smsTemplateAssigned"));
        if (request.containsKey("smsTemplateCompleted")) company.setSmsTemplateCompleted((String) request.get("smsTemplateCompleted"));

        Company saved = companyRepository.save(company);
        return ResponseEntity.ok(saved);
    }
}
