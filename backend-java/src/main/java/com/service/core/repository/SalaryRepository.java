package com.service.core.repository;

import com.service.core.model.Salary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface SalaryRepository extends JpaRepository<Salary, UUID> {
    List<Salary> findByCompanyId(UUID companyId);
}
