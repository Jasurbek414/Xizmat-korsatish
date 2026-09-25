package com.service.core.repository;

import com.service.core.model.ItemStage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ItemStageRepository extends JpaRepository<ItemStage, UUID> {
    List<ItemStage> findByCompanyIdOrderBySortOrderAsc(UUID companyId);

    Optional<ItemStage> findByCompanyIdAndStageKey(UUID companyId, String stageKey);

    boolean existsByCompanyIdAndStageKey(UUID companyId, String stageKey);
}
