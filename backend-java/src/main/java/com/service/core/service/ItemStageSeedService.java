package com.service.core.service;

import com.service.core.model.Company;
import com.service.core.model.ItemStage;
import com.service.core.repository.ItemStageRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Har bir kompaniya uchun standart gilam (OrderItem) bosqichlarini yaratadi.
 * Kalitlar (ACCEPTED/WASHED/DRIED/READY) OrderItem.status'da ALLAQACHON
 * saqlangan qadimiy qattiq-kodlangan qiymatlar bilan AYNAN mos - shu sabab
 * bu servis ishga tushganda eski gilamlar HECH QANDAY migratsiyasiz to'g'ri
 * bosqichga (nomi/rangi bilan) avtomatik bog'lanadi. Nomlar/ranglar avval
 * mobile-flutter/factory_order_detail_screen.dart'da qattiq kodlangan edi.
 */
@Service
public class ItemStageSeedService {
    private final ItemStageRepository itemStageRepository;

    public ItemStageSeedService(ItemStageRepository itemStageRepository) {
        this.itemStageRepository = itemStageRepository;
    }

    @Transactional
    public void seedDefaultStagesIfMissing(Company company) {
        createIfMissing(company, "ACCEPTED", "Qabul qilindi", "Принято", "Accepted", "#f59e0b", 1);
        createIfMissing(company, "WASHED", "Yuvildi", "Постирано", "Washed", "#3b82f6", 2);
        createIfMissing(company, "DRIED", "Quritildi", "Высушено", "Dried", "#22c55e", 3);
        createIfMissing(company, "READY", "Tayyor", "Готово", "Ready", "#14b8a6", 4);
    }

    private void createIfMissing(Company company, String stageKey, String nameUz, String nameRu, String nameEn,
                                  String colorCode, int sortOrder) {
        if (itemStageRepository.existsByCompanyIdAndStageKey(company.getId(), stageKey)) {
            return;
        }
        itemStageRepository.save(ItemStage.builder()
                .company(company)
                .stageKey(stageKey)
                .nameUz(nameUz)
                .nameRu(nameRu)
                .nameEn(nameEn)
                .colorCode(colorCode)
                .sortOrder(sortOrder)
                .build());
    }
}
