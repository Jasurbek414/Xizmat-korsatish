package com.service.core.repository;

import com.service.core.model.ItemStatusLabel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ItemStatusLabelRepository extends JpaRepository<ItemStatusLabel, UUID> {
    List<ItemStatusLabel> findByCompanyId(UUID companyId);
    List<ItemStatusLabel> findByCompanyIdOrderBySortOrderAsc(UUID companyId);
    Optional<ItemStatusLabel> findByCompanyIdAndItemKey(UUID companyId, String itemKey);
}
