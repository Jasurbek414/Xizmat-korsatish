package com.service.core.repository;

import com.service.core.model.Budget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BudgetRepository extends JpaRepository<Budget, UUID> {
    List<Budget> findByCompanyId(UUID companyId);
    Optional<Budget> findByCompanyIdAndCategory(UUID companyId, String category);
    boolean existsByCompanyIdAndCategory(UUID companyId, String category);
}
