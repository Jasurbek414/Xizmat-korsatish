package com.service.core.controller;

import com.service.core.model.*;
import com.service.core.repository.*;
import com.service.core.service.PushNotificationService;
import com.service.core.tenant.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
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

    public OrderController(OrderRepository orderRepository, CompanyRepository companyRepository,
                           ClientRepository clientRepository, ServiceRepository serviceRepository,
                           OrderStatusRepository orderStatusRepository, UserRepository userRepository,
                           PushNotificationService pushNotificationService, TransactionRepository transactionRepository) {
        this.orderRepository = orderRepository;
        this.companyRepository = companyRepository;
        this.clientRepository = clientRepository;
        this.serviceRepository = serviceRepository;
        this.orderStatusRepository = orderStatusRepository;
        this.userRepository = userRepository;
        this.pushNotificationService = pushNotificationService;
        this.transactionRepository = transactionRepository;
    }

    @GetMapping
    public ResponseEntity<?> getOrders() {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        List<Order> orders = orderRepository.findByCompanyId(UUID.fromString(tenantId));
        return ResponseEntity.ok(orders);
    }

    /**
     * Mobil ilova uchun: joriy foydalanuvchiga (haydovchi/ishchi) tayinlangan buyurtmalar.
     */
    @GetMapping("/my")
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

        if (order.getWorker() != null) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "Bu buyurtma allaqachon boshqa haydovchiga biriktirilgan"));
        }

        order.setWorker(currentUser);
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
                .build();

        Order saved = orderRepository.save(order);

        if (worker != null) {
            pushNotificationService.notifyOrderAssigned(saved);
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}/status")
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

        order.setWorker(worker);
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
            order.setWorker(worker);
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
    @PutMapping("/{id}/price")
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

        order.setCollectedPrice(amount);
        order.setPaymentStatus("COLLECTED");
        Order saved = orderRepository.save(order);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}/confirm-handover")
    @PreAuthorize("@perm.has('orders')")
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

        // Create Transaction
        Transaction transaction = Transaction.builder()
                .company(order.getCompany())
                .order(order)
                .type("INCOME")
                .amount(actualAmount)
                .category("ORDER_PAYMENT")
                .description("Kuryerdan topshirib olingan naqd pul: Buyurtma #" + order.getId().toString().substring(0, 8))
                .status("CONFIRMED")
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
