package com.service.core.controller;

import com.service.core.model.Order;
import com.service.core.model.OrderItem;
import com.service.core.repository.OrderRepository;
import com.service.core.repository.OrderItemRepository;
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
@RequestMapping("/api/v1/orders/{orderId}/items")
public class OrderItemController {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;

    public OrderItemController(OrderRepository orderRepository, OrderItemRepository orderItemRepository) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
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

        OrderItem item = orderItemRepository.findById(itemId).orElse(null);
        if (item == null || !item.getOrder().getId().equals(orderId)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Mahsulot topilmadi"));
        }

        orderItemRepository.delete(item);
        return ResponseEntity.ok(Map.of("message", "Mahsulot muvaffaqiyatli o'chirildi"));
    }
}
