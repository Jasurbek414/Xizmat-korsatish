package com.service.core.controller;

import com.service.core.model.Company;
import com.service.core.model.Transaction;
import com.service.core.model.User;
import com.service.core.repository.CompanyRepository;
import com.service.core.repository.TransactionRepository;
import com.service.core.repository.UserRepository;
import com.service.core.service.PermissionKeys;
import com.service.core.service.PermissionService;
import com.service.core.tenant.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/finance")
@PreAuthorize("@perm.has('finance','mobile_finance_view')")
public class FinanceController {

    private final TransactionRepository transactionRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final PermissionService permissionService;

    public FinanceController(TransactionRepository transactionRepository, CompanyRepository companyRepository,
                              UserRepository userRepository, PermissionService permissionService) {
        this.transactionRepository = transactionRepository;
        this.companyRepository = companyRepository;
        this.userRepository = userRepository;
        this.permissionService = permissionService;
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username).orElse(null);
    }

    // MUHIM (audit'da topilgan, xavfsizlik): "ishchimi" degan qaror avval
    // qattiq yozilgan rol NOMLARI ("WORKER_DRIVER"/"WORKER"/"WORKER_SEH")
    // bilan tekshirilardi - PermissionService.java'ning o'zi ustidagi izohda
    // aynan shu xato sinfini tuzatish uchun yaratilgani yozilgan bo'lsa ham,
    // shu kontrollerda unutilib qolgan edi. Natijada Administrator
    // moslashtirgan YANGI rol (masalan faqat "mobile_finance_view" berilgan,
    // "finance" esa yo'q, va roli nomi WORKER_* emas) sinf darajasidagi
    // tekshiruvdan (@perm.has('finance','mobile_finance_view')) o'tib
    // kirardi-yu, keyin bu yerda "ishchi emas" deb hisoblanib, BUTUN
    // kompaniya kassasini ko'rar va to'g'ridan-to'g'ri CONFIRMED tranzaksiya
    // yoza olardi. To'g'ri qoida: to'liq 'finance' huquqi yo'q - demak
    // faqat o'zining (mobile_finance_view orqali berilgan ko'rish huquqi
    // doirasidagi) yozuvlari bilan cheklanadi.
    private boolean isScopedToOwnRecords() {
        return !permissionService.has(PermissionKeys.FINANCE);
    }

    /**
     * Kalendar orqali kiritilgan "eski sana"ni o'qiydi - OrderController'dagi
     * bilan AYNAN bir xil naqsh (izchillik uchun shu yerga ham nusxa
     * ko'chirilgan, ikkalasi ham juda kichik va alohida controller'larga
     * tegishli).
     *
     * Ikkala format ham qabul qilinadi: to'liq ISO vaqt va faqat sana.
     * Kelajak sana ATAYIN rad etiladi - bu maydon o'tgan davrni qayd etish
     * uchun, hisobotlarni oldinga surib yuborish uchun emas.
     */
    private LocalDateTime parseBackdate(Object raw) {
        if (raw == null) return null;
        String value = raw.toString().trim();
        if (value.isEmpty()) return null;

        LocalDateTime parsed;
        try {
            parsed = value.length() <= 10
                    ? java.time.LocalDate.parse(value).atTime(java.time.LocalTime.now())
                    : LocalDateTime.parse(value);
        } catch (java.time.format.DateTimeParseException e) {
            return null;
        }

        return parsed.isAfter(LocalDateTime.now()) ? null : parsed;
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
        if (isScopedToOwnRecords()) {
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

        // MUHIM (audit'da topilgan xato, tuzatildi): boshqa shu turdagi
        // endpointlar (DebtController, BudgetController)dan farqli o'laroq,
        // bu yerda summa formati/ishorasi UMUMAN tekshirilmasdi - manfiy
        // summali INCOME/EXPENSE yozilsa, getStats() buni to'g'ridan-to'g'ri
        // balansga qo'shib, moliyaviy hisobotni buzardi; noto'g'ri format
        // esa 400 o'rniga 500 (NumberFormatException) qaytarardi.
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

        boolean isWorker = isScopedToOwnRecords();
        // Ishchi HAR DOIM PENDING (xavfsizlik - o'zini o'zi tasdiqlamasin).
        // Admin/buxgalter odatda CONFIRMED, lekin "rejalashtirilgan/hali
        // amalga oshmagan" xarajatni qayd etish uchun ATAYIN "PENDING"
        // yuborishi mumkin - shu holda yozuv "Tasdiq kutayotgan
        // tranzaksiyalar" bo'limida ko'rinadi va keyinroq confirmTransaction
        // orqali haqiqiy sarflangan/kelib tushgan deb belgilanadi.
        String requestedStatus = (String) request.get("status");
        String status;
        if (isWorker) {
            status = "PENDING";
        } else {
            status = "PENDING".equalsIgnoreCase(requestedStatus) ? "PENDING" : "CONFIRMED";
        }

        Transaction tx = Transaction.builder()
                .company(company)
                .type(type.toUpperCase())
                .amount(amount)
                .category(category)
                .description(description)
                .status(status)
                .worker(isWorker ? currentUser : null)
                // Hisobotlar ekranida ESKI OYGA kirim/chiqim kiritish uchun
                // (2026-08-06). Berilmasa null qoladi va @PrePersist joriy
                // vaqtni qo'yadi - Order.java'dagi bilan bir xil naqsh.
                .createdAt(parseBackdate(request.get("created_at")))
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
        if (isScopedToOwnRecords()) {
            // MUHIM (tuzatildi): avval status filtrsiz edi - ishchining o'zi
            // kiritgan, hali tasdiqlanmagan (PENDING) yozuvlari ham allaqachon
            // sarflangan/kelib tushgan pul sifatida balansga qo'shilib ketardi.
            txs = transactionRepository.findByCompanyIdAndWorkerId(companyId, currentUser.getId())
                    .stream()
                    .filter(tx -> "CONFIRMED".equalsIgnoreCase(tx.getStatus()))
                    .toList();
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
    @PreAuthorize("@perm.has('finance')")
    public ResponseEntity<?> getPendingTransactions() {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }
        List<Transaction> pending = transactionRepository.findByCompanyIdAndStatus(UUID.fromString(tenantId), "PENDING");
        return ResponseEntity.ok(pending);
    }

    @PutMapping("/transactions/{id}/confirm")
    @PreAuthorize("@perm.has('finance')")
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

    /**
     * Xato kiritilgan (noto'g'ri summa/kategoriya) BITTA tranzaksiyani
     * o'chirish - avval buning yagona yo'li butun tarixni yo'q qiladigan
     * /reset edi. Faqat o'sha kompaniyaga tegishli yozuvni o'chiradi.
     */
    @DeleteMapping("/transactions/{id}")
    @PreAuthorize("@perm.has('finance')")
    public ResponseEntity<?> deleteTransaction(@PathVariable UUID id) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }
        Transaction tx = transactionRepository.findById(id).orElse(null);
        if (tx == null || !tx.getCompany().getId().equals(UUID.fromString(tenantId))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Tranzaksiya topilmadi"));
        }
        transactionRepository.delete(tx);
        return ResponseEntity.noContent().build();
    }

    /**
     * Korxona ishga tushishidan oldin (test/sinov davrida) yig'ilib qolgan
     * barcha kirim-chiqim yozuvlarini o'chirib, moliya balansini 0ga
     * tushiradi. FAQAT "transactions" jadvaliga tegadi - buyurtmalar,
     * mijozlar, xodimlar, oylik (Salary) yozuvlari, GPS/qo'ng'iroqlar tarixi
     * BUTUNLAY DAXLSIZ qoladi.
     *
     * MUHIM: bu amal QAYTARILMAYDI (o'chirilgan tranzaksiyalarni tiklab
     * bo'lmaydi), shuning uchun:
     * 1) faqat ADMIN roli chaqira oladi (class darajasidagi 'finance'/
     *    'mobile_finance_view' ruxsati YETARLI EMAS - bugalter yoki
     *    boshqa "finance" huquqiga ega xodim buni bajara olmaydi);
     * 2) tasodifiy bosilib ketishning oldini olish uchun so'rov tanasida
     *    aniq "RESET" tasdiqlash so'zi talab qilinadi (frontend buni
     *    qattiq kiritilgan matn bilan yuboradi, foydalanuvchi alohida
     *    tasdiqlash oynasida ko'radi).
     */
    @PostMapping("/reset")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> resetFinance(@RequestBody(required = false) Map<String, String> request) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        String confirm = request != null ? request.get("confirm") : null;
        if (!"RESET".equals(confirm)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Tasdiqlash kodi noto'g'ri yoki yuborilmagan"));
        }

        UUID companyId = UUID.fromString(tenantId);
        List<Transaction> all = transactionRepository.findByCompanyId(companyId);
        int count = all.size();
        transactionRepository.deleteAll(all);

        return ResponseEntity.ok(Map.of(
                "message", count + " ta tranzaksiya o'chirildi - moliya balansi 0ga tushirildi",
                "deletedCount", count
        ));
    }
}
