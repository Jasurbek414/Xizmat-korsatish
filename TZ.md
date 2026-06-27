# TEXNIK VAZIFA (TECHNICAL SPECIFICATION)
## Loyiha nomi: Universal Xizmat Ko'rsatish Tizimi (SaaS ERP)

Ushbu hujjat universal xizmat ko'rsatish kompaniyalari (kurerlik, ta'mirlash, tozalash, servis markazlari va hk.) uchun mo'ljallangan ichki boshqaruv (ERP), mijozlar bazasi (CRM), dispetcherlik (Tauri Desktop App) va xodimlarni boshqarish (Flutter Mobile App) tizimining to'liq texnik talablarini belgilaydi.

---

## 1. TEXNOLOGIYALAR STEKI VA ARXITEKTURA

* **Backend**: Java (Spring Boot 3.x, Spring Security, JPA Hibernate, PostgreSQL, WebSockets, Flyway, Maven).
* **Web Admin Panel**: React 18+ (JavaScript, TailwindCSS, Vite, Shadcn/UI, React Router v6, Axios, react-i18next).
* **Dispetcher Desktop Dasturi**: Tauri v2 + React 18+ (Vite, TailwindCSS, SIP.js WebRTC telefoniya uchun, Lucide Icons, Leaflet.js).
* **Mobil Ilova**: Flutter (Dart, Bloc/Riverpod state management, flutter_map OpenStreetMap uchun, Hive/SQLite offline rejim uchun).
* **Infratuzilma va Media**: Docker, Nginx, MinIO (audio yozuvlar va rasmlar saqlagichi), Asterisk/FreePBX (IP-telefoniya serveri).

---

## 2. MA'LUMOTLAR BAZASI SXEMASI (DATABASE SCHEMA)

Tizim ko'p ijarachilik (Multi-tenancy) tamoyiliga ko'ra ishlaydi. Ma'lumotlar bazasi bitta bo'lib, har bir jadvalda `company_id` ustuni orqali ma'lumotlar izolatsiya qilinadi.

```sql
-- 1. Kompaniyalar (Ijarachilar) jadvali
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    sub_domain VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, BLOCKED, TRIAL
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Kompaniya obuna muddatlari (Billing)
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    plan_name VARCHAR(100) NOT NULL, -- BASIC, PREMIUM, ENTERPRISE
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE'
);

-- 3. Foydalanuvchilar (Xodimlar va Adminlar) jadvali
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(50) NOT NULL, -- SUPERADMIN, ADMIN, DISPATCHER, MANAGER, WORKER_DRIVER
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Mijozlar Bazasi (CRM)
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_company_client_phone UNIQUE (company_id, phone)
);

-- 5. Dinamik Buyurtma Statuslari
CREATE TABLE order_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name_uz VARCHAR(255) NOT NULL,
    name_ru VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    color_code VARCHAR(20) DEFAULT '#3b82f6', -- Tailwind ko'k rang kodi
    sort_order INT NOT NULL, -- Statuslar ketma-ketligi uchun
    is_system BOOLEAN DEFAULT FALSE, -- O'zgartirib bo'lmaydigan tizim statusi
    CONSTRAINT unique_company_status_order UNIQUE (company_id, sort_order)
);

-- 6. Xizmatlar va Narxlar katalogi
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name_uz VARCHAR(255) NOT NULL,
    name_ru VARCHAR(255) NOT NULL,
    name_en VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Buyurtmalar jadvali
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id),
    service_id UUID REFERENCES services(id),
    status_id UUID REFERENCES order_statuses(id),
    worker_id UUID REFERENCES users(id), -- Mas'ul haydovchi yoki ishchi
    price DECIMAL(10, 2) NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Buxgalteriya (Moliyaviy tranzaksiyalar)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL, -- INCOME (Kirim), EXPENSE (Chiqim)
    amount DECIMAL(12, 2) NOT NULL,
    category VARCHAR(100) NOT NULL, -- SALARY, ORDER_PAYMENT, OFFICE_EXPENSE, etc.
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Xodimlar Oylik Maoshlari
CREATE TABLE salaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    base_salary DECIMAL(10, 2) NOT NULL,
    bonus DECIMAL(10, 2) DEFAULT 0.0,
    deductions DECIMAL(10, 2) DEFAULT 0.0,
    pay_period DATE NOT NULL, -- Oylik davr (masalan, 2026-06-01)
    status VARCHAR(50) DEFAULT 'UNPAID', -- PAID, UNPAID
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Telefon Qo'ng'iroqlari Tarixi (SIP)
CREATE TABLE calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    dispatcher_id UUID REFERENCES users(id),
    client_id UUID REFERENCES clients(id),
    direction VARCHAR(20) NOT NULL, -- INBOUND (Kirim), OUTBOUND (Chiqim)
    duration INT NOT NULL, -- soniyalarda
    recording_url VARCHAR(512), -- MinIO da saqlangan audio fayl havolasi
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Xodimlar GPS Koordinatalari logi
CREATE TABLE gps_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. PLATFORMALAR FUNKSIONAL TADBIRLARI

### 3.1. Web Admin Panel (React) - Minimalist Dizayn
* **Dashboard**: Kunlik tushum, faol buyurtmalar soni, muammoli vaziyatlar va eng ko'p daromad keltirgan xizmatlar statistikasi (grafiklar yordamida).
* **Buxgalteriya**: Kirim-chiqim hisobotlari, oylik/yillik moliyaviy balans, xarajatlarni toifalash va hisobotlarni Excel/PDF formatda eksport qilish.
* **Xodimlar & Oylik**: Oyliklarni sozlash (fiks ish haqi + foizli tizim).
* **Dinamik Sozlamalar**:
  * **Buyurtma Statuslari**: Yangi status qo'shish, o'chirish, rangini o'zgartirish, sudrab tartiblash (drag-and-drop).
  * **Xizmatlar katalogi**: Xizmatlar ro'yxati, toifalari va ularning individual narxlarini boshqarish.
* **Real-time Map (OpenStreetMap + Leaflet)**:
  * Xaritada barcha faol haydovchilar/ishchilar markerlar ko'rinishida harakatlanishi.
  * Har bir markerga bosilganda haydovchining ismi, oxirgi yangilangan vaqti va joriy buyurtmasi chiqishi.

### 3.2. Dispetcher Desktop Dasturi (Tauri + React + Tailwind)
* **Minimalizm va Tezlik**: Dasturning bosh sahifasi chat va telefoniya uchun moslashtirilgan. Murakkab elementlarsiz, tezkor tugmalar bilan boshqariladi.
* **SIP Telefoniya Integratsiyasi**:
  * FreePBX / Asterisk serveriga WebRTC (SIP.js) orqali ulanish.
  * Ekranda raqam terish paneli (Dialer) va faol aloqa boshqaruvi (qo'ng'iroqni kutishga qo'yish, o'chirish, transfer qilish).
* **Caller ID Pop-up (Aqlli Oyna)**:
  * Mijoz qo'ng'iroq qilganida mijoz kartochkasi darhol ekranda ochiladi.
  * Agar mijoz bazada mavjud bo'lsa, ismi, oxirgi buyurtmasi, manzili va buyurtma holati avtomatik ko'rsatiladi.
  * Agar mijoz yangi bo'lsa, dispetcher gaplashish davomida uning ma'lumotlarini (ism, manzil) yozib, bazaga qo'shadi.
* **Real-time Buyurtma holati**:
  * Mijoz buyurtmasini tekshirish uchun qo'ng'iroq qilganda, dispetcher OSM xaritasida haydovchining joriy GPS holatini va buyurtma qaysi statusda ekanligini bir vaqtning o'zida ko'radi.

### 3.3. Mobil Ilova (Flutter) - Dark Theme
* **Dark-First Design**: Ilova to'liq qora va to'q rangli premium mavzuda bo'ladi.
* **Haydovchi / Ishchi Rejimi**:
  * Yangi buyurtma kelganda ovozli push bildirishnoma.
  * Buyurtma qabul qilish yoki rad etish.
  * OSM asosidagi `flutter_map` orqali mijoz manziliga yo'l xaritasi va GPS navigatsiyasi.
  * **Background GPS service**: Ilova fonda yopiq bo'lganda ham xodimning GPS koordinatalarini har 15 soniyada serverga uzatib turish.
  * **Offline Sync**: Internet yo'qolganda koordinatalarni lokal baza (Hive/SQLite)da to'plash va tarmoq tiklanganda yuborish.
* **Menejer Rejimi**:
  * Kompaniyadagi joriy moliyaviy balans, dispetcherlar faoliyati va haydovchilar ro'yxatini tezkor ko'rish.

### 3.4. Java Backend (Spring Boot Core)
* **Security & Multi-tenancy**:
  * JWT (JSON Web Tokens) orqali foydalanuvchilar xavfsizligi.
  * `TenantInterceptor` orqali har bir kelgan HTTP va WebSocket so'rovidan `X-TenantID` (Company ID) sarlavhasini ajratib olib, `TenantContext` o'zgaruvchisiga o'rnatish. Barcha SQL so'rovlar avtomatik shu TenantID bo'yicha filtrlanadi.
* **VoIP Call Gateway**:
  * Kiruvchi qo'ng'iroqlarda Asterisk AMI (Asterisk Manager Interface) orqali dispetcherning Tauri dasturiga WebSocket orqali xabar yuborish.
* **WebSockets Server**:
  * Real-time GPS yangilanishlarini tarqatish.
  * Dispetcher va haydovchi o'rtasidagi real-vaqt chatlari.
* **Media Storage Gateway**:
  * Asterisk tomonidan yozib olingan qo'ng'iroq audio fayllarini MinIO obyekt omboriga yuklash va DB dagi `calls` jadvaliga havola (link) saqlash.

---

## 4. KOD SIFATI VA ARXITEKTURA TALABLARI (SENIOR LEVEL)

### 4.1. Kod Tozaligi Prinsiplari
1. **DRY (Don't Repeat Yourself)** va **KISS (Keep It Simple, Stupid)** prinsiplariga qat'iy amal qilinadi.
2. **Katta fayllar yozish taqiqlanadi**: Har bir frontend fayli (React/Tauri) 250 qatordan oshmasligi kerak. Biznes logika (API so'rovlar, state logic) UI-komponentlardan custom hooklar yordamida ajratiladi.
3. **TypeScript / Strict types**: Kelajakda TypeScriptga o'tishni osonlashtirish uchun Reactda barcha funksiyalar va propslar toza tiplangan yoki komponentlar to'liq modullangan bo'lishi kerak.

### 4.2. Loyiha Kataloglar Tuzilmasi (Folders Structure)

```
/Xizmat korsatish
  ├── /backend-java             # Java Spring Boot loyihasi
  │     ├── /src/main/java
  │     │     └── /com/service/core
  │     │           ├── /config      # Security, WebSockets, Tenant configs
  │     │           ├── /controller  # REST API controllerlar
  │     │           ├── /model       # JPA Entity modellar
  │     │           ├── /repository  # JPA Repositorylar
  │     │           ├── /service     # Biznes logika (Service layer)
  │     │           └── /tenant      # Multi-tenancy filtrlari
  │     └── pom.xml
  │
  ├── /frontend-admin           # React Web Admin Paneli
  │     ├── /src
  │     │    ├── /components    # Kichik UI va umumiy komponentlar
  │     │    ├── /features      # Modullar (Buxgalteriya, Xodimlar, Xarita)
  │     │    ├── /hooks         # API va boshqa logika uchun custom hooklar
  │     │    ├── /i18n          # uz, ru, en tillari tarjima fayllari
  │     │    ├── /services      # Axios API integratsiyalari
  │     │    └── /store         # State management (Context API/Zustand)
  │     └── package.json
  │
  ├── /desktop-dispatcher       # Tauri + React Desktop ilova
  │     ├── /src-tauri          # Tauri Rust sozlamalari va buildlar
  │     ├── /src                # React interfeysi (Frontend-admin kabi)
  │     │    ├── /components
  │     │    ├── /sip           # SIP.js va telefoniya integratsiyasi logikasi
  │     │    └── /i18n
  │     └── package.json
  │
  └── /mobile-flutter           # Flutter Mobil Ilovasi
        ├── /lib
        │    ├── /core          # Network, theme, localization, constants
        │    ├── /features      # Modullar (Driver map, manager stats)
        │    ├── /models        # Ma'lumot turlari
        │    └── /widgets       # Widgetlar (Dark theme)
        └── pubspec.yaml
```

### 4.3. Ko'ptillilik (i18n) Arxitekturasi
Hamma tarjimalar alohida kalitlar bilan saqlanadi. UI da hech qanday qattiq yozilgan (hardcoded) matnlar ishlatilmaydi.
* **React/Tauri misoli (`/i18n/uz.json`)**:
  ```json
  {
    "dashboard": {
      "title": "Boshqaruv paneli",
      "total_income": "Umumiy tushum"
    },
    "order": {
      "status_changed": "Buyurtma holati o'zgardi"
    }
  }
  ```
* **Kodni ishlatilishi**:
  ```javascript
  const { t } = useTranslation();
  return <h1>{t('dashboard.title')}</h1>;
  ```

---

## 5. REJA VA BOSQICHLAR (ROADMAP)

1. **1-bosqich**: Ma'lumotlar bazasi sxemasini PostgreSQL da qurish va Spring Boot backend poydevorini (Multi-tenancy filter, Security) yaratish.
2. **2-bosqich**: React Web Admin panel poydevorini (UI kit, Router, i18n, minimalist layout) va Buxgalteriya hamda Xizmatlar boshqaruvini amalga oshirish.
3. **3-bosqich**: Tauri Desktop ilovasini yaratish, SIP.js telefoniya va Caller ID smart oynasini dasturlash.
4. **4-bosqich**: Flutter mobil ilovasini Dark mode dizaynda yig'ish, background GPS kuzatuvini sozlash.
5. **5-bosqich**: Real-time xaritani (OSM + Leaflet) admin panel va dispetcher ilovasiga integratsiya qilish hamda barcha tizimlarni umumiy testdan o'tkazish.
