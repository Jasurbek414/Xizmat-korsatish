package com.service.core.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "clients", uniqueConstraints = {
    @UniqueConstraint(name = "unique_company_client_phone", columnNames = {"company_id", "phone"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Client {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(nullable = false, length = 50)
    private String phone;

    @Column(columnDefinition = "TEXT")
    private String address;

    /**
     * Mijoz manzilining aniq GPS koordinatasi - haydovchi buyurtmani olib
     * ketish uchun BORGANDA, mijoz uyi oldida turib "Joylashuvni belgilash"
     * tugmasini bosishi orqali yoziladi (OrderController.updateOrderLocation).
     * Shu mijozning KEYINGI barcha buyurtmalarida ham qayta ishlatiladi -
     * matn manzil noaniq/adashtiruvchi bo'lsa ham, xarita navigatsiyasi
     * to'g'ridan-to'g'ri aniq nuqtaga olib boradi.
     */
    @Column
    private Double latitude;

    @Column
    private Double longitude;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
