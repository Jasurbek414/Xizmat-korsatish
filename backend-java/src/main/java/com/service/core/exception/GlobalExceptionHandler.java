package com.service.core.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

/**
 * Controllerlarda ushlanmagan istisnolarni to'g'ridan-to'g'ri shu yerda javob
 * sifatida qaytaradi. Buning SABABI: agar bu handler bo'lmasa, Spring
 * xatoni ichki "/error" so'roviga yo'naltiradi - bu ICHKI forward original
 * so'rovning Authorization headerini olib yurmaydi, shu sabab autentifikatsiya
 * qilinmagan holda "/error" endpointiga uriladi va chalkashtiruvchi, NOTO'G'RI
 * 403 (Forbidden) qaytaradi - aslida xato butunlay boshqa narsa (masalan FK
 * cheklovi) bo'lsa ham. Shu handler asl sababni to'g'ri status kod va aniq
 * xabar bilan qaytarish orqali oldini oladi.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<?> handleDataIntegrityViolation(DataIntegrityViolationException e) {
        log.warn("Ma'lumotlar butunligi xatosi: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "message", "Bu yozuvni o'chirib bo'lmaydi - unga bog'liq boshqa ma'lumotlar mavjud " +
                        "(masalan buyurtmalar yoki to'lovlar). Avval o'sha bog'liq yozuvlarni o'chiring."
        ));
    }

    /**
     * Boshqa hech qaysi handler ushlamagan har qanday kutilmagan xato uchun zaxira. Buni
     * qo'ymasak, Spring xatoni "/error"ga forward qiladi va yuqoridagi sinf izohida
     * tushuntirilgan sabab bilan chalkashtiruvchi 403 chiqadi - asl xato (masalan 500) emas.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleUnexpected(Exception e) {
        log.error("Kutilmagan xatolik", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "message", "Kutilmagan server xatoligi yuz berdi. Iltimos, keyinroq qayta urinib ko'ring."
        ));
    }
}
