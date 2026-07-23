package com.service.core.controller;

import com.service.core.model.Company;
import com.service.core.model.Transaction;
import com.service.core.model.User;
import com.service.core.repository.CompanyRepository;
import com.service.core.repository.TransactionRepository;
import com.service.core.repository.UserRepository;
import com.service.core.tenant.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/finance")
@PreAuthorize("hasAnyRole('SUPERADMIN','ADMIN','MANAGER','DISPATCHER','WORKER_DRIVER','WORKER_FACTORY','WORKER_SEH')")
public class FinanceController {

    private final TransactionRepository transactionRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;

    public FinanceController(TransactionRepository transactionRepository, CompanyRepository companyRepository, UserRepository userRepository) {
        this.transactionRepository = transactionRepository;
        this.companyRepository = companyRepository;
        this.userRepository = userRepository;
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username).orElse(null);
    }

    @GetMapping("/transactions")
    public ResponseEntity<?> getTransactions() {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        User currentUser = getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Foydalanuvchi topilmadi"));
        }

        UUID companyId = UUID.fromString(tenantId);
        List<Transaction> transactions;
        if ("WORKER_DRIVER".equalsIgnoreCase(currentUser.getRole()) || "WORKER_FACTORY".equalsIgnoreCase(currentUser.getRole()) || "WORKER_SEH".equalsIgnoreCase(currentUser.getRole())) {
            transactions = transactionRepository.findByCompanyIdAndWorkerId(companyId, currentUser.getId());
        } else {
            transactions = transactionRepository.findByCompanyIdAndStatus(companyId, "CONFIRMED");
        }
        return ResponseEntity.ok(transactions);
    }

    @PostMapping("/transactions")
    public ResponseEntity<?> createTransaction(@RequestBody Map<String, Object> request) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        User currentUser = getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Foydalanuvchi topilmadi"));
        }

        String type = (String) request.get("type"); // INCOME, EXPENSE
        Object amountObj = request.get("amount");
        String category = (String) request.get("category");
        String description = (String) request.get("description");

        if (type == null || amountObj == null || category == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Majburiy maydonlarni to'ldiring"));
        }

        BigDecimal amount = new BigDecimal(amountObj.toString());
        Company company = companyRepository.findById(UUID.fromString(tenantId))
                .orElseThrow(() -> new RuntimeException("Kompaniya topilmadi"));

        boolean isWorker = "WORKER_DRIVER".equalsIgnoreCase(currentUser.getRole()) || "WORKER_FACTORY".equalsIgnoreCase(currentUser.getRole()) || "WORKER_SEH".equalsIgnoreCase(currentUser.getRole());
        String status = isWorker ? "PENDING" : "CONFIRMED";

        Transaction tx = Transaction.builder()
                .company(company)
                .type(type.toUpperCase())
                .amount(amount)
                .category(category)
                .description(description)
                .status(status)
                .worker(isWorker ? currentUser : null)
                .build();

        Transaction saved = transactionRepository.save(tx);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getStats() {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        User currentUser = getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Foydalanuvchi topilmadi"));
        }

        UUID companyId = UUID.fromString(tenantId);
        List<Transaction> txs;
        if ("WORKER_DRIVER".equalsIgnoreCase(currentUser.getRole()) || "WORKER_FACTORY".equalsIgnoreCase(currentUser.getRole()) || "WORKER_SEH".equalsIgnoreCase(currentUser.getRole())) {
            txs = transactionRepository.findByCompanyIdAndWorkerId(companyId, currentUser.getId());
        } else {
            txs = transactionRepository.findByCompanyIdAndStatus(companyId, "CONFIRMED");
        }

        BigDecimal income = BigDecimal.ZERO;
        BigDecimal expense = BigDecimal.ZERO;

        for (Transaction tx : txs) {
            if ("INCOME".equalsIgnoreCase(tx.getType())) {
                income = income.add(tx.getAmount());
            } else if ("EXPENSE".equalsIgnoreCase(tx.getType())) {
                expense = expense.add(tx.getAmount());
            }
        }

        BigDecimal balance = income.subtract(expense);
        return ResponseEntity.ok(Map.of(
            "totalIncome", income,
            "totalExpense", expense,
            "balance", balance
        ));
    }

    @GetMapping("/pending-transactions")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMIN','MANAGER','DISPATCHER')")
    public ResponseEntity<?> getPendingTransactions() {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }
        List<Transaction> pending = transactionRepository.findByCompanyIdAndStatus(UUID.fromString(tenantId), "PENDING");
        return ResponseEntity.ok(pending);
    }

    @PutMapping("/transactions/{id}/confirm")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMIN','MANAGER','DISPATCHER')")
    public ResponseEntity<?> confirmTransaction(@PathVariable UUID id) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }
        Transaction tx = transactionRepository.findById(id).orElse(null);
        if (tx == null || !tx.getCompany().getId().equals(UUID.fromString(tenantId))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Tranzaksiya topilmadi"));
        }
        tx.setStatus("CONFIRMED");
        Transaction saved = transactionRepository.save(tx);
        return ResponseEntity.ok(saved);
    }
}
