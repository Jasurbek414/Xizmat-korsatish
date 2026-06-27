# Universal Xizmat Ko'rsatish Tizimi (SaaS ERP)

Ushbu loyiha xizmat ko'rsatish kompaniyalari uchun universal boshqaruv tizimi bo'lib, uning tarkibiga quyidagi platformalar kiradi:
1. **backend-java**: Java Spring Boot da yozilgan yagona Multi-tenant API.
2. **frontend-admin**: React + TailwindCSS da yozilgan Web Admin paneli.
3. **desktop-dispatcher**: Tauri + React da yozilgan dispetcherlar uchun minimalist desktop dastur.
4. **mobile-flutter**: Flutter da yozilgan haydovchilar, ishchilar va menejerlar uchun dark mode ilova.

---

## 📂 Loyiha Strukturasi (Folder Structure)

Loyihani professional tarzda, modulli va toza kod bilan boshlash uchun quyidagi papkalar arxitekturasidan foydalaniladi:

```
/Xizmat korsatish
  ├── TZ.md                     # Loyihaning to'liq Texnik Vazifasi
  ├── README.md                 # Loyiha haqida umumiy qo'llanma (Ushbu fayl)
  │
  ├── /backend-java             # Spring Boot Backend
  │     ├── /src/main/java/com/service/core
  │     │     ├── /config       # Xavfsizlik, WebSockets, i18n sozlamalari
  │     │     ├── /controller   # REST API Controllerlari
  │     │     ├── /model        # Ma'lumotlar bazasi entitylari (JPA)
  │     │     ├── /repository   # Database Repositorylari
  │     │     ├── /service      # Biznes logika (Services)
  │     │     └── /tenant       # Multi-tenancy ajratish filtri va context
  │     └── pom.xml
  │
  ├── /frontend-admin           # Web Admin Panel
  │     ├── /src
  │     │     ├── /components   # Umumiy UI elementlar (button, input, modal)
  │     │     ├── /features     # Alohida funksional modullar (finance, clients)
  │     │     ├── /hooks        # Custom hooks (API, logic)
  │     │     ├── /i18n         # Tarjima JSONlari (uz, ru, en)
  │     │     ├── /services     # API (Axios client)
  │     │     └── /store        # Zustand yoki Context API state
  │     └── package.json
  │
  ├── /desktop-dispatcher       # Tauri Desktop App
  │     ├── /src-tauri          # Tauri Rust sozlamalari va buildlar
  │     ├── /src                # React interfeysi
  │     │     ├── /components   # UI komponentlar
  │     │     ├── /sip          # SIP.js va VoIP logikasi
  │     │     ├── /i18n         # Tarjima JSONlari (uz, ru, en)
  │     │     └── /services     # API xizmatlari
  │     └── package.json
  │
  └── /mobile-flutter           # Flutter Mobile App
        ├── /lib
        │     ├── /core         # Global constants, network, localization, theme
        │     ├── /features     # Modullar (Auth, Map, DriverDashboard)
        │     ├── /models       # Data entities
        │     └── /widgets      # Custom reusable widgets
        └── pubspec.yaml
```

---

## 🛠️ Loyihani O'rnatish va Ishga Tushirish

### 1. Backend (Java)
1. **Talablar**: Java JDK 17 yoki 21, Maven, PostgreSQL.
2. **Ishga tushirish**:
   ```bash
   cd backend-java
   mvn spring-boot:run
   ```

### 2. Frontend Admin (React)
1. **Talablar**: Node.js v18+.
2. **Ishga tushirish**:
   ```bash
   cd frontend-admin
   npm install
   npm run dev
   ```

### 3. Desktop Dispatcher (Tauri)
1. **Talablar**: Rust (rustup), Node.js.
2. **Ishga tushirish**:
   ```bash
   cd desktop-dispatcher
   npm install
   npm run tauri dev
   ```

### 4. Mobile App (Flutter)
1. **Talablar**: Flutter SDK v3.x, Android Studio / Xcode.
2. **Ishga tushirish**:
   ```bash
   cd mobile-flutter
   flutter pub get
   flutter run
   ```

---

## 📜 Kod Sifati Qoidalari (Senior Level Constraints)
* **Bitta faylda faqat bitta maqsad**: Logic va View doimo ajratilgan bo'lishi kerak.
* **Component size**: Har bir React/Tauri komponenti maksimal 200-250 qator bo'lishi lozim. Agar undan oshsa, kichikroq sub-komponentlarga yoki custom hook-larga bo'linadi.
* **Localization**: Hamma matnlar `i18n` tizimi orqali ishlatilishi shart. Hardcoded matnlarga yo'l qo'yilmaydi.
