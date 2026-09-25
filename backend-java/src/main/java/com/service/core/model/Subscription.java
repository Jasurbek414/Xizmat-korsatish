package com.service.core.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "subscriptions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Subscription {

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

    @Column(name = "plan_name", nullable = false, length = 100)
    private String planName;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Builder.Default
    @Column(length = 50)
    private String status = "ACTIVE";
}
