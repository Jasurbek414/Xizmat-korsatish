package com.service.core.repository;

import com.service.core.model.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, UUID> {
    List<Transaction> findByCompanyId(UUID companyId);
    List<Transaction> findByCompanyIdAndStatus(UUID companyId, String status);
    List<Transaction> findByCompanyIdAndWorkerId(UUID companyId, UUID workerId);
}
