package com.service.core.repository;

import com.service.core.model.ClientNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface ClientNoteRepository extends JpaRepository<ClientNote, UUID> {
    List<ClientNote> findByClientIdOrderByCreatedAtDesc(UUID clientId);

    // Xodim o'chirilganda eslatma MATNI (mijoz haqidagi qimmatli ma'lumot)
    // yo'qolmasligi kerak - shu sabab yozuv o'chirilmaydi, faqat muallif
    // havolasi bo'shatiladi ("Noma'lum muallif" bo'lib qoladi).
    @Modifying
    @Query("UPDATE ClientNote c SET c.author = null WHERE c.author.id = :userId")
    void clearAuthorByUserId(@Param("userId") UUID userId);
}
