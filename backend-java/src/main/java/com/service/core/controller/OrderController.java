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
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMIN','MANAGER','DISPATCHER','WORKER_DRIVER','WORKER_FACTORY','WORKER_SEH')")
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

        Client client = clientRepository.findById(UUID.fromString(clientIdStr))
                .orElseThrow(() -> new RuntimeException("Mijoz topilmadi"));

        ServiceEntity service = serviceRepository.findById(UUID.fromString(serviceIdStr))
                .orElseThrow(() -> new RuntimeException("Xizmat topilmadi"));

        User worker = null;
        if (workerIdStr != null && !workerIdStr.trim().isEmpty()) {
            worker = userRepository.findById(UUID.fromString(workerIdStr))
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
            pushNotificationService.notifyOrderAssigned(worker, saved.getAddress(), saved.getPrice().toString());
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
                .orElseThrow(() -> new RuntimeException("Status topilmadi"));

        order.setStatus(status);
        orderRepository.save(order);

        return ResponseEntity.ok(order);
    }

    @PutMapping("/{id}/worker")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMIN','MANAGER','DISPATCHER')")
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
                .orElseThrow(() -> new RuntimeException("Kuryer topilmadi"));

        order.setWorker(worker);
        orderRepository.save(order);
        pushNotificationService.notifyOrderAssigned(worker, order.getAddress(), order.getPrice().toString());

        return ResponseEntity.ok(order);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMIN','MANAGER','DISPATCHER')")
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
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMIN','MANAGER')")
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

        Object amountObj = request.get("amount");
        if (amountObj == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Summa yuborilishi shart"));
        }

        BigDecimal amount = new BigDecimal(amountObj.toString());
        order.setCollectedPrice(amount);
        order.setPaymentStatus("COLLECTED");
        Order saved = orderRepository.save(order);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}/confirm-handover")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMIN','MANAGER','DISPATCHER')")
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
                .build();
        transactionRepository.save(transaction);

        return ResponseEntity.ok(savedOrder);
    }

    @GetMapping("/pending-handovers")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMIN','MANAGER')")
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
