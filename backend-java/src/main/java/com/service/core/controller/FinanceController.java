package com.service.core.controller;

import com.service.core.model.Company;
import com.service.core.model.Transaction;
import com.service.core.repository.CompanyRepository;
import com.service.core.repository.TransactionRepository;
import com.service.core.tenant.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/finance")
@PreAuthorize("hasAnyRole('SUPERADMIN','ADMIN','MANAGER')")
public class FinanceController {

    private final TransactionRepository transactionRepository;
    private final CompanyRepository companyRepository;

    public FinanceController(TransactionRepository transactionRepository, CompanyRepository companyRepository) {
        this.transactionRepository = transactionRepository;
        this.companyRepository = companyRepository;
    }

    @GetMapping("/transactions")
    public ResponseEntity<?> getTransactions() {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        List<Transaction> transactions = transactionRepository.findByCompanyId(UUID.fromString(tenantId));
        return ResponseEntity.ok(transactions);
    }

    @PostMapping("/transactions")
    public ResponseEntity<?> createTransaction(@RequestBody Map<String, Object> request) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
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

        Transaction tx = Transaction.builder()
                .company(company)
                .type(type.toUpperCase())
                .amount(amount)
                .category(category)
                .description(description)
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

        List<Transaction> txs = transactionRepository.findByCompanyId(UUID.fromString(tenantId));
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
}
