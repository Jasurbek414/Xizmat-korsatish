package com.service.core.repository;

import com.service.core.model.SipAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SipAccountRepository extends JpaRepository<SipAccount, UUID> {
    // KIRUVCHI qo'ng'iroq marshruti uchun: UzTelecom kiruvchi INVITE'da
    // destination_number = trunk hisob username'i (masalan "101") yuboradi.
    // Shu orqali qaysi kompaniyaga (SipAccount.company) tegishli ekanini
    // aniqlaymiz va o'sha kompaniyaning operatorlariga yo'naltiramiz.
    Optional<SipAccount> findFirstByUsername(String username);
    // MUHIM (audit: 18-band) - avval ORDER BY yo'q edi, shuning uchun
    // "birinchi" hisob DB skanerlash tartibiga (amalda - qachon yaratilganiga)
    // bog'liq, lekin KAFOLATLANMAGAN tasodifiy natija edi. Endi eng birinchi
    // yaratilgan (eng barqaror, "asosiy") hisob har doim aniq birinchi bo'lib
    // qaytariladi.
    List<SipAccount> findByCompanyIdOrderByCreatedAtAsc(UUID companyId);
}
