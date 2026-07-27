package com.service.core.service;

import com.service.core.model.Role;
import com.service.core.model.User;
import com.service.core.repository.RoleRepository;
import com.service.core.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Endpoint'larni "Sozlamalar > Rollar va Huquqlar" sahifasida sozlanadigan HAQIQIY
 * ruxsatlar (Role.permissions xaritasi) asosida himoya qilish uchun. Avval har bir
 * kontroller @PreAuthorize'da faqat qattiq yozilgan rol nomlari ro'yxatini
 * (ADMIN, MANAGER, DISPATCHER...) tekshirardi - shu sabab admin panelda yaratilgan
 * har qanday YANGI/moslashtirilgan rol (masalan Bugalter) ruxsatlar sahifasida
 * "Buxgalteriya" huquqiga ega bo'lsa ham, backend uni har doim 403/500 bilan
 * rad etardi. Bu servis @PreAuthorize("@perm.has('finance')") shaklida ishlatiladi.
 */
@Component("perm")
public class PermissionService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    public PermissionService(UserRepository userRepository, RoleRepository roleRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
    }

    public boolean has(String... keys) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof String username)) {
            return false;
        }

        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return false;
        }
        // SUPERADMIN kompaniyaga ega emas va har doim to'liq kirish huquqiga ega -
        // barcha boshqa @PreAuthorize'larda ham u har doim ro'yxatga kiritilgan edi.
        if ("SUPERADMIN".equalsIgnoreCase(user.getRole()) || user.getCompany() == null) {
            return "SUPERADMIN".equalsIgnoreCase(user.getRole());
        }

        Role role = roleRepository.findByCompanyIdAndKey(user.getCompany().getId(), user.getRole()).orElse(null);
        if (role == null) {
            return false;
        }

        for (String key : keys) {
            if (Boolean.TRUE.equals(role.getPermissions().get(key))) {
                return true;
            }
        }
        return false;
    }
}
