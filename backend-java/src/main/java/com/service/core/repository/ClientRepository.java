package com.service.core.repository;

import com.service.core.model.Client;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ClientRepository extends JpaRepository<Client, UUID> {
    List<Client> findByCompanyId(UUID companyId);
    Optional<Client> findByCompanyIdAndPhone(UUID companyId, String phone);
}
