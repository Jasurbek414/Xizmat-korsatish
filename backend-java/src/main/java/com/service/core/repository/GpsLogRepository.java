package com.service.core.repository;

import com.service.core.model.GpsLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GpsLogRepository extends JpaRepository<GpsLog, UUID> {
    List<GpsLog> findByCompanyIdAndUserIdOrderByCreatedAtDesc(UUID companyId, UUID userId);

    @Query("SELECT g FROM GpsLog g WHERE g.company.id = :companyId AND g.createdAt = (SELECT MAX(g2.createdAt) FROM GpsLog g2 WHERE g2.user = g.user)")
    List<GpsLog> findLatestLogsForCompany(@Param("companyId") UUID companyId);

    // Safar (DriverTrip) davomida - oldingi nuqtadan yangisigacha bosib
    // o'tilgan qo'shimcha masofani hisoblash uchun ENG OXIRGI nuqta kerak.
    Optional<GpsLog> findTopByTripIdOrderByCreatedAtDesc(UUID tripId);

    // Safarning to'liq yo'l chizig'i (xaritada ko'rsatish uchun) - ketma-ket
    // yozilgan tartibda.
    List<GpsLog> findByTripIdOrderByCreatedAtAsc(UUID tripId);
}
