package com.service.core.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Haydovchi/ishchi korxona markazidan (Company.latitude/longitude) chegara
 * radiusidan (GpsController.TRIP_RADIUS_METERS) tashqariga chiqqan paytdan
 * boshlab, markazga QAYTIB kelgunga qadar bo'lgan BITTA safar - har bir
 * chiqish/qaytish ALOHIDA yozuv (foydalanuvchi so'rovi bo'yicha: safarlar
 * birlashtirilmaydi, har biri o'z masofasi/vaqti bilan mustaqil saqlanadi).
 *
 * `endedAt == null` bo'lsa safar HALI DAVOM ETMOQDA (haydovchi hali
 * markazdan tashqarida) - GpsController har bir yangi GPS nuqtasida shu
 * safarni davom ettiradi, markazga qaytganda yakunlaydi.
 *
 * Bosib o'tilgan yo'l (path) ALOHIDA saqlanmaydi - GpsLog.trip orqali shu
 * safarga tegishli barcha GPS nuqtalari bog'lanadi (GpsLogRepository.
 * findByTripIdOrderByCreatedAtAsc), takroriy ma'lumot saqlashning oldini
 * olish uchun.
 */
// MUHIM (tekshiruv chog'ida topilgan): "faol safar bormi" tekshiruvi
// (findByUserIdAndEndedAtIsNull) HAR bir GPS nuqtasida chaqiriladi - FK
// ustuniga avtomatik indeks bo'lmagani uchun bu indeks aniq qo'shildi.
@Entity
@Table(name = "driver_trips", indexes = {
        @Index(name = "idx_driver_trips_user_ended", columnList = "user_id,ended_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DriverTrip {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    // Markazdan chiqqandan beri (GPS nuqtalari ORASIDA, ketma-ket) bosib
    // o'tilgan HAQIQIY yo'l uzunligi - markazgacha bo'lgan to'g'ri chiziq
    // EMAS, chunki haydovchi ko'cha bo'ylab yuradi.
    @Column(name = "distance_meters", nullable = false)
    @Builder.Default
    private Double distanceMeters = 0.0;
}
