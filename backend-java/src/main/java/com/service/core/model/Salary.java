package com.service.core.model;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "salaries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Salary {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "base_salary", nullable = false, precision = 10, scale = 2)
    private BigDecimal baseSalary;

    @Builder.Default
    @Column(precision = 10, scale = 2)
    private BigDecimal bonus = BigDecimal.ZERO;

    @Builder.Default
    @Column(precision = 10, scale = 2)
    private BigDecimal deductions = BigDecimal.ZERO;

    @Column(name = "pay_period", nullable = false)
    private LocalDate payPeriod;

    @Builder.Default
    @Column(length = 50)
    private String status = "UNPAID"; // PAID, UNPAID

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
