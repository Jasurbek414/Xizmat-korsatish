# Kutish musiqasi (Music on Hold)

Bu papka `musiconhold.conf`dagi `[default]` klassiga ulanadi
(`mode=files`, `directory=moh`) va konteynerda
`/var/lib/asterisk/moh/` sifatida ko'rinadi.

**Audio fayllar git'ga tushmaydi** (`.gitignore`ga qarang) — shuning uchun
yangi serverga o'rnatishda ularni **qo'lda ko'chirish kerak**. Aks holda
mijoz kutishga qo'yilganda yoki navbatda turganda mutlaq jimlik eshitadi va
ko'pchilik buni "aloqa uzildi" deb tushunib, go'shakni qo'yadi.

## 1. Fayl formati

Qo'llab-quvvatlanadi: `.wav` (8 kHz, mono, 16-bit PCM), `.gsm`, `.ulaw`,
`.alaw`, `.sln`

MP3'dan o'girish:

```bash
ffmpeg -i musiqa.mp3 -ar 8000 -ac 1 -acodec pcm_s16le musiqa.wav
```

`-ar 8000` (8 kHz) va `-ac 1` (mono) muhim — telefon liniyasi bundan
yuqorisini baribir tashlaydi, katta fayl faqat joy egallaydi.

Bir nechta fayl qo'yilsa playlist bo'ladi (alifbo tartibida ijro etiladi).

## 2. Faylni shu papkaga qo'ying

## 3. Asterisk'ga bildiring — BU YERDA TUZOQ BOR

`module reload res_musiconhold.so` va `moh reload` **ISHLAMAYDI**. Ikkalasi
ham "muvaffaqiyatli" deb javob beradi, lekin klass yaratilmaydi.

Sabab: papka bo'sh bo'lsa modul **yuklanish paytida** o'zini butunlay
o'chirib qo'yadi —

```
WARNING res_musiconhold.c: No music on hold classes configured, disabling music on hold.
```

— o'chirilgan modulni esa `reload` qayta yoqmaydi.

Ishlaydigan usul:

```bash
docker exec service-core-asterisk asterisk -rx "module unload res_musiconhold.so"
docker exec service-core-asterisk asterisk -rx "module load res_musiconhold.so"
```

yoki soddaroq:

```bash
docker restart service-core-asterisk
```

> Bu murakkablik faqat "bo'sh papkadan chiqish" uchun. Papkada fayl bo'lsa
> modul startup'da normal yuklanadi va keyinchalik oddiy `moh reload` yetadi.

## 4. Tekshiring

```bash
docker exec service-core-asterisk asterisk -rx "moh show classes"
docker exec service-core-asterisk asterisk -rx "moh show files"
```

Kutilgan natija:

```
Class: default
    Mode: files
    Directory: moh
    File: /var/lib/asterisk/moh/<fayl nomi>
```

Shu ko'rinsa tayyor. Boshqa konfiguratsiya o'zgartirish shart emas —
trunk'dagi `moh_suggest=default` allaqachon shu klassga ishora qiladi.
