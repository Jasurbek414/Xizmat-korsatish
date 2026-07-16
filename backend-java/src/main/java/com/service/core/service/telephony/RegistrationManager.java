package com.service.core.service.telephony;

import com.service.core.model.Registration;
import com.service.core.model.SipAccount;
import com.service.core.repository.RegistrationRepository;
import com.service.core.repository.SipAccountRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RegistrationManager {

    private final SipAccountRepository sipAccountRepository;
    private final RegistrationRepository registrationRepository;
    private final SIPAdapter sipAdapter;
    private final FreeSwitchGatewayFileWriter gatewayFileWriter;

    private final Map<UUID, String> statusCache = new ConcurrentHashMap<>();

    public RegistrationManager(SipAccountRepository sipAccountRepository,
                               RegistrationRepository registrationRepository,
                               SIPAdapter sipAdapter,
                               FreeSwitchGatewayFileWriter gatewayFileWriter) {
        this.sipAccountRepository = sipAccountRepository;
        this.registrationRepository = registrationRepository;
        this.sipAdapter = sipAdapter;
        this.gatewayFileWriter = gatewayFileWriter;
    }

    public String getStatus(UUID sipAccountId) {
        return statusCache.getOrDefault(sipAccountId, "UNREGISTERED");
    }

    public void updateStatus(UUID sipAccountId, String status, String errorMessage) {
        statusCache.put(sipAccountId, status);
        
        SipAccount account = sipAccountRepository.findById(sipAccountId).orElse(null);
        if (account == null) return;

        List<Registration> active = registrationRepository.findBySipAccountId(sipAccountId);
        Registration reg;
        if (active.isEmpty()) {
            reg = Registration.builder()
                    .sipAccount(account)
                    .status(status)
                    .build();
        } else {
            reg = active.get(0);
            reg.setStatus(status);
        }

        if ("REGISTERED".equals(status)) {
            reg.setLastRegisteredAt(LocalDateTime.now());
            reg.setNextRegisterDue(LocalDateTime.now().plusSeconds(account.getKeepaliveInterval()));
            reg.setErrorMessage(null);
        } else {
            reg.setErrorMessage(errorMessage);
        }

        registrationRepository.save(reg);
    }

    @Scheduled(fixedRate = 30000) // Every 30 seconds
    public void checkAndRegisterTrunks() {
        List<SipAccount> accounts = sipAccountRepository.findAll();
        for (SipAccount account : accounts) {
            String currentStatus = getStatus(account.getId());
            if ("UNREGISTERED".equals(currentStatus) || "FAILED".equals(currentStatus)) {
                updateStatus(account.getId(), "REGISTERING", null);
                try {
                    // Gateway faylini har safar qayta yozamiz (o'z-o'zini tuzatuvchi -
                    // masalan volume tiklanganda yoki fayl SipAccountController orqali
                    // emas, boshqa yo'l bilan yaratilgan hisob uchun hech qachon
                    // yozilmagan bo'lsa ham, shu yerda albatta mavjud bo'lishini
                    // ta'minlaydi - jonli testda aynan shu holat aniqlangan edi).
                    gatewayFileWriter.writeGateway(account);
                    sipAdapter.register(account);
                    // Haqiqiy holat FreeSwitchEventListener (sofia::gateway_state)
                    // orqali tasdiqlanadi - bu yerda muvaffaqiyat taxmin qilinmaydi.
                } catch (Exception e) {
                    updateStatus(account.getId(), "FAILED", e.getMessage());
                }
            }
        }
    }
}
