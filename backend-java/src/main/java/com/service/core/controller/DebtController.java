package com.service.core.controller;

import com.service.core.model.Company;
import com.service.core.model.Debt;
import com.service.core.model.Transaction;
import com.service.core.repository.CompanyRepository;
import com.service.core.repository.DebtRepository;
import com.service.core.repository.TransactionRepository;
import com.service.core.tenant.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/finance/debts")
@PreAuthorize("@perm.has('finance')")
public class DebtController {

    private static final List<String> VALID_TYPES = List.of("RECEIVABLE", "PAYABLE");

    private final DebtRepository debtRepository;
    private final CompanyRepository companyRepository;
    private final TransactionRepository transactionRepository;

    public DebtController(DebtRepository debtRepository, CompanyRepository companyRepository,
                           TransactionRepository transactionRepository) {
        this.debtRepository = debtRepository;
        this.companyRepository = companyRepository;
        this.transactionRepository = transactionRepository;
    }

    @GetMapping
    public ResponseEntity<?> getDebts() {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }
        return ResponseEntity.ok(debtRepository.findByCompanyId(UUID.fromString(tenantId)));
    }

    @PostMapping
    public ResponseEntity<?> createDebt(@RequestBody Map<String, Object> request) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        String type = (String) request.get("type");
        String person = (String) request.get("person");
        Object amountObj = request.get("amount");
        String description = (String) request.get("description");

        if (type == null || !VALID_TYPES.contains(type) || person == null || person.isBlank()
                || amountObj == null || description == null || description.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Barcha maydonlarni to'g'ri to'ldiring"));
        }

        BigDecimal amount;
        try {
            amount = new BigDecimal(amountObj.toString());
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Noto'g'ri summa formati"));
        }
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "Summa musbat bo'lishi shart"));
        }

        Company company = companyRepository.findById(UUID.fromString(tenantId))
                .orElseThrow(() -> new RuntimeException("Kompaniya topilmadi"));

        Debt debt = Debt.builder()
                .company(company)
                .type(type)
                .person(person.trim())
                .amount(amount)
                .description(description.trim())
                .build();

        Debt saved = debtRepository.save(debt);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    /**
     * Qarzni so'ndiradi va bir vaqtning o'zida Moliya oqimiga tegishli
     * tranzaksiyani yozadi: PAYABLE (kompaniya to'lashi kerak bo'lgan) qarz
     * so'ndirilsa - EXPENSE, RECEIVABLE (mijozdan kutilayotgan, mijoz to'lab
     * bergan) qarz so'ndirilsa - INCOME. Shu tarzda Moliya balansi va
     * hisobotlari avtomatik yangilanadi (alohida "kassa simulyatsiyasi" kerak
     * emas - Finance.jsx qolgan tranzaksiyalar bilan bir xil oqimdan o'qiydi).
     */
    @PutMapping("/{id}/pay")
    public ResponseEntity<?> payDebt(@PathVariable UUID id) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        Debt debt = debtRepository.findById(id).orElse(null);
        if (debt == null || !debt.getCompany().getId().equals(UUID.fromString(tenantId))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Qarz topilmadi"));
        }
        if ("PAID".equals(debt.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Bu qarz allaqachon so'ndirilgan"));
        }

        debt.setStatus("PAID");
        debt.setPaidAt(LocalDateTime.now());
        Debt saved = debtRepository.save(debt);

        Transaction tx = Transaction.builder()
                .company(debt.getCompany())
                .type("PAYABLE".equals(debt.getType()) ? "EXPENSE" : "INCOME")
                .amount(debt.getAmount())
                .category("DEBT_PAYMENT")
                .description(("PAYABLE".equals(debt.getType()) ? "Qarz to'landi: " : "Qarz undirildi: ") + debt.getPerson())
                .status("CONFIRMED")
                .build();
        transactionRepository.save(tx);

        return ResponseEntity.ok(saved);
    }
}
