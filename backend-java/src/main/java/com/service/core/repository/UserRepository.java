package com.service.core.repository;

import com.service.core.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByUsername(String username);
    List<User> findByCompanyIdAndRole(UUID companyId, String role);
    List<User> findByCompanyId(UUID companyId);
    List<User> findByStatus(String status);

    // 2026-09-09: EmployeeController.getEmployees() DELETED xodimlarni
    // (hisobot tarixi buzilmasin deb bazadan o'chirilmaydi) in-memory
    // filtrlaydi - bosh ekran uchun yengil son so'rovi shu bilan bir xil
    // mantiqni takrorlaydi.
    long countByCompanyIdAndStatusNot(UUID companyId, String status);
}
