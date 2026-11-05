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
    private final com.service.core.repository.RoleRepository roleRepository;

    public OrderStatusController(OrderStatusRepository orderStatusRepository, CompanyRepository companyRepository,
                                  OrderRepository orderRepository,
                                  com.service.core.repository.RoleRepository roleRepository) {
        this.orderStatusRepository = orderStatusRepository;
        this.companyRepository = companyRepository;
        this.orderRepository = orderRepository;
        this.roleRepository = roleRepository;
    }

    // MUHIM: yozish (POST/PUT/DELETE) faqat 'orders'ga cheklangan, lekin O'QISH shart emas —
    // mobil ilovadagi haydovchilar (faqat 'mobile_orders' huquqiga ega) buyurtma holatlarini
    // ko'rish uchun shu endpointdan foydalanadi (mobile-flutter/lib/features/orders/repository/
    // orders_repository.dart:93). Faqat 'orders' talab qilinsa, haydovchi ilovasi buziladi.
    @GetMapping
    @PreAuthorize("@perm.has('orders','mobile_orders')")
    public ResponseEntity<?> getStatuses() {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        List<OrderStatus> statuses = orderStatusRepository.findByCompanyIdOrderBySortOrderAsc(UUID.fromString(tenantId));
        return ResponseEntity.ok(statuses);
    }

    @PostMapping
    @PreAuthorize("@perm.has('orders')")
    public ResponseEntity<?> createStatus(@RequestBody Map<String, Object> request) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        String nameUz = str(request, "name_uz");
        String nameRu = str(request, "name_ru");
        String nameEn = str(request, "name_en");
        String colorCode = str(request, "color_code");

        if (nameUz == null || nameRu == null || nameEn == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Status nomlari kiritilishi shart"));
        }

        UUID companyId = UUID.fromString(tenantId);
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "Kompaniya topilmadi"));

        String ownerRoleKey = str(request, "owner_role_key");
        if (ownerRoleKey != null && !roleExists(companyId, ownerRoleKey)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Bunday rol topilmadi: " + ownerRoleKey));
        }

        List<OrderStatus> current = orderStatusRepository.findByCompanyIdOrderBySortOrderAsc(company.getId());
        // MUHIM (2026-10-05 audit): avval `current.size() + 1` edi. Status
        // o'chirilganda sort_order'da "teshik" qoladi (masalan 1,2,3 -> 2 o'chirildi
        // -> 1,3) - shunda size()+1 = 3 mavjud status bilan to'qnashib, UNIQUE
        // (company_id, sort_order) cheklovi sabab yangi status qo'shib bo'lmasdi.
        int nextOrder = current.stream()
                .map(OrderStatus::getSortOrder)
                .filter(java.util.Objects::nonNull)
                .max(Integer::compare)
                .orElse(0) + 1;

        OrderStatus status = OrderStatus.builder()
                .company(company)
                .nameUz(nameUz.trim())
                .nameRu(nameRu.trim())
                .nameEn(nameEn.trim())
                .colorCode(colorCode != null ? colorCode : "#3b82f6")
                .sortOrder(nextOrder)
                .isSystem(false)
                .ownerRoleKey(ownerRoleKey)
                .isFinal(bool(request, "is_final"))
                .build();

        OrderStatus saved = orderStatusRepository.save(status);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
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
     * Rol kaliti shu kompaniyada HAQIQATAN mavjudmi. Tekshiruvsiz admin
     * xato yozgan kalit jimgina saqlanib, o'sha bosqich hech kimga
     * ko'rinmay qolardi - buni ekranda tushunish deyarli imkonsiz.
     */
    private boolean roleExists(UUID companyId, String roleKey) {
        return roleRepository.findByCompanyIdAndKey(companyId, roleKey).isPresent();
    }

    @PutMapping("/reorder")
    @PreAuthorize("@perm.has('orders')")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> reorderStatuses(@RequestBody List<String> orderedIds) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        UUID companyId = UUID.fromString(tenantId);

        // MUHIM (2026-10-05 audit, JONLI bazada tasdiqlangan): order_statuses
        // jadvalida (company_id, sort_order) UNIQUE cheklovi bor. Avvalgi kod har
        // bir statusni birma-bir to'g'ridan-to'g'ri yangi o'ringa yozardi va
        // @Transactional ham yo'q edi - ya'ni har save() darhol commit bo'lardi.
        // Natijada istalgan almashtirish (admin panelidagi "yuqoriga/pastga")
        // birinchi save()dayoq hali eski o'rinni ushlab turgan boshqa status bilan
        // to'qnashib 409 berardi - funksiya amalda HECH QACHON ishlamasdi.
        // (Bu tuzatish 2026-09-12 da qilingan edi, lekin keyingi "server holatini
        // sinxronlash" commit'ida yo'qolib ketgan.)
        //
        // Yechim: (1) kompaniyaning BARCHA statuslari olinadi - so'rovda
        // kelmaganlari o'z nisbiy tartibida oxiriga qo'yiladi (aks holda ular
        // yangi 1..N qiymatlar bilan to'qnashardi); (2) avval hammasi vaqtincha
        // MANFIY qiymatlarga yozilib flush() qilinadi, so'ng haqiqiy 1..N ga.
        // flush() SHART: usiz Hibernate dirty-checking ikkala o'zgarishni bitta
        // UPDATE ga birlashtirib, oraliq manfiy bosqich bazaga hech yetmaydi.
        List<OrderStatus> all = orderStatusRepository.findByCompanyIdOrderBySortOrderAsc(companyId);
        Map<UUID, OrderStatus> byId = new java.util.LinkedHashMap<>();
        all.forEach(s -> byId.put(s.getId(), s));

        List<OrderStatus> ordered = new java.util.ArrayList<>();
        for (String rawId : orderedIds) {
            OrderStatus s = byId.remove(UUID.fromString(rawId));
            if (s != null) {
                ordered.add(s);
            }
        }
        ordered.addAll(byId.values());

        for (int i = 0; i < ordered.size(); i++) {
            ordered.get(i).setSortOrder(-(i + 1));
        }
        orderStatusRepository.saveAllAndFlush(ordered);
        for (int i = 0; i < ordered.size(); i++) {
            ordered.get(i).setSortOrder(i + 1);
        }
        orderStatusRepository.saveAll(ordered);

        return ResponseEntity.ok(Map.of("message", "Statuslar ketma-ketligi muvaffaqiyatli saqlandi"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("@perm.has('orders')")
    public ResponseEntity<?> updateStatus(@PathVariable UUID id, @RequestBody Map<String, Object> request) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        UUID companyId = UUID.fromString(tenantId);
        OrderStatus status = orderStatusRepository.findById(id).orElse(null);
        if (status == null || !status.getCompany().getId().equals(companyId)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Status topilmadi"));
        }

        if (request.containsKey("name_uz")) status.setNameUz(str(request, "name_uz"));
        if (request.containsKey("name_ru")) status.setNameRu(str(request, "name_ru"));
        if (request.containsKey("name_en")) status.setNameEn(str(request, "name_en"));
        if (request.containsKey("color_code")) status.setColorCode(str(request, "color_code"));

        // Rol biriktirish. Bo'sh qator yuborilsa biriktirish OLIB TASHLANADI
        // va bosqich yana tartib raqami mantiqiga qaytadi.
        if (request.containsKey("owner_role_key")) {
            String roleKey = str(request, "owner_role_key");
            if (roleKey != null && !roleExists(companyId, roleKey)) {
                return ResponseEntity.badRequest().body(Map.of("message", "Bunday rol topilmadi: " + roleKey));
            }
            status.setOwnerRoleKey(roleKey);
        }

        if (request.containsKey("is_final")) {
            status.setIsFinal(bool(request, "is_final"));
        }

        OrderStatus saved = orderStatusRepository.save(status);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@perm.has('orders')")
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

        // MUHIM (audit'da topilgan xato, tuzatildi): FAOL (hali kassaga
        // topshirilmagan, paymentStatus != HANDED_OVER) buyurtmalar uchun
        // status'ni null qilib qo'yish xavfli - mobil ilova (OrderZoneBoundary)
        // status=null buyurtmani "hali boshlanmagan" (pickup) zonaga qaytarib
        // qo'yadi, garchi u aslida deyarli tugagan (masalan sexda) bo'lsa ham -
        // buyurtma hech kimning ekranida to'g'ri joyda ko'rinmay "yo'qolib"
        // qoladi. Tarixga o'tgan (HANDED_OVER) buyurtmalar uchun bu xavfsiz
        // (ular endi hech qanday ish oqimida faol emas), shu sabab FAQAT faol
        // buyurtmalari bo'lgan statusni o'chirish taqiqlanadi.
        boolean hasActiveOrders = affectedOrders.stream()
                .anyMatch(order -> !"HANDED_OVER".equals(order.getPaymentStatus()));
        if (hasActiveOrders) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "message", "Bu statusda hali faol (tugallanmagan) buyurtmalar bor - avval ularni boshqa statusga o'tkazing yoki yakunlang"));
        }

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
