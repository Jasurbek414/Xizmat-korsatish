package com.service.core.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "services")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    // 2026-09-10 (jonli tizimda o'lchangan, ishlash tezligi): bu maydon JSON
    // javobiga ham chiqardi. Har bir yozuv ichida BUTUN Company obyekti
    // takrorlanardi - jumladan `receiptLogoBase64` (chek logotipi, base64,
    // bir kompaniyada ~64 KB). Buyurtma ichida esa u BIR NECHA marta:
    // order.company + client.company + worker.company + status.company +
    // service.company. Natijada mobil ilovaning /orders/completed so'rovi
    // o'rtacha 13 MB, /orders/available 9 MB bo'lib ketgan edi va ilova buni
    // HAR 20 SONIYADA qayta yuklardi (nginx access.log dan o'lchandi).
    // Sekin mobil internetda so'rov 12 soniyalik muddatga sig'may uzilardi -
    // ro'yxat yangilanmay, allaqachon yakunlangan buyurtmalar ekranda
    // qolib ketardi. Hech bir mijoz (veb panel ham, mobil ilova ham) bu
    // maydonni o'qimaydi: superadmin ekranlari kompaniyani ALOHIDA
    // ("company" kaliti bilan) oladi, tenant esa JWT ichidan aniqlanadi.
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(name = "name_uz", nullable = false)
    private String nameUz;

    @Column(name = "name_ru", nullable = false)
    private String nameRu;

    @Column(name = "name_en", nullable = false)
    private String nameEn;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(length = 100)
    private String category;

    @Column(name = "measurement_unit", length = 50)
    @Builder.Default
    private String measurementUnit = "mВІ";

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
