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

    // 2026-09-09: boshqaruv paneli bosh ekranida faqat sonini ko'rsatish
    // uchun BUTUN mijozlar jadvali yuklanardi - endi yengil COUNT so'rovi.
    long countByCompanyId(UUID companyId);
    /**
     * MUHIM (jonli holatda topilgan xato, tuzatildi): oddiy findByCompanyId
     * hech qanday tartibga rioya qilmaydi (Postgres uni jismoniy qator
     * tartibida qaytarardi, bu esa VAQT o'tishi bilan o'zgarishi mumkin -
     * VACUUM, indeks qayta qurilishi va h.k.). Natijada admin panelda yangi
     * qo'shilgan mijoz ro'yxat TEPASIDA emas, o'rtada biror joyda
     * "yo'qolib" ko'rinardi. ClientController.getClients() endi shuni
     * ishlatadi - eng yangi mijoz doim birinchi.
     */
    List<Client> findByCompanyIdOrderByCreatedAtDesc(UUID companyId);
    Optional<Client> findByCompanyIdAndPhone(UUID companyId, String phone);
}
