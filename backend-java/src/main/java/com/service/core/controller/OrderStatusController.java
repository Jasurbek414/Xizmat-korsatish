package com.service.core.controller;

import com.service.core.model.Company;
import com.service.core.model.Order;
import com.service.core.model.OrderStatus;
import com.service.core.repository.CompanyRepository;
import com.service.core.repository.OrderRepository;
import com.service.core.repository.OrderStatusRepository;
import com.service.core.tenant.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/order-statuses")
public class OrderStatusController {

    private final OrderStatusRepository orderStatusRepository;
    private final CompanyRepository companyRepository;
    private final OrderRepository orderRepository;

    public OrderStatusController(OrderStatusRepository orderStatusRepository, CompanyRepository companyRepository,
                                  OrderRepository orderRepository) {
        this.orderStatusRepository = orderStatusRepository;
        this.companyRepository = companyRepository;
        this.orderRepository = orderRepository;
    }

    @GetMapping
    public ResponseEntity<?> getStatuses() {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        List<OrderStatus> statuses = orderStatusRepository.findByCompanyIdOrderBySortOrderAsc(UUID.fromString(tenantId));
        return ResponseEntity.ok(statuses);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMIN','MANAGER','DISPATCHER')")
    public ResponseEntity<?> createStatus(@RequestBody Map<String, String> request) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        String nameUz = request.get("name_uz");
        String nameRu = request.get("name_ru");
        String nameEn = request.get("name_en");
        String colorCode = request.get("color_code");

        if (nameUz == null || nameRu == null || nameEn == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Status nomlari kiritilishi shart"));
        }

        Company company = companyRepository.findById(UUID.fromString(tenantId))
                .orElseThrow(() -> new RuntimeException("Kompaniya topilmadi"));

        List<OrderStatus> current = orderStatusRepository.findByCompanyIdOrderBySortOrderAsc(company.getId());
        int nextOrder = current.size() + 1;

        OrderStatus status = OrderStatus.builder()
                .company(company)
                .nameUz(nameUz.trim())
                .nameRu(nameRu.trim())
                .nameEn(nameEn.trim())
                .colorCode(colorCode != null ? colorCode : "#3b82f6")
                .sortOrder(nextOrder)
                .isSystem(false)
                .build();

        OrderStatus saved = orderStatusRepository.save(status);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/reorder")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMIN','MANAGER','DISPATCHER')")
    public ResponseEntity<?> reorderStatuses(@RequestBody List<String> orderedIds) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        UUID companyId = UUID.fromString(tenantId);
        for (int i = 0; i < orderedIds.size(); i++) {
            UUID statusId = UUID.fromString(orderedIds.get(i));
            OrderStatus status = orderStatusRepository.findById(statusId).orElse(null);
            if (status != null && status.getCompany().getId().equals(companyId)) {
                status.setSortOrder(i + 1);
                orderStatusRepository.save(status);
            }
        }

        return ResponseEntity.ok(Map.of("message", "Statuslar ketma-ketligi muvaffaqiyatli saqlandi"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMIN','MANAGER','DISPATCHER')")
    public ResponseEntity<?> updateStatus(@PathVariable UUID id, @RequestBody Map<String, String> request) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        OrderStatus status = orderStatusRepository.findById(id).orElse(null);
        if (status == null || !status.getCompany().getId().equals(UUID.fromString(tenantId))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Status topilmadi"));
        }

        if (request.containsKey("name_uz")) status.setNameUz(request.get("name_uz").trim());
        if (request.containsKey("name_ru")) status.setNameRu(request.get("name_ru").trim());
        if (request.containsKey("name_en")) status.setNameEn(request.get("name_en").trim());
        if (request.containsKey("color_code")) status.setColorCode(request.get("color_code").trim());

        OrderStatus saved = orderStatusRepository.save(status);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMIN','MANAGER','DISPATCHER')")
    public ResponseEntity<?> deleteStatus(@PathVariable UUID id) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        OrderStatus status = orderStatusRepository.findById(id).orElse(null);
        if (status == null || !status.getCompany().getId().equals(UUID.fromString(tenantId))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Status topilmadi"));
        }

        // Admin istalgan statusni (standart yoki maxsus) erkin o'chira oladi. Shu statusga
        // biriktirilgan buyurtmalar bazadagi FK cheklovi tufayli xatolikka uchramasligi uchun
        // ularning status maydoni o'chirishdan oldin bo'shatiladi (mavjud tarixi saqlanib qoladi).
        List<Order> affectedOrders = orderRepository.findByStatusId(id);
        for (Order order : affectedOrders) {
            order.setStatus(null);
        }
        if (!affectedOrders.isEmpty()) {
            orderRepository.saveAll(affectedOrders);
        }

        orderStatusRepository.delete(status);
        return ResponseEntity.ok(Map.of("message", "Status muvaffaqiyatli o'chirildi"));
    }
}
