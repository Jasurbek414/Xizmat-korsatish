package com.service.core.repository;

import com.service.core.model.Call;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface CallRepository extends JpaRepository<Call, UUID> {
    List<Call> findByCompanyId(UUID companyId);
}
