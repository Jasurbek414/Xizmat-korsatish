package com.service.core.repository;

import com.service.core.model.OrderStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface OrderStatusRepository extends JpaRepository<OrderStatus, UUID> {
    List<OrderStatus> findByCompanyIdOrderBySortOrderAsc(UUID companyId);
}
