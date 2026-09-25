package com.service.core.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

// MUHIM (tekshiruv chog'ida topilgan samaradorlik xatosi): PostgreSQL tashqi
// kalit (FK) ustuniga AVTOMATIK indeks qo'ymaydi - `trip_id` esa
// GpsController.addSegmentDistance() orqali FAOL safar davomida HAR 15
// soniyada (har GPS nuqtasida) so'raladi. Indekssiz bu doim o'sib boruvchi
// `gps_logs` jadvalining TO'LIQ skanerlanishiga olib kelardi.
@Entity
@Table(name = "gps_logs", indexes = {
        @Index(name = "idx_gps_logs_trip_created", columnList = "trip_id,created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GpsLog {

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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // Haydovchi shu nuqtani korxona markazidan CHEGARADAN TASHQARIDA
    // (DriverTrip) turib yuborgan bo'lsa - shu safarga bog'lanadi. Markazda
    // (chegara ichida) yuborilgan nuqtalarda `null` qoladi.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id")
    private DriverTrip trip;

    // Faqat oldindan berilmagan bo'lsa - GpsController mobil ilova yuborgan
    // HAQIQIY yozib olingan vaqtni (offline navbatdan chiqqan eski nuqtalar
    // uchun ham) o'rnatishi mumkin bo'lishi uchun.
    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
