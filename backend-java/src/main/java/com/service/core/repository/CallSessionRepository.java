package com.service.core.repository;

import com.service.core.model.CallSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface CallSessionRepository extends JpaRepository<CallSession, UUID> {
    List<CallSession> findBySipAccountId(UUID sipAccountId);
    List<CallSession> findByDispatcherId(UUID dispatcherId);

    // CallSession'da to'g'ridan-to'g'ri company_id yo'q - tenant izolyatsiyasi
    // sipAccount orqali (sipAccount.company.id) amalga oshiriladi.
    List<CallSession> findBySipAccount_Company_Id(UUID companyId);
}
