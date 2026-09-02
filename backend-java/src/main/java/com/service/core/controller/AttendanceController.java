package com.service.core.controller;

import com.service.core.model.Absence;
import com.service.core.model.Company;
import com.service.core.model.User;
import com.service.core.repository.AbsenceRepository;
import com.service.core.repository.CompanyRepository;
import com.service.core.repository.UserRepository;
import com.service.core.tenant.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.UUID;

// Xodimning "ishga kelmagan kun" yozuvlarini boshqaradi (davomat). Bu yerdagi
// yozuvlar SalaryController.generatePayroll da kunlik stavka bo'yicha
// avtomatik chegirmaga aylanadi - shuning uchun ruxsat 'salaries' moduli
// bilan bir xil.
@RestController
@RequestMapping("/api/v1/attendance")
@PreAuthorize("@perm.has('salaries')")
public class AttendanceController {

    private final AbsenceRepository absenceRepository;
    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;

    public AttendanceController(AbsenceRepository absenceRepository, UserRepository userRepository,
                                 CompanyRepository companyRepository) {
        this.absenceRepository = absenceRepository;
        this.userRepository = userRepository;
        this.companyRepository = companyRepository;
    }

    @GetMapping
    public ResponseEntity<?> getAbsences(@RequestParam(required = false) UUID userId,
                                          @RequestParam(required = false) String period) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }
        UUID companyId = UUID.fromString(tenantId);

        List<Absence> absences = (userId != null)
                ? absenceRepository.findByCompanyIdAndUserId(companyId, userId)
                : absenceRepository.findByCompanyId(companyId);

        if (period != null && !period.isBlank()) {
            YearMonth ym;
            try {
                ym = YearMonth.parse(period);
            } catch (Exception e) {
                return ResponseEntity.badRequest().body(Map.of("message", "period formati noto'g'ri (YYYY-MM kutilgan)"));
            }
            absences = absences.stream()
                    .filter(a -> YearMonth.from(a.getDate()).equals(ym))
                    .toList();
        }

        return ResponseEntity.ok(absences);
    }

    @PostMapping
    public ResponseEntity<?> markAbsent(@RequestBody Map<String, String> request) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }
        UUID companyId = UUID.fromString(tenantId);

        String userIdStr = request.get("userId");
        String dateStr = request.get("date");
        if (userIdStr == null || dateStr == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "userId va date kiritilishi shart"));
        }

        User user = userRepository.findById(UUID.fromString(userIdStr)).orElse(null);
        if (user == null || user.getCompany() == null || !user.getCompany().getId().equals(companyId)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Xodim topilmadi"));
        }

        LocalDate date;
        try {
            date = LocalDate.parse(dateStr);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "date formati noto'g'ri (YYYY-MM-DD kutilgan)"));
        }

        if (user.getHireDate() != null && date.isBefore(user.getHireDate())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Xodim hali ishga kirmagan sanaga davomat qo'yib bo'lmaydi"));
        }

        if (absenceRepository.findByUserIdAndDate(user.getId(), date).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "Ushbu sana uchun yozuv allaqachon mavjud"));
        }

        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Kompaniya topilmadi"));

        Absence absence = Absence.builder()
                .company(company)
                .user(user)
                .date(date)
                .reason(request.get("reason"))
                .build();

        Absence saved = absenceRepository.save(absence);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> removeAbsence(@PathVariable UUID id) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        Absence absence = absenceRepository.findById(id).orElse(null);
        if (absence == null || !absence.getCompany().getId().equals(UUID.fromString(tenantId))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Yozuv topilmadi"));
        }

        absenceRepository.delete(absence);
        return ResponseEntity.ok(Map.of("message", "Davomat yozuvi o'chirildi"));
    }
}
