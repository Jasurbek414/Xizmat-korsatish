package com.service.core.repository;

import com.service.core.model.Device;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DeviceRepository extends JpaRepository<Device, UUID> {
    List<Device> findByUserId(UUID userId);

    Optional<Device> findFirstByUserIdAndDeviceType(UUID userId, String deviceType);

    Optional<Device> findByExtensionNumber(String extensionNumber);

    // MUHIM (audit: 15-band) - keyingi bo'sh extension raqamini hisoblash
    // uchun DB darajasida ORDER BY ishlatilmaydi: extensionNumber VARCHAR
    // ustuni, shuning uchun DB'ning o'zi saralasa natija LEKSIKOGRAFIK
    // bo'lardi ("9999" > "10000" satr sifatida) - 10000-chi extension'dan
    // keyin raqamlar takrorlanib qolar edi. Shu sabab HAMMA raqamlar
    // qaytariladi, haqiqiy (butun son) maksimal ExtensionService'da
    // Java tomonida hisoblanadi.
    @Query("SELECT d.extensionNumber FROM Device d WHERE d.extensionNumber IS NOT NULL")
    List<String> findAllExtensionNumbers();
}
