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

    // ItemStageController.deleteStage() uchun - bosqich o'chirilishidan oldin
    // shu bosqichdagi FAOL (tarixga o'tmagan) gilamlar bor-yo'qligini tekshirish.
    List<OrderItem> findByStatusAndOrder_Company_Id(String status, UUID companyId);

    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM OrderItem oi WHERE oi.id = :id AND oi.order.id = :orderId")
    int deleteItemById(@Param("orderId") UUID orderId, @Param("id") UUID id);
}
