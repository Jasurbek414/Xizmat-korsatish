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
    List<Transaction> findByStatus(String status);

    // 2026-10-05 audit: GET /finance/transactions avval tartibsiz
    // findByCompanyIdAndStatus/findByCompanyIdAndWorkerId ishlatardi - Postgres
    // ORDER BY'siz tartibni kafolatlamaydi (UPDATE/VACUUM'dan keyin o'zgaradi),
    // veb FinanceTable esa "eski->yangi keladi" deb ro'yxatni shunchaki teskari
    // aylantirardi. O'tgan sanaga kiritilgan yozuvlar ham shu sabab noto'g'ri
    // joyda chiqardi. Endi tartib aniq: createdAt bo'yicha o'sish.
    List<Transaction> findByCompanyIdAndStatusOrderByCreatedAtAsc(UUID companyId, String status);
    List<Transaction> findByCompanyIdAndWorkerIdOrderByCreatedAtAsc(UUID companyId, UUID workerId);
    boolean existsByWorkerId(UUID workerId);
}
