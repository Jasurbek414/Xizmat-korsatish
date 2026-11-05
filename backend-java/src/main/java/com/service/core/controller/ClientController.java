package com.service.core.controller;

import com.service.core.model.Client;
import com.service.core.model.ClientNote;
import com.service.core.model.Company;
import com.service.core.model.User;
import com.service.core.repository.ClientNoteRepository;
import com.service.core.repository.ClientRepository;
import com.service.core.repository.CompanyRepository;
import com.service.core.repository.UserRepository;
import com.service.core.tenant.TenantContext;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

// MUHIM (xavfsizlik, audit'da topilgan): bu kontrollerda hech qanday
// @PreAuthorize bo'lmagani uchun istalgan autentifikatsiya qilingan
// foydalanuvchi (jumladan WORKER_DRIVER) kompaniyaning BARCHA mijozlarini
// o'qiy, yarata, tahrirlay va o'chira olardi (jonli sinovda haydovchi
// tokeni bilan GET /clients -> 200 sifatida tasdiqlangan). Sinf darajasida
// 'clients' (veb-admin) yoki 'mobile_orders' (mobil - buyurtma yaratishda
// mijoz tanlash/yaratish uchun kerak) ruxsatlaridan biri talab qilinadi.
@RestController
@RequestMapping("/api/v1/clients")
@PreAuthorize("@perm.has('clients','mobile_orders')")
public class ClientController {

    private final ClientRepository clientRepository;
    private final CompanyRepository companyRepository;
    private final ClientNoteRepository clientNoteRepository;
    private final UserRepository userRepository;
    private final com.service.core.repository.OrderRepository orderRepository;

    public ClientController(ClientRepository clientRepository, CompanyRepository companyRepository,
                             ClientNoteRepository clientNoteRepository, UserRepository userRepository,
                             com.service.core.repository.OrderRepository orderRepository) {
        this.clientRepository = clientRepository;
        this.companyRepository = companyRepository;
        this.clientNoteRepository = clientNoteRepository;
        this.userRepository = userRepository;
        this.orderRepository = orderRepository;
    }

    private User getCurrentUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (!(principal instanceof String username)) {
            return null;
        }
        return userRepository.findByUsername(username).orElse(null);
    }

    /**
     * 2026-09-26 audit: ixtiyoriy `limit` va `offset` qo'shildi — avval bu
     * endpoint hech qanday parametr qabul qilmasdi va butun jadvalni qaytarardi.
     *
     * ORQAGA MOSLIK: parametrlar berilmasa xulq AYNAN avvalgidek qoladi.
     */
    @GetMapping
    public ResponseEntity<?> getClients(
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) Integer offset) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }
        UUID companyId = UUID.fromString(tenantId);

        if (limit == null) {
            return ResponseEntity.ok(clientRepository.findByCompanyIdOrderByCreatedAtDesc(companyId));
        }
        int size = Math.max(1, Math.min(limit, 500));
        int from = offset == null ? 0 : Math.max(0, offset);
        Pageable page = PageRequest.of(from / size, size);
        return ResponseEntity.ok(clientRepository.findByCompanyIdOrderByCreatedAtDesc(companyId, page));
    }

    // 2026-09-09 ishlash tezligi tuzatishi: boshqaruv paneli bosh ekrani
    // (mobil) avval shu sonni ko'rsatish uchun getClients()'ning BUTUN
    // ro'yxatini yuklab olardi - endi yengil COUNT endpoint.
    @GetMapping("/count")
    public ResponseEntity<?> getClientsCount() {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }
        return ResponseEntity.ok(Map.of("count", clientRepository.countByCompanyId(UUID.fromString(tenantId))));
    }

    @PostMapping
    public ResponseEntity<?> createClient(@RequestBody Map<String, String> request) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        String fullName = request.get("full_name");
        String phone = request.get("phone");
        String address = request.get("address");

        if (fullName == null || phone == null || fullName.isBlank() || phone.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Ism va telefon raqami kiritilishi shart"));
        }

        Company company = companyRepository.findById(UUID.fromString(tenantId))
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND, "Kompaniya topilmadi"));

        // Check duplicate phone
        Optional<Client> existing = clientRepository.findByCompanyIdAndPhone(company.getId(), phone.trim());
        if (existing.isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "Ushbu telefon raqamli mijoz allaqachon mavjud"));
        }

        Client client = Client.builder()
                .company(company)
                .fullName(formatFullName(fullName))
                .phone(phone.trim())
                .address(address)
                .build();

        Client saved = clientRepository.save(client);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @GetMapping("/search")
    public ResponseEntity<?> searchByPhone(@RequestParam String phone) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        Optional<Client> clientOpt = clientRepository.findByCompanyIdAndPhone(UUID.fromString(tenantId), phone.trim());
        if (clientOpt.isPresent()) {
            return ResponseEntity.ok(clientOpt.get());
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Mijoz topilmadi"));
    }

    // MUHIM (audit'da topilgan, xavfsizlik): sinf darajasidagi
    // '@perm.has(clients,mobile_orders)' o'qish/yaratish uchun to'g'ri (ikkalasi
    // ham buyurtma yaratishda mijoz tanlash/qo'shish uchun kerak), lekin
    // tahrirlash/o'chirishga ham tarqalib, istalgan ishchi (WORKER_DRIVER/
    // WORKER/WORKER_SEH, hammasida 'mobile_orders' bor) kompaniyaning
    // ISTALGAN mijozini o'zgartira yoki o'chira olardi - hech qanday UI buni
    // ko'rsatmasa ham, to'g'ridan-to'g'ri so'rov bilan mumkin edi. Bu ikki
    // amal faqat 'clients' (veb-admin boshqaruvi) bilan cheklanadi.
    @PutMapping("/{id}")
    @PreAuthorize("@perm.has('clients')")
    public ResponseEntity<?> updateClient(@PathVariable UUID id, @RequestBody Map<String, String> request) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        Client client = clientRepository.findById(id).orElse(null);
        if (client == null || !client.getCompany().getId().equals(UUID.fromString(tenantId))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Mijoz topilmadi"));
        }

        if (request.containsKey("full_name")) {
            String name = request.get("full_name");
            if (name == null || name.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Ism bo'sh bo'lishi mumkin emas"));
            }
            client.setFullName(formatFullName(name));
        }
        if (request.containsKey("phone")) {
            String newPhone = request.get("phone") == null ? "" : request.get("phone").trim();
            if (newPhone.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Telefon raqami bo'sh bo'lishi mumkin emas"));
            }
            // 2026-10-05 audit: (company_id, phone) UNIQUE. Avval tekshiruv
            // yo'q edi - boshqa mijozning raqami kiritilsa DataIntegrityViolation
            // GlobalExceptionHandler'da "Bu yozuvni O'CHIRIB bo'lmaydi..." degan
            // butunlay noto'g'ri xabar bilan 409 qaytarardi.
            Optional<Client> sameFone = clientRepository.findByCompanyIdAndPhone(client.getCompany().getId(), newPhone);
            if (sameFone.isPresent() && !sameFone.get().getId().equals(client.getId())) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("message", "Ushbu telefon raqamli boshqa mijoz allaqachon mavjud"));
            }
            client.setPhone(newPhone);
        }
        if (request.containsKey("address")) client.setAddress(request.get("address"));

        Client saved = clientRepository.save(client);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@perm.has('clients')")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> deleteClient(@PathVariable UUID id) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        Client client = clientRepository.findById(id).orElse(null);
        if (client == null || !client.getCompany().getId().equals(UUID.fromString(tenantId))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Mijoz topilmadi"));
        }

        // 2026-10-05 audit: avval to'g'ridan-to'g'ri delete() edi. Mijozning
        // buyurtmalari bo'lsa - FK xatosi; faqat CRM ESLATMALARI bo'lsa ham
        // xuddi shunday FK xatosi berib, mijozni umuman o'chirib bo'lmasdi
        // (eslatmalarni alohida o'chirish yo'li ham yo'q). Endi: buyurtmasi bor
        // mijoz aniq sabab bilan rad etiladi (tarix buzilmasin), buyurtmasiz
        // mijozning eslatmalari u bilan birga o'chiriladi.
        long orderCount = orderRepository.countByCompanyIdAndClientId(client.getCompany().getId(), client.getId());
        if (orderCount > 0) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message",
                    "Bu mijozning " + orderCount + " ta buyurtmasi bor - uni o'chirib bo'lmaydi (buyurtmalar tarixi buziladi)."));
        }
        clientNoteRepository.deleteAll(clientNoteRepository.findByClientIdOrderByCreatedAtDesc(client.getId()));
        clientRepository.delete(client);
        return ResponseEntity.ok(Map.of("message", "Mijoz muvaffaqiyatli o'chirildi"));
    }

    /**
     * Mijoz kartasidagi CRM eslatmalari - faqat veb-admin ('clients')
     * uchun, mobil ilova bu bilan ishlamaydi.
     */
    @GetMapping("/{id}/notes")
    @PreAuthorize("@perm.has('clients')")
    public ResponseEntity<?> getClientNotes(@PathVariable UUID id) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        Client client = clientRepository.findById(id).orElse(null);
        if (client == null || !client.getCompany().getId().equals(UUID.fromString(tenantId))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Mijoz topilmadi"));
        }

        return ResponseEntity.ok(clientNoteRepository.findByClientIdOrderByCreatedAtDesc(id));
    }

    @PostMapping("/{id}/notes")
    @PreAuthorize("@perm.has('clients')")
    public ResponseEntity<?> addClientNote(@PathVariable UUID id, @RequestBody Map<String, String> request) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        String text = request.get("text");
        if (text == null || text.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Eslatma matni bo'sh bo'lishi mumkin emas"));
        }

        Client client = clientRepository.findById(id).orElse(null);
        if (client == null || !client.getCompany().getId().equals(UUID.fromString(tenantId))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Mijoz topilmadi"));
        }

        ClientNote note = ClientNote.builder()
                .company(client.getCompany())
                .client(client)
                .author(getCurrentUser())
                .text(text.trim())
                .build();

        ClientNote saved = clientNoteRepository.save(note);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    /**
     * Mijoz ismini "Har bir so'z bosh harfi katta, qolgani kichik" formatga
     * keltiradi (masalan "aziz KARIMOV" -> "Aziz Karimov"). Bu yerda,
     * backend darajasida qilinadi - shunda ism qaysi tomondan kiritilishidan
     * qat'i nazar (veb, mobil haydovchi ekrani, mobil boshqaruv moduli) bir
     * xil, izchil formatda saqlanadi. Yon foyda: "aziz karimov" va "Aziz
     * Karimov" endi turli mijoz sifatida ko'rinmaydi.
     */
    private String formatFullName(String rawName) {
        if (rawName == null) return null;
        String trimmed = rawName.trim().replaceAll("\\s+", " ");
        if (trimmed.isEmpty()) return trimmed;

        StringBuilder result = new StringBuilder(trimmed.length());
        boolean capitalizeNext = true;
        for (char c : trimmed.toCharArray()) {
            if (Character.isWhitespace(c) || c == '-') {
                capitalizeNext = true;
                result.append(c);
            } else if (capitalizeNext) {
                result.append(Character.toUpperCase(c));
                capitalizeNext = false;
            } else {
                result.append(Character.toLowerCase(c));
            }
        }
        return result.toString();
    }
}
