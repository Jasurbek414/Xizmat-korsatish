package com.service.core.repository;

import com.service.core.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface OrderRepository extends JpaRepository<Order, UUID> {
    List<Order> findByCompanyId(UUID companyId);
    List<Order> findByCompanyIdAndWorkerId(UUID companyId, UUID workerId);
    List<Order> findByStatusId(UUID statusId);
    List<Order> findByCompanyIdAndPaymentStatus(UUID companyId, String paymentStatus);

    /**
     * To'lov qabul qilingan (COLLECTED/HANDED_OVER) buyurtmalarni qaytaradi -
     * mobil ilovadagi "Tarix" bo'limi uchun.
     */
    @Query("SELECT o FROM Order o WHERE o.company.id = :companyId AND o.paymentStatus <> 'PENDING'")
    List<Order> findCompletedByCompanyId(@Param("companyId") UUID companyId);
}
