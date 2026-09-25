package com.service.core.controller;

import com.service.core.model.Company;
import com.service.core.model.ItemStatusLabel;
import com.service.core.repository.CompanyRepository;
import com.service.core.repository.ItemStatusLabelRepository;
import com.service.core.repository.OrderItemRepository;
import com.service.core.tenant.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Gilam (OrderItem) ishlov bosqichlarini boshqarish - "Sozlamalar > Gilam
 * bosqichlari". {@link OrderStatusController} bilan BIR XIL erkin CRUD
 * arxitekturaga ega (qo'shish/tahrirlash/o'chirish/tartib almashtirish) -
 * batafsil farq va tarix uchun {@link ItemStatusLabel}ga qarang.
 */
@RestController
@RequestMapping("/api/v1/item-statuses")
public class ItemStatusController {

    /** Kompaniya birinchi so'ragunicha ushbu standart qiymatlar bilan seedlanadi. */
    private static final List<String[]> DEFAULTS = List.of(
            // key, nameUz, nameRu, nameEn, colorCode, isFinal
            new String[]{"ACCEPTED", "Qabul qilindi", "Принято", "Accepted", "#D9852B", "false"},
            new String[]{"WASHED", "Yuvildi", "Постирано", "Washed", "#2563EB", "false"},
            new String[]{"DRIED", "Quritildi", "Высушено", "Dried", "#0B6B4F", "false"},
            new String[]{"READY", "Tayyor", "Готово", "Ready", "#0E9488", "true"}
    );

    private static final SecureRandom RANDOM = new SecureRandom();

    private final ItemStatusLabelRepository repository;
    private final CompanyRepository companyRepository;
    private final OrderItemRepository orderItemRepository;

    public ItemStatusController(ItemStatusLabelRepository repository, CompanyRepository companyRepository,
                                 OrderItemRepository orderItemRepository) {
        this.repository = repository;
        this.companyRepository = companyRepository;
        this.orderItemRepository = orderItemRepository;
    }

    // MUHIM: o'qish 'orders' YOKI 'mobile_orders' bilan ochiq - xuddi
    // OrderStatusController.getStatuses() bilan bir xil sabab: sex hodimi
    // (faqat 'mobile_orders'ga ega) gilam bosqichi nomlarini o'qiy olishi
    // SHART, aks holda mobil ilovada bosqich chiplari umuman ko'rinmaydi.
    @GetMapping
    @PreAuthorize("@perm.has('orders','mobile_orders')")
    @Transactional
    public ResponseEntity<?> list() {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }
        UUID companyId = UUID.fromString(tenantId);
        Company company = companyRepository.findById(companyId).orElse(null);
        if (company == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Kompaniya topilmadi"));
        }

        seedIfMissing(company);
        return ResponseEntity.ok(repository.findByCompanyIdOrderBySortOrderAsc(companyId));
    }

    @PostMapping
    @PreAuthorize("@perm.has('orders')")
    @Transactional
    public ResponseEntity<?> create(@RequestBody Map<String, Object> request) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }
        UUID companyId = UUID.fromString(tenantId);
        Company company = companyRepository.findById(companyId).orElse(null);
        if (company == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Kompaniya topilmadi"));
        }
        seedIfMissing(company);

        String nameUz = str(request, "name_uz");
        String nameRu = str(request, "name_ru");
        String nameEn = str(request, "name_en");
        if (nameUz == null || nameRu == null || nameEn == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Bosqich nomlari kiritilishi shart"));
        }
        String colorCode = str(request, "color_code");

        List<ItemStatusLabel> current = repository.findByCompanyIdOrderBySortOrderAsc(companyId);
        int nextOrder = current.size() + 1;

        ItemStatusLabel label = ItemStatusLabel.builder()
                .company(company)
                .itemKey(generateUniqueKey(companyId))
                .nameUz(nameUz.trim())
                .nameRu(nameRu.trim())
                .nameEn(nameEn.trim())
                .colorCode(colorCode != null ? colorCode : "#3b82f6")
                .sortOrder(nextOrder)
                .isFinal(bool(request, "is_final"))
                .build();

        ItemStatusLabel saved = repository.save(label);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/reorder")
    @PreAuthorize("@perm.has('orders')")
    @Transactional
    public ResponseEntity<?> reorder(@RequestBody List<String> orderedIds) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }
        UUID companyId = UUID.fromString(tenantId);

        for (int i = 0; i < orderedIds.size(); i++) {
            UUID id = UUID.fromString(orderedIds.get(i));
            ItemStatusLabel label = repository.findById(id).orElse(null);
            if (label != null && label.getCompany().getId().equals(companyId)) {
                label.setSortOrder(i + 1);
                repository.save(label);
            }
        }

        return ResponseEntity.ok(Map.of("message", "Bosqichlar ketma-ketligi muvaffaqiyatli saqlandi"));
    }

    @PutMapping("/{itemKey}")
    @PreAuthorize("@perm.has('orders')")
    @Transactional
    public ResponseEntity<?> update(@PathVariable String itemKey, @RequestBody Map<String, Object> request) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }
        UUID companyId = UUID.fromString(tenantId);

        Company company = companyRepository.findById(companyId).orElse(null);
        if (company == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Kompaniya topilmadi"));
        }
        seedIfMissing(company);

        ItemStatusLabel label = repository.findByCompanyIdAndItemKey(companyId, itemKey).orElse(null);
        if (label == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Bosqich topilmadi"));
        }

        if (request.containsKey("name_uz")) label.setNameUz(str(request, "name_uz"));
        if (request.containsKey("name_ru")) label.setNameRu(str(request, "name_ru"));
        if (request.containsKey("name_en")) label.setNameEn(str(request, "name_en"));
        if (request.containsKey("color_code")) label.setColorCode(str(request, "color_code"));
        if (request.containsKey("is_final")) label.setIsFinal(bool(request, "is_final"));

        return ResponseEntity.ok(repository.save(label));
    }

    @DeleteMapping("/{itemKey}")
    @PreAuthorize("@perm.has('orders')")
    @Transactional
    public ResponseEntity<?> delete(@PathVariable String itemKey) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }
        UUID companyId = UUID.fromString(tenantId);

        ItemStatusLabel label = repository.findByCompanyIdAndItemKey(companyId, itemKey).orElse(null);
        if (label == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Bosqich topilmadi"));
        }

        // Kamida bitta bosqich qolishi SHART - hammasi o'chirilsa mobil
        // ilovada gilamlarni belgilash uchun umuman joy qolmaydi.
        List<ItemStatusLabel> current = repository.findByCompanyIdOrderBySortOrderAsc(companyId);
        if (current.size() <= 1) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Kamida bitta gilam bosqichi qolishi shart"));
        }

        // Shu bosqichda HALI AMALDA gilam bo'lsa o'chirish taqiqlanadi -
        // aks holda o'sha gilamlar ko'rinadigan nomsiz (xom kalit bilan)
        // qolib ketardi.
        if (orderItemRepository.existsByCompanyIdAndStatus(companyId, itemKey)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "message", "Bu bosqichda hali gilamlar bor - avval ularni boshqa bosqichga o'tkazing"));
        }

        repository.delete(label);
        return ResponseEntity.ok(Map.of("message", "Bosqich muvaffaqiyatli o'chirildi"));
    }

    /** So'rov tanasidan matn qiymat - bo'sh qator NULL deb qabul qilinadi. */
    private String str(Map<String, Object> request, String key) {
        Object v = request.get(key);
        if (v == null) return null;
        String s = v.toString().trim();
        return s.isEmpty() ? null : s;
    }

    private boolean bool(Map<String, Object> request, String key) {
        Object v = request.get(key);
        if (v instanceof Boolean b) return b;
        return v != null && "true".equalsIgnoreCase(v.toString().trim());
    }

    /**
     * Admin qo'shgan yangi bosqich uchun noyob kalit - "ST" + 8 ta tasodifiy
     * hex belgi (masalan "ST3F2A91B4"). To'qnashuv ehtimoli deyarli nolga
     * teng, lekin ehtiyot shart uchun bir necha marta qayta urinib ko'riladi.
     */
    private String generateUniqueKey(UUID companyId) {
        for (int attempt = 0; attempt < 10; attempt++) {
            String key = "ST" + Long.toHexString(RANDOM.nextLong() & 0xFFFFFFFFL).toUpperCase();
            if (repository.findByCompanyIdAndItemKey(companyId, key).isEmpty()) {
                return key;
            }
        }
        throw new IllegalStateException("Noyob bosqich kaliti generatsiya qilib bo'lmadi");
    }

    /**
     * Har bir standart kalitni ALOHIDA tekshiradi va faqat yo'q bo'lganini
     * yaratadi - {@code RoleSeedService.seedDefaultRolesIfMissing} bilan bir
     * xil naqsh: kelajakda yangi bosqich kaliti qo'shilsa, allaqachon
     * mavjud kompaniyalar ham avtomatik to'ldiriladi.
     */
    private void seedIfMissing(Company company) {
        Map<String, ItemStatusLabel> existing = new LinkedHashMap<>();
        for (ItemStatusLabel l : repository.findByCompanyId(company.getId())) {
            existing.put(l.getItemKey(), l);
        }
        int order = existing.size();
        for (String[] d : DEFAULTS) {
            if (existing.containsKey(d[0])) continue;
            order++;
            repository.save(ItemStatusLabel.builder()
                    .company(company)
                    .itemKey(d[0])
                    .nameUz(d[1])
                    .nameRu(d[2])
                    .nameEn(d[3])
                    .colorCode(d[4])
                    .sortOrder(order)
                    .isFinal(Boolean.parseBoolean(d[5]))
                    .build());
        }
    }
}
