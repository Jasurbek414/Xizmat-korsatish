package com.service.core.controller;

import com.service.core.model.Budget;
import com.service.core.model.Company;
import com.service.core.repository.BudgetRepository;
import com.service.core.repository.CompanyRepository;
import com.service.core.tenant.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/finance/budgets")
@PreAuthorize("@perm.has('finance')")
public class BudgetController {

    // Kompaniya birinchi marta ochganda avtomatik yaratiladigan standart
    // xarajat kategoriyalari va boshlang'ich limitlari.
    private static final Map<String, BigDecimal> DEFAULT_LIMITS = new LinkedHashMap<>();
    static {
        DEFAULT_LIMITS.put("SALARY", BigDecimal.valueOf(10_000_000));
        DEFAULT_LIMITS.put("OFFICE_EXPENSE", BigDecimal.valueOf(2_000_000));
        DEFAULT_LIMITS.put("TAX", BigDecimal.valueOf(1_500_000));
    }

    private final BudgetRepository budgetRepository;
    private final CompanyRepository companyRepository;

    public BudgetController(BudgetRepository budgetRepository, CompanyRepository companyRepository) {
        this.budgetRepository = budgetRepository;
        this.companyRepository = companyRepository;
    }

    @GetMapping
    public ResponseEntity<?> getBudgets() {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }
        UUID companyId = UUID.fromString(tenantId);
        Company company = companyRepository.findById(companyId).orElse(null);
        if (company == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Kompaniya topilmadi"));
        }

        DEFAULT_LIMITS.forEach((category, limit) -> {
            if (!budgetRepository.existsByCompanyIdAndCategory(companyId, category)) {
                budgetRepository.save(Budget.builder().company(company).category(category).limitAmount(limit).build());
            }
        });

        return ResponseEntity.ok(budgetRepository.findByCompanyId(companyId));
    }

    @PutMapping("/{category}")
    public ResponseEntity<?> updateBudget(@PathVariable String category, @RequestBody Map<String, Object> request) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }
        UUID companyId = UUID.fromString(tenantId);

        Object limitObj = request.get("limitAmount");
        if (limitObj == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Limit summasi kiritilishi shart"));
        }
        BigDecimal limit;
        try {
            limit = new BigDecimal(limitObj.toString());
        } catch (NumberFormatException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Noto'g'ri summa formati"));
        }
        if (limit.compareTo(BigDecimal.ZERO) < 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "Limit manfiy bo'lishi mumkin emas"));
        }

        Budget budget = budgetRepository.findByCompanyIdAndCategory(companyId, category).orElse(null);
        if (budget == null) {
            Company company = companyRepository.findById(companyId)
                    .orElseThrow(() -> new RuntimeException("Kompaniya topilmadi"));
            budget = Budget.builder().company(company).category(category).limitAmount(limit).build();
        } else {
            budget.setLimitAmount(limit);
        }

        Budget saved = budgetRepository.save(budget);
        return ResponseEntity.ok(saved);
    }
}
