package com.service.core.model;

import jakarta.persistence.*;
import lombok.*;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "order_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    @JsonIgnoreProperties("items")
    private Order order;

    @Column(nullable = false, length = 255)
    @Builder.Default
    private String name = "Gilam";

    @Column(precision = 6, scale = 2)
    @Builder.Default
    private BigDecimal length = BigDecimal.ZERO;

    @Column(precision = 6, scale = 2)
    @Builder.Default
    private BigDecimal width = BigDecimal.ZERO;

    @Column(nullable = false)
    @Builder.Default
    private Integer quantity = 1;

    @Column(nullable = false, length = 50)
    @Builder.Default
    private String status = "ACCEPTED"; // ACCEPTED, WASHED, DRIED, READY

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
