package com.service.core.controller;

import com.service.core.model.Company;
import com.service.core.model.Salary;
import com.service.core.model.Transaction;
import com.service.core.model.User;
import com.service.core.repository.CompanyRepository;
import com.service.core.repository.SalaryRepository;
import com.service.core.repository.TransactionRepository;
import com.service.core.repository.UserRepository;
import com.service.core.tenant.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/salaries")
@PreAuthorize("hasAnyRole('SUPERADMIN','ADMIN','MANAGER')")
public class SalaryController {

    private final SalaryRepository salaryRepository;
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;

    public SalaryController(SalaryRepository salaryRepository, TransactionRepository transactionRepository,
                             UserRepository userRepository, CompanyRepository companyRepository) {
        this.salaryRepository = salaryRepository;
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
        this.companyRepository = companyRepository;
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

    /**
     * Tanlangan oy uchun barcha faol, oyligi sozlangan xodimlarga oylik hisobi
     * (Salary, status=UNPAID) yaratadi. Shu oy uchun allaqachon hisobi bor
     * xodimlar qayta o'tkazib yuboriladi (dublikat oldini olish uchun).
     */
    @PostMapping("/generate")
    public ResponseEntity<?> generatePayroll(@RequestBody(required = false) Map<String, String> request) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }
        UUID companyId = UUID.fromString(tenantId);
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Kompaniya topilmadi"));

        String periodStr = request != null ? request.get("pay_period") : null;
        LocalDate payPeriod;
        try {
            payPeriod = (periodStr != null && !periodStr.isBlank())
                    ? LocalDate.parse(periodStr.length() == 7 ? periodStr + "-01" : periodStr).withDayOfMonth(1)
                    : LocalDate.now().withDayOfMonth(1);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "pay_period formati noto'g'ri (YYYY-MM kutilgan)"));
        }

        Set<UUID> alreadyGenerated = salaryRepository.findByCompanyId(companyId).stream()
                .filter(s -> s.getPayPeriod().equals(payPeriod))
                .map(s -> s.getUser().getId())
                .collect(Collectors.toSet());

        List<User> eligible = userRepository.findByCompanyId(companyId).stream()
                .filter(u -> u.getSalary() != null && u.getSalary() > 0)
                .filter(u -> "ACTIVE".equalsIgnoreCase(u.getStatus()))
                .filter(u -> !alreadyGenerated.contains(u.getId()))
                .toList();

        List<Salary> created = new ArrayList<>();
        for (User u : eligible) {
            Salary salary = Salary.builder()
                    .company(company)
                    .user(u)
                    .baseSalary(BigDecimal.valueOf(u.getSalary()))
                    .payPeriod(payPeriod)
                    .build();
            created.add(salaryRepository.save(salary));
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "message", created.size() + " ta xodim uchun " + payPeriod + " oyligi yaratildi",
                "created", created.size(),
                "skipped", alreadyGenerated.size()
        ));
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
