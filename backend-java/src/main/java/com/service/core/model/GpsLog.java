package com.service.core.model;

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
