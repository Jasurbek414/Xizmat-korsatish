package com.service.core.repository;

import com.service.core.model.DriverTrip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DriverTripRepository extends JpaRepository<DriverTrip, UUID> {
    // Haydovchining HOZIR davom etayotgan (markazga hali qaytmagan) safari -
    // birdan ortiq bo'lishi mumkin emas (GpsController shuni ta'minlaydi).
    Optional<DriverTrip> findByUserIdAndEndedAtIsNull(UUID userId);

    List<DriverTrip> findByUserIdOrderByStartedAtDesc(UUID userId);

    Optional<DriverTrip> findByIdAndCompanyId(UUID id, UUID companyId);
}
