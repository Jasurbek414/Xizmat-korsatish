package com.service.core.controller;

import com.service.core.model.Company;
import com.service.core.model.Subscription;
import com.service.core.repository.CompanyRepository;
import com.service.core.repository.SubscriptionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Faqat SUPERADMIN uchun - kompaniyalarning obuna/billing tarixini boshqarish
 * (TZ.md'dagi `subscriptions` jadvali - avval hech qanday controller ishlatmagan).
 */
@RestController
@RequestMapping("/api/v1/superadmin/companies/{companyId}/subscriptions")
@PreAuthorize("hasRole('SUPERADMIN')")
public class SuperAdminSubscriptionController {

    private final SubscriptionRepository subscriptionRepository;
    private final CompanyRepository companyRepository;

    public SuperAdminSubscriptionController(SubscriptionRepository subscriptionRepository,
                                             CompanyRepository companyRepository) {
        this.subscriptionRepository = subscriptionRepository;
        this.companyRepository = companyRepository;
    }

    @GetMapping
    public ResponseEntity<?> listSubscriptions(@PathVariable UUID companyId) {
        if (companyRepository.findById(companyId).isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Kompaniya topilmadi"));
        }
        List<Subscription> subscriptions = subscriptionRepository.findByCompanyIdOrderByStartDateDesc(companyId);
        return ResponseEntity.ok(subscriptions);
    }

    @PostMapping
    public ResponseEntity<?> createSubscription(@PathVariable UUID companyId, @RequestBody Map<String, Object> request) {
        Company company = companyRepository.findById(companyId).orElse(null);
        if (company == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Kompaniya topilmadi"));
        }

        String planName = (String) request.get("planName");
        Object startDateObj = request.get("startDate");
        Object endDateObj = request.get("endDate");
        Object priceObj = request.get("price");

        if (planName == null || planName.isBlank() || startDateObj == null || endDateObj == null || priceObj == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Reja nomi, boshlanish/tugash sanasi va narx kiritilishi shart"));
        }

        try {
            Subscription subscription = Subscription.builder()
                    .company(company)
                    .planName(planName.trim())
                    .startDate(LocalDate.parse(startDateObj.toString()))
                    .endDate(LocalDate.parse(endDateObj.toString()))
                    .price(new BigDecimal(priceObj.toString()))
                    .status(request.getOrDefault("status", "ACTIVE").toString())
                    .build();
            Subscription saved = subscriptionRepository.save(subscription);
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Sana yoki narx formati noto'g'ri"));
        }
    }

    @PutMapping("/{subscriptionId}")
    public ResponseEntity<?> updateSubscription(@PathVariable UUID companyId, @PathVariable UUID subscriptionId,
                                                 @RequestBody Map<String, Object> request) {
        Subscription subscription = subscriptionRepository.findById(subscriptionId).orElse(null);
        if (subscription == null || !subscription.getCompany().getId().equals(companyId)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Obuna topilmadi"));
        }

        try {
            if (request.containsKey("planName")) subscription.setPlanName(request.get("planName").toString());
            if (request.containsKey("startDate")) subscription.setStartDate(LocalDate.parse(request.get("startDate").toString()));
            if (request.containsKey("endDate")) subscription.setEndDate(LocalDate.parse(request.get("endDate").toString()));
            if (request.containsKey("price")) subscription.setPrice(new BigDecimal(request.get("price").toString()));
            if (request.containsKey("status")) subscription.setStatus(request.get("status").toString());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Sana yoki narx formati noto'g'ri"));
        }

        Subscription saved = subscriptionRepository.save(subscription);
        return ResponseEntity.ok(saved);
    }
}
