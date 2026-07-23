package com.service.core.controller;

import com.service.core.model.Salary;
import com.service.core.model.Transaction;
import com.service.core.repository.SalaryRepository;
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
@RequestMapping("/api/v1/salaries")
@PreAuthorize("hasAnyRole('SUPERADMIN','ADMIN','MANAGER')")
public class SalaryController {

    private final SalaryRepository salaryRepository;
    private final TransactionRepository transactionRepository;

    public SalaryController(SalaryRepository salaryRepository, TransactionRepository transactionRepository) {
        this.salaryRepository = salaryRepository;
        this.transactionRepository = transactionRepository;
    }

    @GetMapping
    public ResponseEntity<?> getSalaries() {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        List<Salary> salaries = salaryRepository.findByCompanyId(UUID.fromString(tenantId));
        return ResponseEntity.ok(salaries);
    }

    @PutMapping("/{id}/pay")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMIN')")
    public ResponseEntity<?> paySalary(@PathVariable UUID id) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        Salary salary = salaryRepository.findById(id).orElse(null);
        if (salary == null || !salary.getCompany().getId().equals(UUID.fromString(tenantId))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Maosh hisobi topilmadi"));
        }

        if ("PAID".equalsIgnoreCase(salary.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Ushbu maosh allaqachon to'langan"));
        }

        // Mark PAID
        salary.setStatus("PAID");
        salaryRepository.save(salary);

        // Calculate net payout: base + bonus - deductions
        BigDecimal netAmount = salary.getBaseSalary()
                .add(salary.getBonus() != null ? salary.getBonus() : BigDecimal.ZERO)
                .subtract(salary.getDeductions() != null ? salary.getDeductions() : BigDecimal.ZERO);

        // Register EXPENSE transaction
        Transaction tx = Transaction.builder()
                .company(salary.getCompany())
                .type("EXPENSE")
                .amount(netAmount)
                .category("SALARY")
                .description(String.format("%s uchun %s oyi maoshi to'lovi",
                        salary.getUser().getFullName(), salary.getPayPeriod().toString().substring(0, 7)))
                .status("CONFIRMED")
                .build();
        transactionRepository.save(tx);

        return ResponseEntity.ok(salary);
    }

    @PutMapping("/{id}/deduction")
    @PreAuthorize("hasAnyRole('SUPERADMIN','ADMIN')")
    public ResponseEntity<?> addDeduction(@PathVariable UUID id, @RequestBody Map<String, Object> request) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        Object amountObj = request.get("amount");
        if (amountObj == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Chegirib qolish summasi kiritilishi shart"));
        }

        Salary salary = salaryRepository.findById(id).orElse(null);
        if (salary == null || !salary.getCompany().getId().equals(UUID.fromString(tenantId))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Maosh hisobi topilmadi"));
        }

        BigDecimal amount = new BigDecimal(amountObj.toString());
        BigDecimal currentDeductions = salary.getDeductions() != null ? salary.getDeductions() : BigDecimal.ZERO;
        salary.setDeductions(currentDeductions.add(amount));
        salaryRepository.save(salary);

        // Register advance/deduction EXPENSE transaction
        Transaction tx = Transaction.builder()
                .company(salary.getCompany())
                .type("EXPENSE")
                .amount(amount)
                .category("SALARY")
                .description(String.format("%s uchun %s oyi uchun avans berildi",
                        salary.getUser().getFullName(), salary.getPayPeriod().toString().substring(0, 7)))
                .status("CONFIRMED")
                .build();
        transactionRepository.save(tx);

        return ResponseEntity.ok(salary);
    }
}
