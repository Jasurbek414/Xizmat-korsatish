package com.service.core.controller;

import com.service.core.model.*;
import com.service.core.repository.*;
import com.service.core.service.PushNotificationService;
import com.service.core.tenant.TenantContext;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    private final OrderRepository orderRepository;
    private final CompanyRepository companyRepository;
    private final ClientRepository clientRepository;
    private final ServiceRepository serviceRepository;
    private final OrderStatusRepository orderStatusRepository;
    private final UserRepository userRepository;
    private final PushNotificationService pushNotificationService;
    private final TransactionRepository transactionRepository;
    private final com.service.core.service.GeocodingService geocodingService;

    public OrderController(OrderRepository orderRepository, CompanyRepository companyRepository,
                           ClientRepository clientRepository, ServiceRepository serviceRepository,
                           OrderStatusRepository orderStatusRepository, UserRepository userRepository,
                           PushNotificationService pushNotificationService, TransactionRepository transactionRepository,
                           com.service.core.service.GeocodingService geocodingService) {
        this.orderRepository = orderRepository;
        this.companyRepository = companyRepository;
        this.clientRepository = clientRepository;
        this.serviceRepository = serviceRepository;
        this.orderStatusRepository = orderStatusRepository;
        this.userRepository = userRepository;
        this.geocodingService = geocodingService;
        this.pushNotificationService = pushNotificationService;
        this.transactionRepository = transactionRepository;
    }

    // MUHIM (jonli xato bo'yicha qo'shildi: "kim buyurtmani olsa, aynan
    // o'sha akkaunt yozilishi kerak" - lekin qaysi ROLDA ekani ham aniq
    // bo'lishi kerak edi): `order.worker` "hozirgi egasi" sifatida eski
    // mantiq bo'yicha ishlashda davom etadi, lekin BUNGA QO'SHIMCHA -
    // worker qaysi rolda ekaniga qarab `driver` yoki `sexWorker`
    // maydonlariga HAM yoziladi va keyinchalik status bosqichi qanday
    // o'zgarsa ham HECH QACHON tozalanmaydi - shu sabab buyurtmada "qaysi
    // haydovchi olib ketgan" va "qaysi sex hodimi ishlagan" doim aniq,
    // bir-biriga aralashmagan holda ko'rinadi.
    private void assignWorker(Order order, User worker) {
        order.setWorker(worker);
        if (worker == null || worker.getRole() == null) {
            return;
        }
        if ("WORKER_DRIVER".equals(worker.getRole())) {
            order.setDriver(worker);
        } else if ("WORKER_SEH".equals(worker.getRole())) {
            order.setSexWorker(worker);
        }
    }

    // MUHIM (jonli so'rov: "kim buyurtma olsa, aynan o'sha akkaunt
    // yozilishi kerak") - OrderItemController.autoClaimForSexWorker() bilan
    // BIR XIL sabab va BIR XIL tuzatish: `order.worker`ga TEGILMAYDI (u
    // mobil ilovada haydovchining "_isMine"/to'lov qabul qilish tugmasi
    // uchun ishlatiladi - shu maydonni bu yerda o'zgartirish buyurtma
    // sexdan haydovchiga qaytganda to'lov tugmasini yashirib qo'yardi).
    // Faqat `sexWorker` (alohida yozuv) belgilanadi.
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

    // MUHIM (xavfsizlik, audit'da topilgan): avval @PreAuthorize yo'q edi -
    // istalgan autentifikatsiya qilingan xodim (masalan haydovchi) kompaniyaning
    // BARCHA buyurtmalarini (mijoz telefoni, narxlar bilan) ko'ra olardi.
    // Bu endpoint faqat veb-admin panel uchun - mobil ilova /my, /available
    // va /completed'dan foydalanadi.
    /**
     * 2026-09-26 audit: ixtiyoriy `limit`, `offset` va `clientId` qo'shildi.
     *
     * Avval bu endpoint hech qanday parametr qabul qilmasdi va BUTUN jadvalni
     * qaytarardi. Mobil ilovada natija: `live_orders_screen` har 15 soniyada
     * butun ro'yxatni qayta yuklardi, `client_detail_screen` esa BITTA mijozning
     * buyurtmalarini ko'rsatish uchun hammasini yuklab telefonda filtrlardi.
     *
     * ORQAGA MOSLIK: parametrlar berilmasa xulq AYNAN avvalgidek qoladi —
     * shuning uchun hozirgi production APK (2.10.30) va veb-admin panel
     * o'zgartirishsiz ishlashda davom etadi.
     */
    @GetMapping
    @PreAuthorize("@perm.has('orders')")
    public ResponseEntity<?> getOrders(
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) Integer offset,
            @RequestParam(required = false) String clientId) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }
        UUID companyId = UUID.fromString(tenantId);

        UUID clientUuid = null;
        if (clientId != null && !clientId.isBlank()) {
            try {
                clientUuid = UUID.fromString(clientId);
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(Map.of("message", "clientId noto'g'ri formatda"));
            }
        }

        // limit berilmasa — cheklovsiz (avvalgi xulq). Berilsa 1..500 oralig'iga
        // qisiladi: 500 dan katta so'rov sahifalashning ma'nosini yo'qotadi va
        // xotirani baribir to'ldiradi.
        final Pageable page;
        if (limit == null) {
            page = null;
        } else {
            int size = Math.max(1, Math.min(limit, 500));
            int from = offset == null ? 0 : Math.max(0, offset);
            // Spring Data sahifa raqami bilan ishlaydi, offset bilan emas —
            // shuning uchun offset sahifa o'lchamiga bo'linadi. Chaqiruvchi
            // offset'ni limit'ga karrali berishi kutiladi (0, 50, 100, ...).
            page = PageRequest.of(from / size, size);
        }

        List<Order> orders;
        if (clientUuid != null) {
            orders = page == null
                    ? orderRepository.findByCompanyIdAndClientIdOrderByCreatedAtDesc(companyId, clientUuid)
                    : orderRepository.findByCompanyIdAndClientIdOrderByCreatedAtDesc(companyId, clientUuid, page);
        } else {
            orders = page == null
                    ? orderRepository.findByCompanyIdOrderByCreatedAtDesc(companyId)
                    : orderRepository.findByCompanyIdOrderByCreatedAtDesc(companyId, page);
        }
        return ResponseEntity.ok(orders);
    }

    // 2026-09-09 ishlash tezligi tuzatishi: boshqaruv paneli bosh ekrani
    // (mobil) avval shu sonlarni ko'rsatish uchun getOrders()'ning BUTUN
    // ro'yxatini (mijoz/xodim ma'lumotlari bilan) yuklab, "bugungi"larni
    // ilova ichida sanardi - endi ikkalasi ham serverda yengil COUNT
    // so'rovlari bilan hisoblanadi.
    @GetMapping("/count")
    @PreAuthorize("@perm.has('orders')")
    public ResponseEntity<?> getOrdersCount() {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }
        UUID companyId = UUID.fromString(tenantId);
        LocalDateTime todayStart = LocalDateTime.now().toLocalDate().atStartOfDay();
        LocalDateTime todayEnd = todayStart.plusDays(1);
        return ResponseEntity.ok(Map.of(
                "total", orderRepository.countByCompanyId(companyId),
                "today", orderRepository.countByCompanyIdAndCreatedAtBetween(companyId, todayStart, todayEnd)
        ));
    }

    /**
     * Mobil ilova uchun: joriy foydalanuvchiga (haydovchi/ishchi) tayinlangan buyurtmalar.
     */
    @GetMapping("/my")
    @PreAuthorize("@perm.has('orders','mobile_orders')")
    public ResponseEntity<?> getMyOrders() {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        User currentUser = getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Foydalanuvchi topilmadi"));
        }

        List<Order> orders = orderRepository.findByCompanyIdAndWorkerId(UUID.fromString(tenantId), currentUser.getId());
        return ResponseEntity.ok(orders);
    }

    /**
     * Dispatch pool: kompaniyaning BARCHA faol buyurtmalari.
     * Har bir haydovchi ko'radi va bo'shini o'ziga qabul qila oladi.
     */
    @GetMapping("/available")
    @PreAuthorize("@perm.has('orders','mobile_orders')")
    public ResponseEntity<?> getAvailableOrders() {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }
        List<Order> orders = orderRepository.findByCompanyIdAndPaymentStatus(UUID.fromString(tenantId), "PENDING");
        return ResponseEntity.ok(orders);
    }

    /**
     * Tarix bo'limi: to'langan yoki topshirilgan buyurtmalar (COLLECTED yoki HANDED_OVER).
     */
    @GetMapping("/completed")
    @PreAuthorize("@perm.has('orders','mobile_orders')")
    public ResponseEntity<?> getCompletedOrders() {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }
        List<Order> orders = orderRepository.findCompletedByCompanyId(UUID.fromString(tenantId));
        return ResponseEntity.ok(orders);
    }

    /**
     * Haydovchi buyurtmani O'ZIGA qabul qiladi (self-assign).
     * Faqat tayinlanmagan (workerId = null) buyurtmani qabul qilish mumkin.
     */
    @PutMapping("/{id}/accept")
    @PreAuthorize("@perm.has('orders','mobile_orders')")
    @Transactional
    public ResponseEntity<?> acceptOrder(@PathVariable UUID id) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        User currentUser = getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Foydalanuvchi topilmadi"));
        }

        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || !order.getCompany().getId().equals(UUID.fromString(tenantId))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Buyurtma topilmadi"));
        }

        // MUHIM (jonli xato, tuzatildi): avval `order.getWorker()` (umumiy
        // "hozirgi egasi") tekshirilardi - lekin bu maydonda SEX HODIMI ham
        // turishi mumkin (masalan mijoz gilamni to'g'ridan-to'g'ri sexga
        // olib kelgan, haydovchisiz "yo'lga tushgan" buyurtma). Bunday
        // holatda buyurtma sex ishini tugatib "yetkazish" bosqichiga
        // chiqqanda ham, hech qanday haydovchi uni HECH QACHON qabul qila
        // olmasdi (har doim "band" ko'rinardi, garchi HAYDOVCHISI umuman
        // yo'q bo'lsa ham). Endi faqat `driver` maydoni tekshiriladi - sex
        // hodimi band qilgani haydovchiga to'sqinlik qilmaydi.
        if (order.getDriver() != null) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "Bu buyurtma allaqachon boshqa haydovchiga biriktirilgan"));
        }

        assignWorker(order, currentUser);
        orderRepository.save(order);
        return ResponseEntity.ok(order);
    }

    @PostMapping
    @PreAuthorize("@perm.has('orders','mobile_orders')")
    public ResponseEntity<?> createOrder(@RequestBody Map<String, Object> request) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        String clientIdStr = (String) request.get("client_id");
        String serviceIdStr = (String) request.get("service_id");
        String workerIdStr = (String) request.get("worker_id");
        String address = (String) request.get("address");
        String description = (String) request.get("description");
        Object priceObj = request.get("price");

        if (clientIdStr == null || serviceIdStr == null || address == null || priceObj == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Majburiy maydonlarni kiritish shart"));
        }

        UUID companyId = UUID.fromString(tenantId);
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Kompaniya topilmadi"));

        // MUHIM (xavfsizlik, audit'da topilgan IDOR): mijoz/xizmat/kuryer
        // ID'lari mijozdan (request body) keladi - avval bular BOSHQA
        // kompaniyaga tegishli bo'lsa ham findById muvaffaqiyatli bo'lib,
        // boshqa tenant'ning ma'lumotlari shu buyurtmaga bog'lanib qolardi
        // (masalan A kompaniya B kompaniyaning xodimini o'ziga "kuryer"
        // sifatida biriktirishi mumkin edi). Har biri endi joriy JWT
        // tenant'iga tegishli ekanligi aniq tekshiriladi.
        Client client = clientRepository.findById(UUID.fromString(clientIdStr))
                .filter(c -> c.getCompany().getId().equals(companyId))
                .orElseThrow(() -> new RuntimeException("Mijoz topilmadi"));

        ServiceEntity service = serviceRepository.findById(UUID.fromString(serviceIdStr))
                .filter(s -> s.getCompany().getId().equals(companyId))
                .orElseThrow(() -> new RuntimeException("Xizmat topilmadi"));

        User worker = null;
        if (workerIdStr != null && !workerIdStr.trim().isEmpty()) {
            worker = userRepository.findById(UUID.fromString(workerIdStr))
                    .filter(w -> w.getCompany() != null && w.getCompany().getId().equals(companyId))
                    .orElseThrow(() -> new RuntimeException("Kuryer topilmadi"));
        }

        List<OrderStatus> statuses = orderStatusRepository.findByCompanyIdOrderBySortOrderAsc(companyId);
        if (statuses.isEmpty()) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Statuslar katalogni sozlash shart (OrderStatus)"));
        }
        OrderStatus firstStatus = statuses.get(0);

        Order order = Order.builder()
                .company(company)
                .client(client)
                .service(service)
                .status(firstStatus)
                .worker(worker)
                .price(new BigDecimal(priceObj.toString()))
                .address(address)
                .description(description)
                // MUHIM (audit'da topilgan, tuzatildi): mijoz uchun avvalgi
                // buyurtmada haydovchi GPS orqali aniq lokatsiyani belgilagan
                // bo'lsa (updateOrderLocation - mijozning o'ziga saqlanadi),
                // bu yangi buyurtmaga hech qachon ko'chirilmasdi - har safar
                // yana YANGIDAN belgilash kerak bo'lardi, garchi butun
                // funksiyaning maqsadi aynan "keyingi buyurtmalarda qayta
                // ishlatish" bo'lsa ham. client null bo'lsa ham
                // getLatitude()/getLongitude() xavfsiz null qaytaradi.
                .latitude(client.getLatitude())
                .longitude(client.getLongitude())
                // Admin panelidagi kalendar orqali eski kunga buyurtma kiritish.
                // Berilmasa null qoladi va @PrePersist joriy vaqtni qo'yadi.
                .createdAt(parseBackdate(request.get("created_at")))
                .build();

        if (worker != null) {
            if ("WORKER_DRIVER".equals(worker.getRole())) {
                order.setDriver(worker);
            } else if ("WORKER_SEH".equals(worker.getRole())) {
                order.setSexWorker(worker);
            }
        }

        Order saved = orderRepository.save(order);

        if (worker != null) {
            pushNotificationService.notifyOrderAssigned(saved);
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    /**
     * Kalendar orqali kiritilgan "eski sana"ni o'qiydi.
     *
     * Ikkala format ham qabul qilinadi: to'liq ISO vaqt ("2026-07-20T14:30")
     * va faqat sana ("2026-07-20"). Faqat sana berilganda o'sha kunning
     * JORIY SOAT-DAQIQASI qo'yiladi - `atStartOfDay()` ishlatilsa bir kunga
     * kiritilgan barcha buyurtmalar bir xil vaqt oladi va ro'yxatda tartibi
     * beqaror bo'lib qolardi.
     *
     * Kelajak sana ATAYIN rad etiladi: bu maydon o'tgan kunni qayd etish
     * uchun, hisobotlarni oldinga surib yuborish uchun emas.
     */
    private LocalDateTime parseBackdate(Object raw) {
        if (raw == null) return null;
        String value = raw.toString().trim();
        if (value.isEmpty()) return null;

        LocalDateTime parsed;
        try {
            parsed = value.length() <= 10
                    ? java.time.LocalDate.parse(value).atTime(java.time.LocalTime.now())
                    : LocalDateTime.parse(value);
        } catch (java.time.format.DateTimeParseException e) {
            return null;
        }

        return parsed.isAfter(LocalDateTime.now()) ? null : parsed;
    }

    // MUHIM (xavfsizlik, audit'da topilgan): avval hech qanday ruxsat
    // tekshiruvi yo'q edi - buyurtmalarga aloqasi bo'lmagan har qanday xodim
    // (masalan Bugalter) istalgan buyurtma statusini o'zgartira olardi.
    // Egalik tekshiruvi ATAYIN qo'yilmagan: sex hodimi o'ziga BIRIKTIRILMAGAN
    // (worker = haydovchi) buyurtmalarning statusini yangilashi kerak.
    @PutMapping("/{id}/status")
    @PreAuthorize("@perm.has('orders','mobile_orders')")
    public ResponseEntity<?> updateStatus(@PathVariable UUID id, @RequestBody Map<String, String> request) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        String statusIdStr = request.get("status_id");
        if (statusIdStr == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "status_id kiritilishi shart"));
        }

        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || !order.getCompany().getId().equals(UUID.fromString(tenantId))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Buyurtma topilmadi"));
        }

        if ("HANDED_OVER".equals(order.getPaymentStatus())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Tarixga o'tgan (kassaga topshirilgan) buyurtma statusini o'zgartirish taqiqlanadi"));
        }

        OrderStatus status = orderStatusRepository.findById(UUID.fromString(statusIdStr))
                .filter(s -> s.getCompany().getId().equals(UUID.fromString(tenantId)))
                .orElseThrow(() -> new RuntimeException("Status topilmadi"));

        order.setStatus(status);
        stampWorkshopEntryIfNeeded(order, status);
        orderRepository.save(order);

        return ResponseEntity.ok(order);
    }

    /**
     * MUHIM (audit: "sexda birinchi kelgan gilam oxirga qolib ketadi" muammosi
     * uchun): mobil ilova (FactoryOrdersScreen) sex navbatini buyurtma
     * YARATILGAN vaqti (createdAt) bo'yicha saralardi - lekin bu chaqiruv
     * qabul qilingan payt, haydovchi gilamni HAQIQATDA sexga olib kelgan payt
     * emas (ular orasida soatlab, hatto kunlab farq bo'lishi mumkin). Endi
     * buyurtma statusi birinchi marta "sex zonasi"ga (barcha statuslarning
     * o'rtadagi 1/3 qismi - xuddi mobil FactoryOrdersScreen/DriverOrdersScreen
     * ishlatadigan formula bilan BIR XIL) o'tganda workshopEnteredAt BIR
     * MARTA qayd etiladi - bu esa haqiqiy jismoniy kelish tartibini
     * ifodalaydi va navbatni to'g'ri (FIFO) saralash imkonini beradi.
     */
    private void stampWorkshopEntryIfNeeded(Order order, OrderStatus newStatus) {
        if (order.getWorkshopEnteredAt() != null) {
            return;
        }
        List<OrderStatus> sorted = orderStatusRepository.findByCompanyIdOrderBySortOrderAsc(order.getCompany().getId());
        if (sorted.size() < 3) {
            return;
        }
        int lowerBoundSortOrder = sorted.get(sorted.size() / 3).getSortOrder();
        if (newStatus.getSortOrder() >= lowerBoundSortOrder) {
            order.setWorkshopEnteredAt(java.time.LocalDateTime.now());
        }
    }

    @PutMapping("/{id}/worker")
    @PreAuthorize("@perm.has('orders')")
    public ResponseEntity<?> updateWorker(@PathVariable UUID id, @RequestBody Map<String, String> request) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        String workerIdStr = request.get("worker_id");
        if (workerIdStr == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "worker_id kiritilishi shart"));
        }

        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || !order.getCompany().getId().equals(UUID.fromString(tenantId))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Buyurtma topilmadi"));
        }

        User worker = userRepository.findById(UUID.fromString(workerIdStr))
                .filter(w -> w.getCompany() != null && w.getCompany().getId().equals(UUID.fromString(tenantId)))
                .orElseThrow(() -> new RuntimeException("Kuryer topilmadi"));

        assignWorker(order, worker);
        orderRepository.save(order);
        pushNotificationService.notifyOrderAssigned(order);

        return ResponseEntity.ok(order);
    }

    @PutMapping("/{id}")
    @PreAuthorize("@perm.has('orders')")
    public ResponseEntity<?> updateOrder(@PathVariable UUID id, @RequestBody Map<String, Object> request) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || !order.getCompany().getId().equals(UUID.fromString(tenantId))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Buyurtma topilmadi"));
        }

        String serviceIdStr = (String) request.get("service_id");
        String workerIdStr = (String) request.get("worker_id");
        String address = (String) request.get("address");
        String description = (String) request.get("description");
        Object priceObj = request.get("price");

        if (serviceIdStr != null) {
            ServiceEntity service = serviceRepository.findById(UUID.fromString(serviceIdStr))
                    .filter(s -> s.getCompany().getId().equals(UUID.fromString(tenantId)))
                    .orElseThrow(() -> new RuntimeException("Xizmat topilmadi"));
            order.setService(service);
        }

        if (priceObj != null) {
            order.setPrice(new BigDecimal(priceObj.toString()));
        }

        if (address != null) {
            order.setAddress(address);
        }

        if (description != null) {
            order.setDescription(description);
        }

        if (workerIdStr != null && !workerIdStr.trim().isEmpty()) {
            User worker = userRepository.findById(UUID.fromString(workerIdStr))
                    .filter(w -> w.getCompany() != null && w.getCompany().getId().equals(UUID.fromString(tenantId)))
                    .orElseThrow(() -> new RuntimeException("Kuryer topilmadi"));
            assignWorker(order, worker);
        } else if (request.containsKey("worker_id")) {
            order.setWorker(null);
        }

        Order saved = orderRepository.save(order);
        return ResponseEntity.ok(saved);
    }

    /**
     * Mobil ilova uchun: buyurtma narxini va izohini yangilash.
     * Haydovchi va ishchi o'z buyurtmasining narxini o'zgartirishi mumkin.
     * Tarixga o'tgan (kassaga topshirilgan) buyurtmalarda narx o'zgartirish taqiqlanadi.
     */
    // MUHIM (xavfsizlik, audit'da topilgan): avval hech qanday ruxsat
    // tekshiruvi yo'q edi. Egalik tekshiruvi qo'yilmagan, chunki sex hodimi
    // o'ziga biriktirilmagan buyurtmaning narxini o'lchovdan keyin belgilaydi
    // (FactoryOrderDetailScreen) - lekin hech bo'lmaganda buyurtma bilan
    // ishlash huquqi talab qilinadi.
    @PutMapping("/{id}/price")
    @PreAuthorize("@perm.has('orders','mobile_orders')")
    public ResponseEntity<?> updateOrderPrice(@PathVariable UUID id, @RequestBody Map<String, Object> request) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || !order.getCompany().getId().equals(UUID.fromString(tenantId))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Buyurtma topilmadi"));
        }

        if ("HANDED_OVER".equals(order.getPaymentStatus())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Tarixga o'tgan buyurtma narxini o'zgartirish taqiqlanadi"));
        }

        autoClaimForSexWorker(order);

        Object priceObj = request.get("price");
        if (priceObj == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Yangi narx kiritilishi shart"));
        }

        order.setPrice(new BigDecimal(priceObj.toString()));

        if (request.containsKey("description")) {
            order.setDescription((String) request.get("description"));
        }

        Order saved = orderRepository.save(order);
        return ResponseEntity.ok(saved);
    }

    /**
     * Haydovchi mijoz manziliga BORGANDA, telefonning joriy GPS
     * koordinatasini shu buyurtmaga (va - keyingi barcha buyurtmalarda ham
     * ishlatilishi uchun - mijozning o'ziga) yozib qo'yadi. Matn manzil
     * ("address") ko'pincha noaniq/adashtiruvchi bo'ladi - aniq nuqta
     * saqlanganidan keyin xarita navigatsiyasi (mobil ilovadagi "Yo'l
     * ko'rsatish" tugmasi) to'g'ridan-to'g'ri shu koordinataga olib boradi.
     */
    @PutMapping("/{id}/location")
    @PreAuthorize("@perm.has('orders','mobile_orders')")
    @Transactional
    public ResponseEntity<?> updateOrderLocation(@PathVariable UUID id, @RequestBody Map<String, Object> request) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        Object latObj = request.get("latitude");
        Object lngObj = request.get("longitude");
        if (latObj == null || lngObj == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "latitude va longitude kiritilishi shart"));
        }

        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || !order.getCompany().getId().equals(UUID.fromString(tenantId))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Buyurtma topilmadi"));
        }

        double latitude = Double.parseDouble(latObj.toString());
        double longitude = Double.parseDouble(lngObj.toString());

        order.setLatitude(latitude);
        order.setLongitude(longitude);
        Order saved = orderRepository.save(order);

        if (order.getClient() != null) {
            Client client = order.getClient();
            client.setLatitude(latitude);
            client.setLongitude(longitude);
            // MUHIM (jonli so'rov bo'yicha qo'shildi): koordinata belgilangach
            // mijozning MATN manzili shu aniq nuqtadan HISOBLANADI (teskari
            // geokodlash) - qo'lda kiritilgan, ko'pincha noaniq/eski manzil
            // o'rniga. Xizmat javob bermasa (tarmoq/limit) jimgina eski
            // matnni saqlab qolamiz - koordinatani saqlashning o'zi buni
            // kutmasligi kerak.
            String geocodedAddress = geocodingService.reverseGeocode(latitude, longitude);
            if (geocodedAddress != null) {
                client.setAddress(geocodedAddress);
            }
            clientRepository.save(client);
        }

        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@perm.has('orders')")
    public ResponseEntity<?> deleteOrder(@PathVariable UUID id) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || !order.getCompany().getId().equals(UUID.fromString(tenantId))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Buyurtma topilmadi"));
        }

        orderRepository.delete(order);
        return ResponseEntity.ok(Map.of("message", "Buyurtma muvaffaqiyatli o'chirildi"));
    }

    /**
     * Mobil ilova uchun: haydovchi/ishchi o'ziga tayinlangan buyurtmani rad etadi.
     * Faqat aynan shu buyurtmaga tayinlangan xodimning o'zi bajarishi mumkin.
     */
    @PutMapping("/{id}/reject")
    @PreAuthorize("@perm.has('orders','mobile_orders')")
    public ResponseEntity<?> rejectOrder(@PathVariable UUID id) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || !order.getCompany().getId().equals(UUID.fromString(tenantId))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Buyurtma topilmadi"));
        }

        User currentUser = getCurrentUser();
        if (currentUser == null || order.getWorker() == null || !order.getWorker().getId().equals(currentUser.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Bu buyurtma sizga tayinlanmagan"));
        }

        order.setWorker(null);
        Order saved = orderRepository.save(order);
        return ResponseEntity.ok(saved);
    }

    /**
     * Haydovchi/ishchi mijozdan naqd pul yig'ib olganini belgilaydi (mobil).
     * MUHIM (xavfsizlik va moliyaviy audit'da topilgan ikkita xato, tuzatildi):
     * 1) Avval egalik tekshiruvi yo'q edi - istalgan xodim o'ziga
     *    tayinlanmagan buyurtmaning "yig'ilgan summasi"ni o'zgartira olardi.
     *    Endi faqat shu buyurtmaga tayinlangan xodimning o'zi chaqira oladi
     *    (frontend'da bu endpoint faqat mobil haydovchi ekranidan
     *    chaqiriladi - veb-admin panelida ishlatilmaydi).
     * 2) Avval HANDED_OVER (kassaga topshirilgan, Transaction allaqachon
     *    yozilgan) buyurtma uchun ham qayta chaqirish mumkin edi - bu
     *    paymentStatus'ni "COLLECTED"ga qaytarib, confirm-handover'ni QAYTA
     *    chaqirish orqali BIR XIL buyurtma uchun IKKINCHI marta INCOME
     *    tranzaksiyasi yozilishiga (balansni sun'iy oshirishga) olib
     *    kelardi. Boshqa shu turdagi endpointlar (updateStatus,
     *    updateOrderPrice) qanday himoyalangan bo'lsa, shu yerda ham xuddi
     *    shunday HANDED_OVER holatida rad etiladi.
     */
    @PutMapping("/{id}/collect-payment")
    @PreAuthorize("@perm.has('orders','mobile_orders')")
    public ResponseEntity<?> collectPayment(@PathVariable UUID id, @RequestBody Map<String, Object> request) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || !order.getCompany().getId().equals(UUID.fromString(tenantId))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Buyurtma topilmadi"));
        }

        User currentUser = getCurrentUser();
        boolean isAssignedWorker = currentUser != null && order.getWorker() != null
                && order.getWorker().getId().equals(currentUser.getId());
        if (!isAssignedWorker) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Bu buyurtma sizga tayinlanmagan"));
        }

        if ("HANDED_OVER".equals(order.getPaymentStatus())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Tarixga o'tgan (kassaga topshirilgan) buyurtma uchun to'lov qayta qabul qilinmaydi"));
        }

        Object amountObj = request.get("amount");
        if (amountObj == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Summa yuborilishi shart"));
        }

        BigDecimal amount;
        try {
            amount = new BigDecimal(amountObj.toString());
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Noto'g'ri summa formati"));
        }
        if (amount.compareTo(BigDecimal.ZERO) < 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "Summa manfiy bo'lishi mumkin emas"));
        }

        // To'lov usuli - naqd/karta/aralash (ixtiyoriy, berilmasa eski
        // xatti-harakat bilan mos kelishi uchun standart CASH deb olinadi).
        String paymentMethod = request.get("payment_method") != null
                ? request.get("payment_method").toString().trim().toUpperCase() : "CASH";
        if (!Set.of("CASH", "CARD", "MIXED").contains(paymentMethod)) {
            return ResponseEntity.badRequest().body(Map.of("message", "To'lov usuli CASH, CARD yoki MIXED bo'lishi kerak"));
        }

        BigDecimal cashAmount;
        BigDecimal cardAmount;
        if ("MIXED".equals(paymentMethod)) {
            Object cashObj = request.get("cash_amount");
            Object cardObj = request.get("card_amount");
            if (cashObj == null || cardObj == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "Aralash to'lovda naqd va karta summasi kiritilishi shart"));
            }
            try {
                cashAmount = new BigDecimal(cashObj.toString());
                cardAmount = new BigDecimal(cardObj.toString());
            } catch (NumberFormatException e) {
                return ResponseEntity.badRequest().body(Map.of("message", "Noto'g'ri summa formati"));
            }
            if (cashAmount.compareTo(BigDecimal.ZERO) < 0 || cardAmount.compareTo(BigDecimal.ZERO) < 0) {
                return ResponseEntity.badRequest().body(Map.of("message", "Summalar manfiy bo'lishi mumkin emas"));
            }
            if (cashAmount.add(cardAmount).compareTo(amount) != 0) {
                return ResponseEntity.badRequest().body(Map.of("message", "Naqd + karta summasi jami summaga teng bo'lishi shart"));
            }
        } else if ("CARD".equals(paymentMethod)) {
            cashAmount = BigDecimal.ZERO;
            cardAmount = amount;
        } else {
            cashAmount = amount;
            cardAmount = BigDecimal.ZERO;
        }

        order.setCollectedPrice(amount);
        order.setPaymentStatus("COLLECTED");
        order.setPaymentMethod(paymentMethod);
        order.setCashAmount(cashAmount);
        order.setCardAmount(cardAmount);
        // Xodim qo'lida pul QANCHA vaqtdan beri turgani shu payt bo'yicha
        // hisoblanadi (Order.paymentCollectedAt izohiga qarang) - `updatedAt`
        // bilan farqli o'laroq, bu maydon KEYINGI (masalan izoh tahrirlash
        // kabi) saqlashlarda o'zgarmaydi.
        order.setPaymentCollectedAt(LocalDateTime.now());
        Order saved = orderRepository.save(order);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}/confirm-handover")
    @PreAuthorize("@perm.has('orders')")
    @Transactional
    public ResponseEntity<?> confirmHandover(@PathVariable UUID id, @RequestBody(required = false) Map<String, Object> request) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }
        Order order = orderRepository.findById(id).orElse(null);
        if (order == null || !order.getCompany().getId().equals(UUID.fromString(tenantId))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Buyurtma topilmadi"));
        }

        if (!"COLLECTED".equals(order.getPaymentStatus())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Bu buyurtma to'lovi topshirish kutilayotgan holatda emas"));
        }

        // Kassaga qabul qilgan ANIQ xodim (buxgalter/admin) - moliyaviy audit
        // uchun ("bu naqd pulni kim qabul qildi" degan savolga javob).
        User currentUser = getCurrentUser();

        BigDecimal actualAmount = order.getCollectedPrice();
        if (request != null && request.containsKey("actual_amount")) {
            try {
                actualAmount = new BigDecimal(request.get("actual_amount").toString());
            } catch (Exception e) {
                return ResponseEntity.badRequest().body(Map.of("message", "Noto'g'ri summa formati"));
            }
        }

        order.setCollectedPrice(actualAmount);
        order.setPaymentStatus("HANDED_OVER");
        Order savedOrder = orderRepository.save(order);

        // Create Transaction - tavsif haydovchi tanlagan to'lov usuliga qarab
        // ("naqd pul" deb yozilaversa, karta orqali kelgan to'lov uchun ham
        // moliya jurnalida chalg'ituvchi bo'lardi).
        String methodLabel = switch (order.getPaymentMethod() != null ? order.getPaymentMethod() : "CASH") {
            case "CARD" -> "karta orqali";
            case "MIXED" -> "aralash (naqd + karta) to'lov";
            default -> "naqd pul";
        };
        Transaction transaction = Transaction.builder()
                .company(order.getCompany())
                .order(order)
                .type("INCOME")
                .amount(actualAmount)
                .category("ORDER_PAYMENT")
                .description("Kuryerdan topshirib olingan " + methodLabel + ": Buyurtma #" + order.getId().toString().substring(0, 8))
                .status("CONFIRMED")
                .paymentMethod(order.getPaymentMethod())
                .cashAmount(order.getCashAmount())
                .cardAmount(order.getCardAmount())
                .createdByName(currentUser != null ? currentUser.getFullName() : null)
                .confirmedByName(currentUser != null ? currentUser.getFullName() : null)
                .build();
        transactionRepository.save(transaction);

        return ResponseEntity.ok(savedOrder);
    }

    @GetMapping("/pending-handovers")
    @PreAuthorize("@perm.has('orders')")
    public ResponseEntity<?> getPendingHandovers() {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        List<Order> orders = orderRepository.findByCompanyIdAndPaymentStatus(UUID.fromString(tenantId), "COLLECTED");
        return ResponseEntity.ok(orders);
    }

    private User getCurrentUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (!(principal instanceof String username)) {
            return null;
        }
        Optional<User> userOpt = userRepository.findByUsername(username);
        return userOpt.orElse(null);
    }
}
