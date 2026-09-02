package com.service.core.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id")
    private Order order;

    @Column(nullable = false, length = 50)
    private String type; // INCOME, EXPENSE

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 100)
    private String category; // SALARY, ORDER_PAYMENT, OFFICE_EXPENSE, etc.

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 50)
    private String status; // PENDING, CONFIRMED

    // ORDER_PAYMENT tranzaksiyalari uchun: kassaga topshirishda buyurtmaning
    // to'lov usuli (CASH/CARD/MIXED) shu yerga ko'chiriladi - Buxgalteriyada
    // "qancha naqd, qancha karta orqali tushdi" hisobotini Order jadvalini
    // qayta JOIN qilmasdan to'g'ridan-to'g'ri tranzaksiyalar ro'yxatidan
    // hisoblash uchun.
    @Column(name = "payment_method", length = 20)
    private String paymentMethod;

    @Column(name = "cash_amount", precision = 12, scale = 2)
    private BigDecimal cashAmount;

    @Column(name = "card_amount", precision = 12, scale = 2)
    private BigDecimal cardAmount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "worker_id")
    private User worker;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        // MUHIM: avval bu yerda shartsiz `LocalDateTime.now()` yozilardi -
        // eski oyga kirim/chiqim kiritish (2026-08-06 da so'ralgan, hisobotlar
        // ekranida) UMUMAN imkonsiz edi. Xuddi shu tuzatish Order.java'da
        // 2026-08-04 da qilingan edi. Endi faqat BO'SH bo'lsa to'ldiriladi.
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
