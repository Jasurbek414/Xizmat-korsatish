package com.service.core.controller;

import com.service.core.model.Company;
import com.service.core.model.ItemStage;
import com.service.core.model.OrderItem;
import com.service.core.repository.CompanyRepository;
import com.service.core.repository.ItemStageRepository;
import com.service.core.repository.OrderItemRepository;
import com.service.core.service.ItemStageSeedService;
import com.service.core.tenant.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Gilam (OrderItem) bosqichlari - OrderStatusController bilan AYNAN bir xil
 * naqsh, lekin butunlay mustaqil: bular buyurtma darajasidagi statuslardan
 * (OrderStatus) FARQLI - sex ichida har bir gilamning o'z ishlov holatini
 * bildiradi (masalan Qabul qilindi -> Yuvildi -> Quritildi -> Tayyor).
 */
@RestController
@RequestMapping("/api/v1/item-stages")
public class ItemStageController {

    private final ItemStageRepository itemStageRepository;
    private final CompanyRepository companyRepository;
    private final OrderItemRepository orderItemRepository;
    private final ItemStageSeedService itemStageSeedService;

    public ItemStageController(ItemStageRepository itemStageRepository, CompanyRepository companyRepository,
                                OrderItemRepository orderItemRepository, ItemStageSeedService itemStageSeedService) {
        this.itemStageRepository = itemStageRepository;
        this.companyRepository = companyRepository;
        this.orderItemRepository = orderItemRepository;
        this.itemStageSeedService = itemStageSeedService;
    }

    // MUHIM: O'QISH ochiq (@perm.has('orders','mobile_orders')) - sex xodimi
    // va haydovchi (faqat 'mobile_orders' huquqiga ega) mobil ilovada gilam
    // bosqichlarini ko'rishi shart (OrderItemController bilan bir xil sabab).
    @GetMapping
    @PreAuthorize("@perm.has('orders','mobile_orders')")
    public ResponseEntity<?> getStages() {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        UUID companyId = UUID.fromString(tenantId);
        Company company = companyRepository.findById(companyId).orElse(null);
        if (company == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Kompaniya topilmadi"));
        }

        itemStageSeedService.seedDefaultStagesIfMissing(company);
        return ResponseEntity.ok(itemStageRepository.findByCompanyIdOrderBySortOrderAsc(companyId));
    }

    @PostMapping
    @PreAuthorize("@perm.has('orders')")
    public ResponseEntity<?> createStage(@RequestBody Map<String, String> request) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        String nameUz = request.get("name_uz");
        String nameRu = request.get("name_ru");
        String nameEn = request.get("name_en");
        String colorCode = request.get("color_code");

        if (nameUz == null || nameRu == null || nameEn == null || nameUz.isBlank() || nameRu.isBlank() || nameEn.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Bosqich nomlari kiritilishi shart"));
        }

        Company company = companyRepository.findById(UUID.fromString(tenantId))
                .orElseThrow(() -> new RuntimeException("Kompaniya topilmadi"));

        List<ItemStage> current = itemStageRepository.findByCompanyIdOrderBySortOrderAsc(company.getId());
        int nextOrder = current.size() + 1;
        String stageKey = "STAGE_" + System.currentTimeMillis();

        ItemStage stage = ItemStage.builder()
                .company(company)
                .stageKey(stageKey)
                .nameUz(nameUz.trim())
                .nameRu(nameRu.trim())
                .nameEn(nameEn.trim())
                .colorCode(colorCode != null ? colorCode : "#3b82f6")
                .sortOrder(nextOrder)
                .build();

        ItemStage saved = itemStageRepository.save(stage);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/reorder")
    @PreAuthorize("@perm.has('orders')")
    @Transactional
    public ResponseEntity<?> reorderStages(@RequestBody List<String> orderedIds) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        UUID companyId = UUID.fromString(tenantId);
        List<ItemStage> stages = new java.util.ArrayList<>();
        for (String rawId : orderedIds) {
            ItemStage stage = itemStageRepository.findById(UUID.fromString(rawId)).orElse(null);
            if (stage != null && stage.getCompany().getId().equals(companyId)) {
                stages.add(stage);
            }
        }

        // MUHIM (shu tekshiruv paytida topilgan xato - OrderStatusController'dagi
        // AYNAN shu naqshdan meros bo'lib o'tgan): `sort_order` ustida
        // (company_id, sort_order) UNIQUE cheklovi bor. Har bir yozuvni birma-bir
        // TO'G'RIDAN-TO'G'RI yangi (final) qiymatga o'zgartirsa - masalan ikkinchi
        // o'rindagi yozuvni birinchi o'ringa ko'chirish - u hali eskisini
        // ushlab turgan boshqa yozuv bilan bir xil sort_order'ga ega bo'lib
        // qolib, DARHOL constraint xatosiga uchraydi (istalgan qo'shni almashtirish
        // - ya'ni "yuqoriga/pastga" tugmalari - HAR DOIM shu xatoni berardi).
        // Yechim: avval hammasini VAQTINCHA hech kim bilan to'qnashmaydigan
        // MANFIY qiymatlarga, so'ng haqiqiy (1..N) qiymatlarga o'tkazish.
        for (int i = 0; i < stages.size(); i++) {
            stages.get(i).setSortOrder(-(i + 1));
        }
        // MUHIM: flush() SHART - aks holda Hibernate ikkala save()ni bitta
        // tranzaksiya ichida birlashtirib, faqat OXIRGI qiymatni yozadi (qarang
        // OrderStatusController.reorderStatuses()dagi bir xil izoh).
        itemStageRepository.saveAll(stages);
        itemStageRepository.flush();
        for (int i = 0; i < stages.size(); i++) {
            stages.get(i).setSortOrder(i + 1);
        }
        itemStageRepository.saveAll(stages);

        return ResponseEntity.ok(Map.of("message", "Bosqichlar ketma-ketligi muvaffaqiyatli saqlandi"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@perm.has('orders')")
    public ResponseEntity<?> updateStage(@PathVariable UUID id, @RequestBody Map<String, String> request) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        ItemStage stage = itemStageRepository.findById(id).orElse(null);
        if (stage == null || !stage.getCompany().getId().equals(UUID.fromString(tenantId))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Bosqich topilmadi"));
        }

        if (request.containsKey("name_uz")) stage.setNameUz(request.get("name_uz").trim());
        if (request.containsKey("name_ru")) stage.setNameRu(request.get("name_ru").trim());
        if (request.containsKey("name_en")) stage.setNameEn(request.get("name_en").trim());
        if (request.containsKey("color_code")) stage.setColorCode(request.get("color_code").trim());

        ItemStage saved = itemStageRepository.save(stage);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@perm.has('orders')")
    public ResponseEntity<?> deleteStage(@PathVariable UUID id) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        UUID companyId = UUID.fromString(tenantId);
        ItemStage stage = itemStageRepository.findById(id).orElse(null);
        if (stage == null || !stage.getCompany().getId().equals(companyId)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Bosqich topilmadi"));
        }

        // OrderStatusController.deleteStatus() bilan bir xil xavfsizlik qoidasi:
        // shu bosqichda hali FAOL (tarixga o'tmagan) gilamlar bo'lsa, o'chirish
        // taqiqlanadi - aks holda mobil ilova noma'lum kalitni ko'rib chalkashadi.
        List<OrderItem> affectedItems = orderItemRepository.findByStatusAndOrder_Company_Id(stage.getStageKey(), companyId);
        boolean hasActiveItems = affectedItems.stream()
                .anyMatch(item -> !"HANDED_OVER".equals(item.getOrder().getPaymentStatus()));
        if (hasActiveItems) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "message", "Bu bosqichda hali faol gilamlar bor - avval ularni boshqa bosqichga o'tkazing yoki buyurtmani yakunlang"));
        }

        itemStageRepository.delete(stage);
        return ResponseEntity.ok(Map.of("message", "Bosqich muvaffaqiyatli o'chirildi"));
    }
}
