package com.service.core.repository;

import com.service.core.model.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, UUID> {
    List<OrderItem> findByOrderId(UUID orderId);

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM OrderItem oi WHERE oi.id = :id AND oi.order.id = :orderId")
    int deleteItemById(@Param("orderId") UUID orderId, @Param("id") UUID id);

    // Gilam bosqichi (ItemStatusLabel) o'chirilishidan oldin - shu kalitda
    // HALI AMALDA gilam bor-yo'qligini tekshirish uchun (bor bo'lsa
    // o'chirish taqiqlanadi, aks holda o'sha gilamlar ko'rinadigan nomsiz
    // qolib ketardi).
    @Query("SELECT COUNT(oi) > 0 FROM OrderItem oi WHERE oi.order.company.id = :companyId AND oi.status = :status")
    boolean existsByCompanyIdAndStatus(@Param("companyId") UUID companyId, @Param("status") String status);
}
