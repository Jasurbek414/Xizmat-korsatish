package com.service.core.repository;

import com.service.core.model.AppNotification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface AppNotificationRepository extends JpaRepository<AppNotification, UUID> {
    Page<AppNotification> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    long countByUserIdAndReadFalse(UUID userId);

    @Modifying
    @Query("UPDATE AppNotification n SET n.read = true WHERE n.user.id = :userId AND n.read = false")
    void markAllRead(@Param("userId") UUID userId);

    /** AuthSessionRepository.deleteByUserId bilan bir xil sabab - xodim
     * o'chirilishidan oldin FK'ni bo'shatish uchun. */
    @Modifying
    @Query("DELETE FROM AppNotification n WHERE n.user.id = :userId")
    void deleteByUserId(@Param("userId") UUID userId);
}
