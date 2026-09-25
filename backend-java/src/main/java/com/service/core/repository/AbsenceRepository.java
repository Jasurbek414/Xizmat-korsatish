package com.service.core.repository;

import com.service.core.model.Absence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AbsenceRepository extends JpaRepository<Absence, UUID> {
    List<Absence> findByCompanyId(UUID companyId);
    List<Absence> findByCompanyIdAndUserId(UUID companyId, UUID userId);
    List<Absence> findByUserIdAndDateBetween(UUID userId, LocalDate start, LocalDate end);
    Optional<Absence> findByUserIdAndDate(UUID userId, LocalDate date);
    void deleteByUserId(UUID userId);
}
