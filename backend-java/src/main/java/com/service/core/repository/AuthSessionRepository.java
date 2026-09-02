package com.service.core.repository;

import com.service.core.model.AuthSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AuthSessionRepository extends JpaRepository<AuthSession, UUID> {

    Optional<AuthSession> findByTokenHash(String tokenHash);

    List<AuthSession> findByUserIdAndRevokedFalseOrderByLastUsedAtDesc(UUID userId);

    /** O'g'irlik aniqlanganda butun oilani bir so'rovda bekor qilish. */
    @Modifying
    @Query("UPDATE AuthSession s SET s.revoked = true WHERE s.familyId = :familyId")
    int revokeFamily(@Param("familyId") UUID familyId);

    /** Foydalanuvchi barcha qurilmalardan chiqarilganda (parol o'zgarganda ham). */
    @Modifying
    @Query("UPDATE AuthSession s SET s.revoked = true WHERE s.user.id = :userId")
    int revokeAllForUser(@Param("userId") UUID userId);

    /** Muddati o'tgan yozuvlar jadvalni cheksiz o'stirmasligi uchun tozalanadi. */
    @Modifying
    @Query("DELETE FROM AuthSession s WHERE s.expiresAt < :before")
    int deleteExpired(@Param("before") LocalDateTime before);

    /**
     * Xodim o'chirilishidan OLDIN chaqiriladi (EmployeeController.deleteEmployee) -
     * aks holda user_id NOT NULL FK bu yozuvlarga tegib, o'chirish
     * DataIntegrityViolationException bilan barbod bo'ladi (login qilgan
     * HAR bir xodim kamida bitta auth_sessions yozuviga ega).
     */
    @Modifying
    @Query("DELETE FROM AuthSession s WHERE s.user.id = :userId")
    void deleteByUserId(@Param("userId") UUID userId);
}
