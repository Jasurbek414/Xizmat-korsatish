package com.service.core.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.web.ErrorResponse;
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
     * Optimistik lock (Order/Debt/Salary'dagi @Version) mos kelmasa - ya'ni shu
     * yozuv accept/pay/confirm so'rovlari orasida parallel boshqa so'rov
     * tomonidan allaqachon o'zgartirilgan bo'lsa. Bu shart-tekshir-yoz
     * (check-then-act) yorig'i orqali bitta buyurtma/qarz/oylik uchun ikkita
     * marta pul tranzaksiyasi yozilib ketishining oldini oladi (masalan ikki
     * marta tez bosish yoki tarmoq xatosidan keyin qayta yuborish natijasida).
     * Mijozga 409 qaytariladi - u ma'lumotni qayta yuklab, joriy holatni
     * ko'rib, kerak bo'lsa qayta urinishi kerak.
     */
    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    public ResponseEntity<?> handleOptimisticLock(ObjectOptimisticLockingFailureException e) {
        log.warn("Optimistik lock ziddiyati: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "message", "Bu yozuv siz uni ochganingizdan beri boshqa so'rov tomonidan o'zgartirildi. " +
                        "Sahifani yangilab, joriy holatni tekshiring."
        ));
    }

    /**
     * @PreAuthorize (shu jumladan @perm.has(...)) rad etganda Spring bu istisnoni
     * tashlaydi - bu ham quyidagi generic Exception handler'ga tushib, noto'g'ri
     * 500 ("kutilmagan server xatoligi") qaytarardi, garchi aslida 403 bo'lishi
     * kerak bo'lsa ham (jonli aniqlangan: Bugalter rolidagi foydalanuvchi finance
     * so'rovi yuborganda).
     */
    @ExceptionHandler(AuthorizationDeniedException.class)
    public ResponseEntity<?> handleAuthorizationDenied(AuthorizationDeniedException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "message", "Sizda bu amalni bajarish uchun huquq yo'q."
        ));
    }

    /**
     * Buzuq yoki o'qib bo'lmaydigan so'rov tanasi (masalan noto'g'ri JSON) uchun 400.
     *
     * MUHIM: bu istisno - yuqoridagi ErrorResponse tekshiruvidan O'TMAYDI, chunki u
     * ErrorResponse'ni implement QILMAYDI (u NestedRuntimeException avlodi, Spring
     * uni odatda ResponseEntityExceptionHandler ichida alohida ushlaydi). Shu sababli
     * alohida handler shart - aks holda zaxira handlerga tushib 500 qaytaradi
     * (jonli tekshirilgan: "{buzuq" yuborilganda 500 chiqardi, 400 o'rniga).
     *
     * Parser xabari (qaysi belgi, qaysi qatorda) mijozga QAYTARILMAYDI - u ichki
     * sinf/maydon nomlarini oshkor qilishi mumkin.
     */
    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
    public ResponseEntity<?> handleUnreadableBody(org.springframework.http.converter.HttpMessageNotReadableException e) {
        log.warn("So'rov tanasi o'qib bo'lmadi: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "message", "So'rov ma'lumotlari noto'g'ri formatda yuborilgan."
        ));
    }

    /**
     * Boshqa hech qaysi handler ushlamagan har qanday kutilmagan xato uchun zaxira. Buni
     * qo'ymasak, Spring xatoni "/error"ga forward qiladi va yuqoridagi sinf izohida
     * tushuntirilgan sabab bilan chalkashtiruvchi 403 chiqadi - asl xato (masalan 500) emas.
     *
     * MUHIM (2026-07-31 auditda topilgan): bu zaxira handler Spring'ning O'Z standart
     * so'rov xatolarini ham yutib yuborardi va hammasiga 500 qaytarardi - garchi ular
     * mijoz xatosi (4xx) bo'lsa ham. Jonli aniqlangan: POST-only "/api/v1/auth/login"
     * ga GET yuborilganda 405 (Method Not Allowed) o'rniga 500 qaytardi
     * (HttpRequestMethodNotSupportedException). Bu mijoz uchun chalkashtiruvchi -
     * "server buzuq" degan taassurot beradi, aslida so'rov noto'g'ri.
     *
     * Spring 6+ da bunday standart istisnolar (405, 415, 404, noto'g'ri JSON uchun 400
     * va h.k.) ErrorResponse interfeysini implement qiladi va TO'G'RI status kodni
     * o'zida olib yuradi. Shuning uchun har birini alohida @ExceptionHandler bilan
     * yozish o'rniga shu yagona tekshiruv butun sinfni bir yo'la hal qiladi -
     * kelajakda Spring qo'shadigan yangi standart istisnolar ham avtomatik to'g'ri
     * ishlaydi.
     *
     * Mijozga xabar sifatida ProblemDetail'ning "detail" maydoni ishlatiladi - u
     * ataylab mijozga ko'rsatish uchun mo'ljallangan va ichki tafsilotlarni oshkor
     * qilmaydi (istisnoning xom getMessage() matnidan farqli).
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleUnexpected(Exception e) {
        if (e instanceof ErrorResponse errorResponse) {
            HttpStatusCode status = errorResponse.getStatusCode();
            String detail = errorResponse.getBody() != null ? errorResponse.getBody().getDetail() : null;
            if (detail == null || detail.isBlank()) {
                detail = "So'rov noto'g'ri - server uni bajara olmadi.";
            }
            // 4xx mijoz xatosi: stack trace kerak emas, log'ni to'ldirmaymiz.
            log.warn("So'rov xatosi [{}]: {}", status.value(), e.getMessage());
            return ResponseEntity.status(status).body(Map.of("message", detail));
        }

        log.error("Kutilmagan xatolik", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "message", "Kutilmagan server xatoligi yuz berdi. Iltimos, keyinroq qayta urinib ko'ring."
        ));
    }
}
