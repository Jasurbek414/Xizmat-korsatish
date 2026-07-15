package com.service.core.controller;

import com.service.core.model.Client;
import com.service.core.model.Company;
import com.service.core.repository.ClientRepository;
import com.service.core.repository.CompanyRepository;
import com.service.core.tenant.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/clients")
public class ClientController {

    private final ClientRepository clientRepository;
    private final CompanyRepository companyRepository;

    public ClientController(ClientRepository clientRepository, CompanyRepository companyRepository) {
        this.clientRepository = clientRepository;
        this.companyRepository = companyRepository;
    }

    @GetMapping
    public ResponseEntity<?> getClients() {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        List<Client> clients = clientRepository.findByCompanyId(UUID.fromString(tenantId));
        return ResponseEntity.ok(clients);
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

        if (fullName == null || phone == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Ism va telefon raqami kiritilishi shart"));
        }

        Company company = companyRepository.findById(UUID.fromString(tenantId))
                .orElseThrow(() -> new RuntimeException("Kompaniya topilmadi"));

        // Check duplicate phone
        Optional<Client> existing = clientRepository.findByCompanyIdAndPhone(company.getId(), phone.trim());
        if (existing.isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "Ushbu telefon raqamli mijoz allaqachon mavjud"));
        }

        Client client = Client.builder()
                .company(company)
                .fullName(fullName.trim())
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

    @PutMapping("/{id}")
    public ResponseEntity<?> updateClient(@PathVariable UUID id, @RequestBody Map<String, String> request) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        Client client = clientRepository.findById(id).orElse(null);
        if (client == null || !client.getCompany().getId().equals(UUID.fromString(tenantId))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Mijoz topilmadi"));
        }

        if (request.containsKey("full_name")) client.setFullName(request.get("full_name").trim());
        if (request.containsKey("phone")) client.setPhone(request.get("phone").trim());
        if (request.containsKey("address")) client.setAddress(request.get("address"));

        Client saved = clientRepository.save(client);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteClient(@PathVariable UUID id) {
        String tenantId = TenantContext.getCurrentTenant();
        if (tenantId == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Tenant ID is missing"));
        }

        Client client = clientRepository.findById(id).orElse(null);
        if (client == null || !client.getCompany().getId().equals(UUID.fromString(tenantId))) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Mijoz topilmadi"));
        }

        clientRepository.delete(client);
        return ResponseEntity.ok(Map.of("message", "Mijoz muvaffaqiyatli o'chirildi"));
    }
}
