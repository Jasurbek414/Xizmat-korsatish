package com.service.core.repository;

import com.service.core.model.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RoleRepository extends JpaRepository<Role, UUID> {
    List<Role> findByCompanyId(UUID companyId);

    Optional<Role> findByCompanyIdAndKey(UUID companyId, String key);

    boolean existsByCompanyIdAndKey(UUID companyId, String key);

    boolean existsByCompanyIdAndKeyAndIdNot(UUID companyId, String key, UUID id);
}
