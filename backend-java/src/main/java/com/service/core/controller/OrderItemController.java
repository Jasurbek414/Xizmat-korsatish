package com.service.core.controller;

import com.service.core.model.Company;
import com.service.core.model.ItemStage;
import com.service.core.model.Order;
import com.service.core.model.OrderItem;
import com.service.core.model.OrderStatus;
import com.service.core.model.User;
import com.service.core.repository.OrderRepository;
import com.service.core.repository.OrderItemRepository;
import com.service.core.repository.ItemStageRepository;
import com.service.core.repository.OrderStatusRepository;
import com.service.core.repository.UserRepository;
import com.service.core.service.ItemStageSeedService;
import com.service.core.tenant.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

// MUHIM (xavfsizlik, audit'da topilgan): @PreAuthorize yo'qligi sababli
// istalgan autentifikatsiya qilingan xodim (masalan Bugalter) buyurtma
// tarkibidagi mahsulotlarni (gilamlar, o'lchamlar) o'zgartira/o'chira olardi.
@RestController
@RequestMapping("/api/v1/orders/{orderId}/items")
@PreAuthorize("@perm.has('orders','mobile_orders')")
public class OrderItemController {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrderStatusRepository orderStatusRepository;
    private final UserRepository userRepository;
    private final ItemStageRepository itemStageRepository;
    private final ItemStageSeedService itemStageSeedService;

    public OrderItemController(OrderRepository orderRepository, OrderItemRepository orderItemRepository,
                                OrderStatusRepository orderStatusRepository, UserRepository userRepository,
                                ItemStageRepository itemStageRepository, ItemStageSeedService itemStageSeedService) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.orderStatusRepository = orderStatusRepository;
        this.userRepository = userRepository;
        this.itemStageRepository = itemStageRepository;
        this.itemStageSeedService = itemStageSeedService;
    }

    /**
     * Yangi gilam qo'shilganda, agar mijoz (mobil ilova) status kiritmagan
     * bo'lsa - shu kompaniyaning ENG BIRINCHI (sort_order) gilam bosqichi
     * ishlatiladi. Avval bu yerda qattiq kodlangan "ACCEPTED" edi - endi
     * admin "Sozlamalar -> Gilam bosqichlari"da boshqa nom/tartib qo'ysa ham
     * to'g'ri ishlaydi (ItemStageController.getStages() bilan bir xil naqsh).
     */
    private String firstStageKey(Order order) {
        Company company = order.getCompany();
        itemStageSeedService.seedDefaultStagesIfMissing(company);
        List<ItemStage> stages = itemStageRepository.findByCompanyIdOrderBySortOrderAsc(company.getId());
        return stages.isEmpty() ? "ACCEPTED" : stages.get(0).getStageKey();
    }

    private User getCurrentUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (!(principal instanceof String username)) {
            return null;
        }
        return userRepository.findByUsername(username).orElse(null);
    }

    // MUHIM (jonli so'rov: "kim buyurtma olsa, aynan o'sha akkaunt
    // yozilishi kerak"): haydovchidan farqli o'laroq, sex hodimi hech
    // qachon buyurtmani aniq "qabul qilaman" deb bosmaydi - sex navbati
    // (FactoryOrdersScreen) UMUMIY, istalgan sex hodimi istalgan
    // buyurtmani ochib o'lchov/narx kiritishi mumkin. Shu sabab
    // `sexWorker` avtomatik ravishda BIRINCHI marta shu buyurtmaga
    // (o'lchov/narx orqali) tegingan sex hodimiga qarab belgilanadi.
    //
    // MUHIM (jonli xato, DARHOL tuzatildi): bu yerda avval `order.worker`
    // ("hozirgi egasi") HAM sex hodimiga qayta yozib yuborilardi. Lekin
    // mobil ilovaning haydovchi ekrani xuddi shu `worker_id`ni "bu MENING
    // buyurtmam"ligini tekshirish uchun ishlatadi (_isMine) - shu sabab
    // sex hodimi birinchi marta o'lchov kiritgan zahoti, haydovchi
    // buyurtmani "o'zinikidan chiqarib qo'yilgan"dek ko'rib qolar va
    // buyurtma sexdan qaytib kelganda "To'lovni qabul qilish" tugmasi
    // UMUMAN chiqmay qolardi. `worker` endi TEGILMAYDI - faqat `sexWorker`
    // (alohida, qo'shimcha yozuv sifatida) belgilanadi.
    private void autoClaimForSexWorker(Order order) {
        if (order.getSexWorker() != null) {
            return;
        }
        User currentUser = getCurrentUser();
        if (currentUser == null || !"WORKER_SEH".equals(currentUser.getRole())) {
            return;
        }
        order.setSexWorker(currentUser);
        orderRepository.save(order);
    }

    /**
     * Gilam o'lchovlari (OrderItem) o'zgarganda buyurtma narxini xizmat
     * narxidan avtomatik qayta hisoblaydi - sex hodimi narxni qo'lda
     * kiritmasa ham buxgalteriya haqiqiy o'lchovga mos summani ko'radi.
     * Xizmatning o'lchov birligi ("m²"/"kv. metr" - maydon bo'yicha;
     * "dona"/"kg"/"litr"/"metr" - soni bo'yicha) hisoblash rejimini belgilaydi.
     */
    private void recalculatePrice(Order order) {
        if (order.getService() == null) {
            return;
        }

        List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());
        if (items.isEmpty()) {
            // MUHIM (audit'da topilgan): oxirgi mahsulot o'chirilgach bu yerdan
            // shartsiz qaytib ketilardi - natijada buyurtma narxi ESKI (nolga
            // teng bo'lmagan) qiymatda "osilib" qolar edi, garchi endi hech
            // qanday mahsulot biriktirilmagan bo'lsa ham.
            order.setPrice(BigDecimal.ZERO);
            orderRepository.save(order);
            return;
        }

        String unit = order.getService().getMeasurementUnit();
        boolean isAreaBased = "m²".equals(unit) || (unit != null && unit.toLowerCase().replace(".", "").contains("kv"));

        // MUHIM (jonli so'rov bo'yicha qo'shildi): har bir gilam sex xodimi
        // tomonidan ALOHIDA narxlanishi mumkin (item.price). Shu narx
        // qo'yilgan bo'lsa - AYNAN o'sha ishlatiladi; qo'yilmagan (null/0)
        // gilamlar uchun esa avvalgidek xizmat narxi x o'lchov bo'yicha
        // AVTOMATIK hisoblanadi. Buyurtmaning umumiy narxi - shu ikkisining
        // (qo'lda + avtomatik) yig'indisi.
        BigDecimal total = BigDecimal.ZERO;
        for (OrderItem item : items) {
            BigDecimal itemPrice = item.getPrice();
            if (itemPrice != null && itemPrice.compareTo(BigDecimal.ZERO) > 0) {
                total = total.add(itemPrice);
                continue;
            }
            BigDecimal basis = isAreaBased
                    ? item.getLength().multiply(item.getWidth()).multiply(item.getQuantity())
                    : item.getQuantity();
            total = total.add(basis.multiply(order.getService().getPrice()));
        }

        order.setPrice(total);
        orderRepository.save(order);
    }

    /**
     * "dona" (yoki maydon asosli m²/kv. metr) - jismoniy ALOHIDA-ALOHIDA
     * sanaladigan/kuzatiladigan birlik (har biri o'z holati - ACCEPTED/
     * WASHED/... bilan). "kg", "litr", "metr" esa UZLUKSIZ o'lchov -
     * "3.5 kg"ni "3 yoki 4 ta alohida bo'lak" deb ajratishning ma'nosi yo'q,
     * shuning uchun bular BITTA yozuvda kasr miqdor sifatida saqlanadi.
     */
    private boolean isDiscreteUnit(String unit) {
        if (unit == null) return true;
        String normalized = unit.toLowerCase().replace(".", "").trim();
        return normalized.contains("dona") || normalized.equals("m²") || normalized.contains("kv");
    }

    private boolean isOrderPastOrCompleted(Order order) {
        if ("HANDED_OVER".equals(order.getPaymentStatus())) {
            return true;
        }
        if (order.getStatus() != null && order.getCompany() != null) {
            List<com.service.core.model.OrderStatus> sorted = orderStatusRepository.findByCompanyIdOrderBySortOrderAsc(order.getCompany().getId());
            if (!sorted.isEmpty()) {
                com.service.core.model.OrderStatus lastStatus = sorted.get(sorted.size() - 1);
                if (lastStatus.getId().equals(order.getStatus().getId()) && !"PENDING".equals(order.getPaymentStatus())) {
                    return true;
                }
            }
        }
        return false;
    }

    @GetMapping
    public ResponseEntity<?> getItems(@PathVariable UUID orderId) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null || !order.getCompany().getId().equals(UUID.fromString(tenantId))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Buyurtma topilmadi"));
        }

        List<OrderItem> items = orderItemRepository.findByOrderId(orderId);
        return ResponseEntity.ok(items);
    }

    @PostMapping
    public ResponseEntity<?> addItem(@PathVariable UUID orderId, @RequestBody Map<String, Object> request) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null || !order.getCompany().getId().equals(UUID.fromString(tenantId))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Buyurtma topilmadi"));
        }

        if (isOrderPastOrCompleted(order)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Tarixga o'tgan buyurtmaga yangi mahsulot qo'shish taqiqlanadi"));
        }

        String name = request.getOrDefault("name", "Gilam").toString();
        BigDecimal length = request.containsKey("length") ? new BigDecimal(request.get("length").toString()) : BigDecimal.ZERO;
        BigDecimal width = request.containsKey("width") ? new BigDecimal(request.get("width").toString()) : BigDecimal.ZERO;
        BigDecimal quantity;
        try {
            quantity = request.containsKey("quantity") ? new BigDecimal(request.get("quantity").toString()) : BigDecimal.ONE;
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Noto'g'ri miqdor formati"));
        }
        if (quantity.compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "Miqdor musbat bo'lishi shart"));
        }
        String status = request.containsKey("status") ? request.get("status").toString() : firstStageKey(order);

        String unit = order.getService() != null ? order.getService().getMeasurementUnit() : null;
        List<OrderItem> createdItems = new java.util.ArrayList<>();
        if (isDiscreteUnit(unit)) {
            // MUHIM (jonli so'rov bo'yicha qo'shildi): avval "soni=5" BITTA
            // OrderItem yozuviga yozilardi - sex hodimi buni BITTA gilam
            // sifatida ko'rar va o'lchov/narx faqat SHU BITTA yozuvga (demak
            // barcha 5 tasiga BIR XIL o'lchamda) tegishli bo'lardi. Aslida har
            // bir gilamning o'z eni/bo'yi/narxi bor. Shu sabab "5 ta" deb
            // kiritilsa, sex uchun ALOHIDA-ALOHIDA 5 ta yozuv yaratiladi (har
            // biri quantity=1) - har biri mustaqil o'lchanadi va narxlanadi.
            // Faqat "dona"/maydon asosli (m², kv. metr) birliklarda mantiqiy -
            // bular jismoniy sanaladigan/alohida kuzatiladigan buyumlar.
            int rowCount = Math.max(1, quantity.intValue());
            for (int i = 1; i <= rowCount; i++) {
                String itemName = rowCount > 1 ? name + " " + i : name;
                OrderItem item = OrderItem.builder()
                        .order(order)
                        .name(itemName)
                        .length(length)
                        .width(width)
                        .quantity(BigDecimal.ONE)
                        .status(status)
                        .build();
                createdItems.add(orderItemRepository.save(item));
            }
        } else {
            // "kg"/"litr"/"metr" kabi UZLUKSIZ birliklar - "3.5 kg"ni "3-4
            // alohida bo'lak"ka ajratishning ma'nosi yo'q, shuning uchun
            // BITTA yozuvda aniq kasr miqdor sifatida saqlanadi (eni/bo'yi
            // bu birliklar uchun ahamiyatsiz - kiritilmagan bo'lsa 0 qoladi).
            OrderItem item = OrderItem.builder()
                    .order(order)
                    .name(name)
                    .length(length)
                    .width(width)
                    .quantity(quantity)
                    .status(status)
                    .build();
            createdItems.add(orderItemRepository.save(item));
        }
        recalculatePrice(order);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdItems);
    }

    @PutMapping("/{itemId}")
    public ResponseEntity<?> updateItem(@PathVariable UUID orderId, @PathVariable UUID itemId, @RequestBody Map<String, Object> request) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null || !order.getCompany().getId().equals(UUID.fromString(tenantId))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Buyurtma topilmadi"));
        }

        if (isOrderPastOrCompleted(order)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Tarixga o'tgan buyurtma mahsulotlarini o'zgartirish taqiqlanadi"));
        }

        OrderItem item = orderItemRepository.findById(itemId).orElse(null);
        if (item == null || !item.getOrder().getId().equals(orderId)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Mahsulot topilmadi"));
        }

        autoClaimForSexWorker(order);

        if (request.containsKey("name")) {
            item.setName(request.get("name").toString());
        }
        if (request.containsKey("length")) {
            item.setLength(new BigDecimal(request.get("length").toString()));
        }
        if (request.containsKey("width")) {
            item.setWidth(new BigDecimal(request.get("width").toString()));
        }
        if (request.containsKey("quantity")) {
            item.setQuantity(new BigDecimal(request.get("quantity").toString()));
        }
        if (request.containsKey("price")) {
            item.setPrice(new BigDecimal(request.get("price").toString()));
        }
        if (request.containsKey("status")) {
            item.setStatus(request.get("status").toString());
        }

        OrderItem saved = orderItemRepository.save(item);
        recalculatePrice(order);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{itemId}")
    @Transactional
    public ResponseEntity<?> deleteItem(@PathVariable UUID orderId, @PathVariable UUID itemId) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        Order order = orderRepository.findById(orderId).orElse(null);
        if (order == null || !order.getCompany().getId().equals(UUID.fromString(tenantId))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Buyurtma topilmadi"));
        }

        if (isOrderPastOrCompleted(order)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Tarixga o'tgan buyurtma mahsulotlarini o'chirish taqiqlanadi"));
        }

        OrderItem item = orderItemRepository.findById(itemId).orElse(null);
        if (item == null || !item.getOrder().getId().equals(orderId)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Mahsulot topilmadi"));
        }

        // MUHIM (jonli xato: gilam o'chirilgandan keyin ham ro'yxatda qolaverardi):
        // `order` bu so'rov boshida `items`ni EAGER + cascade=ALL bilan
        // yuklab olgan (xotirada eskirgan holatda). Oddiy
        // `orderItemRepository.delete(item)` chaqiruvi entity-darajasida
        // o'chirishga urinar edi, lekin `order.items` kolleksiyasidan
        // orphan sifatida chiqarilmagani sabab Hibernate flush vaqtida
        // buni tiklab (yoki hech qachon flush qilmay) qoldirar edi -
        // natijada API 200 qaytarsa ham bazada hech narsa o'zgarmasdi.
        // To'g'ridan-to'g'ri JPQL bulk-delete + persistence context'ni
        // tozalash (clearAutomatically) bu butun muammoni chetlab
        // o'tadi - entity lifecycle/cascade bilan hech qanday ishi yo'q.
        int deletedCount = orderItemRepository.deleteItemById(orderId, itemId);
        if (deletedCount == 0) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Mahsulot topilmadi"));
        }

        // Kontekst tozalanganidan keyin `order` DETACHED bo'lib qoladi -
        // recalculatePrice() bazadan butunlay TOZA holatda qayta o'qib olishi
        // uchun uni qaytadan yuklaymiz.
        Order freshOrder = orderRepository.findById(orderId).orElse(null);
        if (freshOrder != null) {
            recalculatePrice(freshOrder);
        }
        return ResponseEntity.ok(Map.of("message", "Mahsulot muvaffaqiyatli o'chirildi"));
    }
}
