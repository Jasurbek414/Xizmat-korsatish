package com.service.core.config;

import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.core.JacksonException;
import tools.jackson.core.JsonGenerator;
import tools.jackson.databind.SerializationContext;
import tools.jackson.databind.ValueSerializer;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.module.SimpleModule;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

/**
 * MUHIM (audit'da topilgan xato, tuzatildi): standart Jackson jsr310 moduli
 * LocalDateTime'ni HECH QANDAY zona/offset belgisisiz serializatsiya qiladi
 * (masalan "2026-07-23T13:39:53.608387"). Backend konteyner UTC'da ishlaydi
 * (barcha LocalDateTime.now() chaqiruvlari aslida UTC qiymat), lekin mobil
 * ilova (Dart DateTime.parse) va veb-admin (JS Date) zona belgisiz qatorni
 * MAHALLIY vaqt deb qabul qiladi. O'zbekiston UTC+5 bo'lgani uchun bu 5
 * soatlik farqqa olib kelardi - masalan "Jamoa" xaritasida haydovchining GPS
 * signali hech qachon "yangi" ko'rinmasdi (TeamMember.isLocationStale doim
 * true), buyurtma va bildirishnoma vaqtlari ham 5 soat orqada ko'rsatilardi.
 * Endi barcha LocalDateTime maydonlari ISO-8601 "Z" (UTC) belgisi bilan
 * chiqariladi.
 *
 * MUHIM (topilgan): bu loyiha Spring Boot 4.1 / Jackson 3 ustida ishlaydi -
 * ObjectMapper endi O'ZGARMAS (immutable): oddiy "registerModule()" instance
 * metodi olib tashlangan, standart com.fasterxml.jackson.databind.* (Jackson
 * 2) klasslari orqali yozilgan birinchi urinish HECH QANDAY ta'sir
 * qilmagan edi (jonli tekshiruvda sezildi - haqiqiy ishlatiladigan mapper
 * bean'i "tools.jackson.databind.json.JsonMapper", butunlay boshqa paket/
 * klass ierarxiyasi). Shu sabab tools.jackson.* (Jackson 3) API'si
 * ishlatiladi: BeanPostProcessor to'liq tayyor JsonMapper'ni topib,
 * rebuild().addModule(...).build() orqali YANGI (bir xil sozlamali + bitta
 * qo'shimcha modulli) nusxa bilan almashtiradi.
 */
@Configuration
public class JacksonConfig {

    @Bean
    public static BeanPostProcessor utcLocalDateTimePostProcessor() {
        return new BeanPostProcessor() {
            @Override
            public Object postProcessAfterInitialization(Object bean, String beanName) {
                if (bean instanceof JsonMapper mapper) {
                    SimpleModule module = new SimpleModule("UtcLocalDateTimeModule");
                    module.addSerializer(LocalDateTime.class, new ValueSerializer<LocalDateTime>() {
                        @Override
                        public void serialize(LocalDateTime value, JsonGenerator gen, SerializationContext ctx) throws JacksonException {
                            gen.writeString(value.toInstant(ZoneOffset.UTC).toString());
                        }
                    });
                    return mapper.rebuild().addModule(module).build();
                }
                return bean;
            }
        };
    }
}
