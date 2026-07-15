package com.service.core.controller;

import com.service.core.model.Company;
import com.service.core.model.ServiceEntity;
import com.service.core.repository.CompanyRepository;
import com.service.core.repository.ServiceRepository;
import com.service.core.tenant.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/services")
public class ServiceController {

    private final ServiceRepository serviceRepository;
    private final CompanyRepository companyRepository;

    public ServiceController(ServiceRepository serviceRepository, CompanyRepository companyRepository) {
        this.serviceRepository = serviceRepository;
        this.companyRepository = companyRepository;
    }

    @GetMapping
    public ResponseEntity<?> getServices() {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        List<ServiceEntity> services = serviceRepository.findByCompanyId(UUID.fromString(tenantId));
        return ResponseEntity.ok(services);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMIN','MANAGER')")
    public ResponseEntity<?> createService(@RequestBody Map<String, Object> request) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        String nameUz = (String) request.get("name_uz");
        String nameRu = (String) request.get("name_ru");
        String nameEn = (String) request.get("name_en");
        Object priceObj = request.get("price");
        String category = (String) request.get("category");
        String measurementUnit = (String) request.getOrDefault("measurement_unit", "m²");

        if (nameUz == null || nameRu == null || nameEn == null || priceObj == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Xizmat nomlari va narxi kiritilishi shart"));
        }

        BigDecimal price = new BigDecimal(priceObj.toString());
        Company company = companyRepository.findById(UUID.fromString(tenantId))
                .orElseThrow(() -> new RuntimeException("Kompaniya topilmadi"));

        ServiceEntity service = ServiceEntity.builder()
                .company(company)
                .nameUz(nameUz.trim())
                .nameRu(nameRu.trim())
                .nameEn(nameEn.trim())
                .price(price)
                .category(category)
                .measurementUnit(measurementUnit)
                .build();

        ServiceEntity saved = serviceRepository.save(service);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMIN','MANAGER')")
    public ResponseEntity<?> updateService(@PathVariable UUID id, @RequestBody Map<String, Object> request) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        ServiceEntity service = serviceRepository.findById(id).orElse(null);
        if (service == null || !service.getCompany().getId().equals(UUID.fromString(tenantId))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Xizmat topilmadi"));
        }

        if (request.containsKey("name_uz")) service.setNameUz((String) request.get("name_uz"));
        if (request.containsKey("name_ru")) service.setNameRu((String) request.get("name_ru"));
        if (request.containsKey("name_en")) service.setNameEn((String) request.get("name_en"));
        if (request.containsKey("price")) service.setPrice(new BigDecimal(request.get("price").toString()));
        if (request.containsKey("category")) service.setCategory((String) request.get("category"));
        if (request.containsKey("measurement_unit")) service.setMeasurementUnit((String) request.get("measurement_unit"));

        ServiceEntity saved = serviceRepository.save(service);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMIN','MANAGER')")
    public ResponseEntity<?> deleteService(@PathVariable UUID id) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        ServiceEntity service = serviceRepository.findById(id).orElse(null);
        if (service == null || !service.getCompany().getId().equals(UUID.fromString(tenantId))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Xizmat topilmadi"));
        }

        serviceRepository.delete(service);
        return ResponseEntity.ok(Map.of("message", "Xizmat o'chirildi"));
    }
}
