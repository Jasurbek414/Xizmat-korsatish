package com.service.core.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Foydalanuvchiga yuborilgan push bildirishnomaning ilova ichidagi tarixi -
 * qo'ng'iroqcha (bell) bo'limida ko'rsatiladi. Push xabarning o'zi (FCM)
 * qurilma ekranidan darhol yo'qolib ketishi mumkin - bu yozuv shu
 * bildirishnomani keyinroq ilova ichida qayta ko'rish imkonini beradi.
 */
@Entity
// 2026-09-09: findByUserIdOrderByCreatedAtDesc (NotificationController,
// mobil ilova qo'ng'iroqcha bo'limi) har so'rovda user_id bo'yicha
// filtrlaydi va created_at bo'yicha saralaydi - ikkalasini qoplaydigan
// kompozit indeks.
@Table(name = "app_notifications", indexes = @Index(name = "idx_app_notifications_user_created", columnList = "user_id, created_at"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String body;

    @Column(nullable = false, length = 50)
    private String type; // ORDER_ASSIGNED, APP_UPDATE, GENERIC

    @Column(nullable = false)
    @Builder.Default
    private boolean read = false;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
