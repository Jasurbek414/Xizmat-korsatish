package com.service.core.repository;

import com.service.core.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface OrderRepository extends JpaRepository<Order, UUID> {
    List<Order> findByCompanyId(UUID companyId);

    // 2026-09-09: boshqaruv paneli bosh ekranida faqat sonini (va bugungi
    // buyurtmalar sonini) ko'rsatish uchun BUTUN jadval yuklanardi (mobile
    // audit'da topilgan asosiy sekinlik sababi) - endi shu ikki yengil
    // COUNT so'rovi ishlatiladi.
    long countByCompanyId(UUID companyId);
    long countByCompanyIdAndCreatedAtBetween(UUID companyId, LocalDateTime start, LocalDateTime end);
    /**
     * MUHIM (jonli holatda topilgan xato, tuzatildi - Clients.jsx'dagi bilan
     * bir xil sinf): findByCompanyId hech qanday tartibga rioya qilmaydi.
     * Veb-admin panelining "Buyurtmalar" ro'yxati (OrderController.getOrders,
     * FAQAT shu bitta o'rinda ishlatiladi) shu sabab yangi yaratilgan
     * buyurtmani ro'yxat o'rtasida "yo'qotib qo'yardi". Mobil ilovaning
     * o'z (dispatch pool/tarix) endpointlariga TEGILMAYDI - ular allaqachon
     * zona/holat asosida o'z mantig'iga ega.
     */
    List<Order> findByCompanyIdOrderByCreatedAtDesc(UUID companyId);
    List<Order> findByCompanyIdAndWorkerId(UUID companyId, UUID workerId);

    // Xodimni o'chirishdan oldin tekshirish uchun - haydovchi, kuryer yoki
    // sex xodimi sifatida BIRON buyurtmaga bog'langan bo'lsa, uni butunlay
    // o'chirib bo'lmaydi (EmployeeController.deleteEmployee).
    boolean existsByWorkerIdOrDriverIdOrSexWorkerId(UUID workerId, UUID driverId, UUID sexWorkerId);
    List<Order> findByStatusId(UUID statusId);
    List<Order> findByCompanyIdAndPaymentStatus(UUID companyId, String paymentStatus);

    /**
     * To'lov qabul qilingan (COLLECTED/HANDED_OVER) buyurtmalarni qaytaradi -
     * mobil ilovadagi "Tarix" bo'limi uchun.
     */
    @Query("SELECT o FROM Order o WHERE o.company.id = :companyId AND o.paymentStatus <> 'PENDING'")
    List<Order> findCompletedByCompanyId(@Param("companyId") UUID companyId);
}
