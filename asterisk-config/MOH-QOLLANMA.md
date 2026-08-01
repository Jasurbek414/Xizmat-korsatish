# Kutish musiqasi (Music on Hold)

`moh/` papkasi `musiconhold.conf`dagi `[default]` klassiga ulanadi
(`mode=files`, `directory=moh`) va konteynerda
`/var/lib/asterisk/moh/` sifatida ko'rinadi.

> ⚠️ **`moh/` papkasiga audiodan boshqa hech narsa qo'ymang.** Asterisk
> papkadagi HAMMA faylni ijro etiladigan deb hisoblaydi. Bu qo'llanma avval
> shu papka ichida turgan edi va Asterisk uni `File: .../README` deb
> ro'yxatga olgan edi — shuning uchun tashqariga chiqarildi.

**Audio fayllar git'ga tushmaydi** (`.gitignore`ga qarang), lekin ular
yo'qolmaydi: `scripts/generate-moh.py` musiqani istalgan joyda qayta
yaratadi. Yangi serverga deploy qilganda shuni ishga tushiring:

```bash
python3 scripts/generate-moh.py
docker restart service-core-asterisk
```

Agar buni unutsangiz mijoz kutishga qo'yilganda mutlaq jimlik eshitadi va
ko'pchilik buni "aloqa uzildi" deb tushunib, go'shakni qo'yadi.

## Tayyor musiqa o'rniga o'z faylingizni qo'ymoqchi bo'lsangiz

`scripts/generate-moh.py` sinus to'lqinlaridan original ohang yaratadi —
mualliflik huquqi muammosi yo'q. Tayyor trek ishlatmoqchi bo'lsangiz,
litsenziyasiga e'tibor bering: ommaviy joyda (mijozga telefon orqali)
ijro etish odatda alohida ruxsat talab qiladi.

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
