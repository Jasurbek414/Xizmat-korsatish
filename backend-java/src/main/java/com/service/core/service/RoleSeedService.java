package com.service.core.service;

import com.service.core.model.Company;
import com.service.core.model.Role;
import com.service.core.repository.RoleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

/**
 * Har bir kompaniya uchun standart rollarni (Admin, Menejer, Haydovchi, Ishchi, Sex hodimi)
 * yaratadi. Rol NOMLARI admin panelidan istalgan vaqt o'zgartirilishi mumkin - faqat "key"
 * (kod ichida ishlatiladigan o'zgarmas identifikator) va ADMIN rolining o'zi qulflangan.
 */
@Service
public class RoleSeedService {

    private final RoleRepository roleRepository;

    public RoleSeedService(RoleRepository roleRepository) {
        this.roleRepository = roleRepository;
    }

    /**
     * Har bir standart rolni alohida tekshiradi va faqat yo'q bo'lganini yaratadi - shu tarzda
     * kelajakda yangi standart rol qo'shilsa, allaqachon boshqa rollarga ega bo'lgan eski
     * kompaniyalar ham avtomatik ravishda to'ldiriladi (birortasi ustidan yozilmaydi).
     */
    @Transactional
    public void seedDefaultRolesIfMissing(Company company) {
        createIfMissing(company, "ADMIN", "Administrator", "Администратор", "Administrator", true, allPermissions(true));
        createIfMissing(company, "MANAGER", "Menejer", "Менеджер", "Manager", false, managerPermissions());
        createIfMissing(company, "DISPATCHER", "Dispetcher", "Диспетчер", "Dispatcher", false, dispatcherPermissions());
        createIfMissing(company, "WORKER_DRIVER", "Haydovchi", "Водитель", "Driver", false, driverPermissions());
        createIfMissing(company, "WORKER", "Ishchi", "Рабочий", "Worker", false, workerPermissions());
        createIfMissing(company, "WORKER_SEH", "Sex hodimi", "Сотрудник цеха", "Workshop Employee", false, workshopPermissions());
    }

    private void createIfMissing(Company company, String key, String nameUz, String nameRu, String nameEn,
                                  boolean isSystem, Map<String, Boolean> permissions) {
        if (roleRepository.existsByCompanyIdAndKey(company.getId(), key)) {
            return;
        }
        roleRepository.save(buildRole(company, key, nameUz, nameRu, nameEn, isSystem, permissions));
    }

    private Role buildRole(Company company, String key, String nameUz, String nameRu, String nameEn,
                            boolean isSystem, Map<String, Boolean> permissions) {
        return Role.builder()
                .company(company)
                .key(key)
                .nameUz(nameUz)
                .nameRu(nameRu)
                .nameEn(nameEn)
                .isSystem(isSystem)
                .permissions(permissions)
                .build();
    }

    private Map<String, Boolean> allPermissions(boolean value) {
        Map<String, Boolean> perms = new HashMap<>();
        for (String key : PermissionKeys.ALL) {
            perms.put(key, value);
        }
        return perms;
    }

    private Map<String, Boolean> managerPermissions() {
        Map<String, Boolean> perms = allPermissions(false);
        perms.put(PermissionKeys.CLIENTS, true);
        perms.put(PermissionKeys.EMPLOYEES, true);
        perms.put(PermissionKeys.ORDERS, true);
        perms.put(PermissionKeys.FINANCE, true);
        perms.put(PermissionKeys.SALARIES, true);
        perms.put(PermissionKeys.MAP, true);
        perms.put(PermissionKeys.MOBILE_FINANCE_VIEW, true);
        perms.put(PermissionKeys.MOBILE_TEAM_VIEW, true);
        perms.put(PermissionKeys.MOBILE_CHAT, true);
        return perms;
    }

    private Map<String, Boolean> dispatcherPermissions() {
        Map<String, Boolean> perms = allPermissions(false);
        perms.put(PermissionKeys.CLIENTS, true);
        perms.put(PermissionKeys.ORDERS, true);
        perms.put(PermissionKeys.MAP, true);
        return perms;
    }

    private Map<String, Boolean> driverPermissions() {
        Map<String, Boolean> perms = allPermissions(false);
        perms.put(PermissionKeys.MOBILE_ORDERS, true);
        perms.put(PermissionKeys.MOBILE_GPS, true);
        perms.put(PermissionKeys.MOBILE_CHAT, true);
        perms.put(PermissionKeys.MOBILE_SALARY_VIEW, true);
        perms.put(PermissionKeys.MOBILE_FINANCE_VIEW, true);
        return perms;
    }

    private Map<String, Boolean> workerPermissions() {
        Map<String, Boolean> perms = allPermissions(false);
        perms.put(PermissionKeys.MOBILE_ORDERS, true);
        perms.put(PermissionKeys.MOBILE_CHAT, true);
        perms.put(PermissionKeys.MOBILE_SALARY_VIEW, true);
        return perms;
    }

    private Map<String, Boolean> workshopPermissions() {
        Map<String, Boolean> perms = allPermissions(false);
        perms.put(PermissionKeys.MOBILE_ORDERS, true);
        perms.put(PermissionKeys.MOBILE_CHAT, true);
        perms.put(PermissionKeys.MOBILE_SALARY_VIEW, true);
        return perms;
    }
}
