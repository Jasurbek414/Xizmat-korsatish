package com.service.core.controller;

import com.service.core.model.Company;
import com.service.core.model.Transaction;
import com.service.core.model.User;
import com.service.core.repository.CompanyRepository;
import com.service.core.repository.OrderRepository;
import com.service.core.repository.TransactionRepository;
import com.service.core.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Faqat SUPERADMIN uchun - barcha kompaniyalar (tenantlar) kesimidagi platforma darajasidagi
 * agregat statistika. SuperadminDashboard'dagi eski "faqat kompaniyalar soni" ko'rsatkichi
 * o'rniga haqiqiy daromad/buyurtma/foydalanuvchi raqamlarini beradi.
 */
@RestController
@RequestMapping("/api/v1/superadmin/stats")
@PreAuthorize("hasRole('SUPERADMIN')")
public class SuperAdminStatsController {

    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final TransactionRepository transactionRepository;

    public SuperAdminStatsController(CompanyRepository companyRepository, UserRepository userRepository,
                                      OrderRepository orderRepository, TransactionRepository transactionRepository) {
        this.companyRepository = companyRepository;
        this.userRepository = userRepository;
        this.orderRepository = orderRepository;
        this.transactionRepository = transactionRepository;
    }

    @GetMapping
    public ResponseEntity<?> getPlatformStats() {
        List<Company> companies = companyRepository.findAll();
        List<Transaction> confirmedTransactions = transactionRepository.findByStatus("CONFIRMED");

        LocalDateTime monthStart = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        BigDecimal totalRevenueThisMonth = confirmedTransactions.stream()
                .filter(tx -> "INCOME".equalsIgnoreCase(tx.getType()))
                .filter(tx -> tx.getCreatedAt() != null && !tx.getCreatedAt().isBefore(monthStart))
                .map(Transaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long totalActiveUsers = userRepository.findAll().stream()
                .filter(u -> "ACTIVE".equalsIgnoreCase(u.getStatus()) && !"SUPERADMIN".equalsIgnoreCase(u.getRole()))
                .count();

        // Har bir kompaniya bo'yicha jami (barcha vaqt) INCOME yig'indisi - top-5 uchun.
        Map<java.util.UUID, BigDecimal> revenueByCompany = new HashMap<>();
        for (Transaction tx : confirmedTransactions) {
            if (!"INCOME".equalsIgnoreCase(tx.getType()) || tx.getCompany() == null) continue;
            revenueByCompany.merge(tx.getCompany().getId(), tx.getAmount(), BigDecimal::add);
        }

        List<Map<String, Object>> topCompanies = companies.stream()
                .map(c -> {
                    Map<String, Object> entry = new HashMap<>();
                    entry.put("id", c.getId());
                    entry.put("name", c.getName());
                    entry.put("subDomain", c.getSubDomain());
                    entry.put("revenue", revenueByCompany.getOrDefault(c.getId(), BigDecimal.ZERO));
                    return entry;
                })
                .sorted(Comparator.comparing((Map<String, Object> e) -> (BigDecimal) e.get("revenue")).reversed())
                .limit(5)
                .collect(Collectors.toList());

        Map<String, Object> result = new HashMap<>();
        result.put("totalCompanies", companies.size());
        result.put("activeCompanies", companies.stream().filter(c -> "ACTIVE".equalsIgnoreCase(c.getStatus())).count());
        result.put("blockedCompanies", companies.stream().filter(c -> "BLOCKED".equalsIgnoreCase(c.getStatus())).count());
        result.put("totalRevenueThisMonth", totalRevenueThisMonth);
        result.put("totalOrders", orderRepository.count());
        result.put("totalActiveUsers", totalActiveUsers);
        result.put("topCompanies", topCompanies);
        return ResponseEntity.ok(result);
    }
}
