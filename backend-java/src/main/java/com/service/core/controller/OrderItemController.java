package com.service.core.controller;

import com.service.core.model.Order;
import com.service.core.model.OrderItem;
import com.service.core.model.OrderStatus;
import com.service.core.repository.OrderRepository;
import com.service.core.repository.OrderItemRepository;
import com.service.core.repository.OrderStatusRepository;
import com.service.core.tenant.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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

    public OrderItemController(OrderRepository orderRepository, OrderItemRepository orderItemRepository, OrderStatusRepository orderStatusRepository) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.orderStatusRepository = orderStatusRepository;
    }

    /**
     * Gilam o'lchovlari (OrderItem) o'zgarganda buyurtma narxini xizmat
     * narxidan avtomatik qayta hisoblaydi - sex hodimi narxni qo'lda
     * kiritmasa ham buxgalteriya haqiqiy o'lchovga mos summani ko'radi.
     * Xizmatning o'lchov birligi ("m²"/"kv. metr" - maydon bo'yicha;
     * "dona"/"kg"/"litr"/"metr" - soni bo'yicha) hisoblash rejimini belgilaydi.
     */
    private void recalculatePrice(Order order) {
        List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());
        if (items.isEmpty() || order.getService() == null) {
            return;
        }

        String unit = order.getService().getMeasurementUnit();
        boolean isAreaBased = "m²".equals(unit) || (unit != null && unit.toLowerCase().replace(".", "").contains("kv"));

        BigDecimal total;
        if (isAreaBased) {
            total = items.stream()
                    .map(i -> i.getLength().multiply(i.getWidth()).multiply(BigDecimal.valueOf(i.getQuantity())))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        } else {
            total = BigDecimal.valueOf(items.stream().mapToInt(OrderItem::getQuantity).sum());
        }

        order.setPrice(total.multiply(order.getService().getPrice()));
        orderRepository.save(order);
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
        Integer quantity = request.containsKey("quantity") ? Integer.parseInt(request.get("quantity").toString()) : 1;
        String status = request.getOrDefault("status", "ACCEPTED").toString();

        OrderItem item = OrderItem.builder()
                .order(order)
                .name(name)
                .length(length)
                .width(width)
                .quantity(quantity)
                .status(status)
                .build();

        OrderItem saved = orderItemRepository.save(item);
        recalculatePrice(order);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
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
            item.setQuantity(Integer.parseInt(request.get("quantity").toString()));
        }
        if (request.containsKey("status")) {
            item.setStatus(request.get("status").toString());
        }

        OrderItem saved = orderItemRepository.save(item);
        recalculatePrice(order);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{itemId}")
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

        orderItemRepository.delete(item);
        recalculatePrice(order);
        return ResponseEntity.ok(Map.of("message", "Mahsulot muvaffaqiyatli o'chirildi"));
    }
}
