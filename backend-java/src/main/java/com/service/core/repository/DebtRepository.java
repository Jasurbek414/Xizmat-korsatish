package com.service.core.repository;

import com.service.core.model.Debt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface DebtRepository extends JpaRepository<Debt, UUID> {
    List<Debt> findByCompanyId(UUID companyId);
}
