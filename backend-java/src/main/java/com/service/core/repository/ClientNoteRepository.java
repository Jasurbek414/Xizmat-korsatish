package com.service.core.repository;

import com.service.core.model.ClientNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.UUID;

@Repository
public interface ClientNoteRepository extends JpaRepository<ClientNote, UUID> {
    List<ClientNote> findByClientIdOrderByCreatedAtDesc(UUID clientId);
}
