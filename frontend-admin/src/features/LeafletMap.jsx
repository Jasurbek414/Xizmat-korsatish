import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTranslation } from 'react-i18next';
import { Search, Navigation, RefreshCw, Phone, Compass, Layers, Crosshair, Target, ChevronDown, Ruler, X, MapPin, Package } from 'lucide-react';
import { api } from '../services/api';
import { showToast } from '../services/toast';

// Korxona markazi ham, birorta haydovchi joylashuvi ham hali topilmagan
// bo'lsa ishlatiladigan ENG OXIRGI zaxira nuqta (Toshkent) - foydalanuvchi
// so'rovi bo'yicha bu endi FAQAT shu ikkalasi ham yo'q bo'lgandagina
// ishlatiladi (pastdagi "haydovchilarga avtomatik markazlash" hookiga q.),
// avval esa hech qanday shart-sharoitsiz doim shu qiymat ko'rsatilardi.
const FALLBACK_CENTER = [41.311081, 69.240562];

// Xarita uslublari - foydalanuvchi "ko'chalar/binolar aniq ko'rinishi kerak"
// deb so'ragani uchun qo'shildi. Har birining o'z plitka manzili va
// sozlamalari bor (subdomenlar/retina/maxZoom provayderga qarab farq
// qiladi), shu sabab yagona qattiq yozilgan URL o'rniga xarita.
const MAP_STYLES = {
  // Foydalanuvchi ANIQ shu uslubni (standart OpenStreetMap/Leaflet
  // attributsiyasi - "Leaflet | © OpenStreetMap contributors") so'radi -
  // Esri sinovi bekor qilindi, asl OSM standart (Mapnik) plitkalariga
  // qaytarildi.
  streets: {
    label: "Ko'chalar (aniq)",
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: {
      subdomains: 'abc',
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    },
  },
  satellite: {
    label: "Sun'iy yo'ldosh",
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    options: {
      maxZoom: 19,
      attribution: 'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics',
    },
    // MUHIM: sof sun'iy yo'ldosh surati (yuqoridagi) ko'cha/joy NOMLARINI
    // UMUMAN o'z ichiga olmaydi - shu sabab foydalanuvchi "ko'cha nomlari
    // yo'q" deb topdi. Esri'ning shaffof "Boundaries_and_Places" qatlami
    // aynan surat USTIGA ko'cha/shahar nomlari va chegaralarni chizadi
    // (Google Xarita "gibrid" rejimidagi kabi) - shu sabab qo'shildi.
    overlay: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      options: {
        maxZoom: 19,
        attribution: 'Labels © Esri',
      },
    },
  },
  voyager: {
    label: 'Rangli (Voyager)',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    options: {
      subdomains: 'abcd',
      maxZoom: 20,
      detectRetina: true,
      attribution: '© OpenStreetMap contributors, © CartoDB',
    },
  },
  dark: {
    label: 'Tungi',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    options: {
      subdomains: 'abcd',
      maxZoom: 20,
      detectRetina: true,
      attribution: '© OpenStreetMap contributors, © CartoDB',
    },
  },
};

// Masofa o'lchash natijasini o'qish qulay ko'rinishga o'tkazadi (metrlarda
// keladi - Leaflet'ning L.latLng().distanceTo() geodezik/Haversine
// formulasi orqali, Yer sharining egriligini hisobga oladi).
const formatDistance = (meters) => {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
};

// Haydovchi shu vaqt ichida GPS yubormasa "OFFLINE" deb hisoblanadi (mobil
// ilova har 15 soniyada bir marta yuboradi - 45s ~ 3 marta ketma-ket
// o'tkazib yuborilsa, haqiqatan ham signal yo'qolgan deb hisoblaymiz).
const GPS_STALE_MS = 45_000;

const formatLastSeen = (lastSeenMs) => {
  if (!lastSeenMs) return 'Hech qachon';
  const diffSec = Math.max(0, Math.floor((Date.now() - lastSeenMs) / 1000));
  if (diffSec < 60) return 'Hozirgina';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} daqiqa oldin`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} soat oldin`;
  return `${Math.floor(diffHour / 24)} kun oldin`;
};

// Safar (DriverTrip) davomiyligini o'qish qulay ko'rinishga o'tkazadi.
const formatDuration = (seconds) => {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} daq`;
  const hours = Math.floor(mins / 60);
  const restMins = mins % 60;
  return restMins > 0 ? `${hours} soat ${restMins} daq` : `${hours} soat`;
};

const formatTripTime = (isoString) => {
  if (!isoString) return '—';
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Xaritada "kutilayotgan buyurtmalar" qatlami qaysi buyurtmalarni
// ko'rsatishini foydalanuvchi O'ZI tanlaydi (avval qattiq yozilgan bitta
// qoida bor edi - foydalanuvchi buni funksiya sifatida so'radi).
const ORDER_FILTERS = {
  active: {
    label: 'Faol (haydovchi bor)',
    test: (o) => !!o.worker_name,
  },
  all: {
    label: 'Hammasi',
    test: () => true,
  },
  recent: {
    label: "Yaqindagilar (24 soat)",
    test: (o) => o.createdAt && (Date.now() - new Date(o.createdAt).getTime()) < 24 * 60 * 60 * 1000,
  },
};

const LeafletMap = ({ tab }) => {
  const { t, i18n } = useTranslation();
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  
  // State variables
  const [drivers, setDrivers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, FREE, BUSY, OFFLINE
  const [selectedDriverId, setSelectedDriverId] = useState(null);
  // Tanlangan haydovchining safarlar tarixi (korxona markazidan chiqib-
  // kirgan HAR BIR safar - foydalanuvchi so'rovi bo'yicha ALOHIDA-ALOHIDA).
  const [driverTrips, setDriverTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState(null);
  // Xaritadagi "kutilayotgan buyurtmalar" qatlamini qaysi buyurtmalar
  // bo'yicha filtrlash - foydalanuvchi so'rovi bo'yicha O'ZI tanlaydi.
  const [orderFilterMode, setOrderFilterMode] = useState('active');
  const [orderFilterMenuOpen, setOrderFilterMenuOpen] = useState(false);
  const tripPathGroupRef = useRef(null);
  const latestTripsRequestRef = useRef(null);
  // Pastdagi 6 soniyalik pollingda ENG SO'NGGI tanlangan haydovchini bilish
  // uchun - useEffect ichidagi setInterval yopilishi (closure) selectedDriverId
  // state'ini "eski" holatda ushlab qolardi, shu sabab ref orqali kuzatiladi.
  const selectedDriverIdRef = useRef(null);
  // Standart: foydalanuvchi ko'chalar/binolar ANIQ ko'rinishini so'ragani
  // uchun kunduzgi mavzuda "streets" (OpenStreetMap standart uslubi)
  // tanlandi - avval rangli, lekin bino chegaralari xira "voyager" edi.
  const [mapStyle, setMapStyle] = useState(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'streets'
  );
  const [styleMenuOpen, setStyleMenuOpen] = useState(false);

  // Korxona markazi - avval har doim Toshkent (FALLBACK_CENTER) qattiq
  // yozilgan edi, kompaniya qayerda joylashganidan qat'i nazar.
  const [companyCenter, setCompanyCenter] = useState(null);
  const [pickingCenter, setPickingCenter] = useState(false);
  const [savingCenter, setSavingCenter] = useState(false);
  // MUHIM (jonli holatda takror aniqlangan): brauzer geolokatsiyasi
  // kompyuterda GPS chipi yo'qligi sabab IP/WiFi orqali taxmin qiladi - bu
  // xato bo'lishi mumkin (masalan Toshkentda turib Samarqand chiqishi) va
  // avval NATIJA TEKSHIRUVSIZ darhol saqlanardi. Endi geolokatsiya natijasi
  // avval shu "tasdiqlash kutilmoqda" holatiga tushadi - xaritada ko'rsatib
  // turiladi, lekin foydalanuvchi ANIQ "Ha, to'g'ri" demaguncha saqlanmaydi.
  const [pendingLocation, setPendingLocation] = useState(null);
  // pendingLocation qayerdan kelganini eslab qoladi ('geolocation' yoki
  // 'manual') - tasdiqlash matni shunga qarab farqlanadi (brauzer
  // noaniqligi haqidagi ogohlantirish faqat geolokatsiyaga tegishli,
  // xaritada QO'LDA aniq bosilgan nuqtaga taalluqli emas).
  const [pendingLocationSource, setPendingLocationSource] = useState(null);
  const pendingMarkerRef = useRef(null);
  // Korxona markazi uchun DOIMIY belgi - jonli tekshiruvda aniqlangan xato:
  // saqlash (PUT) har safar server tomonida MUVAFFAQIYATLI bo'lsa ham
  // (loglarda tasdiqlangan), xaritada saqlagandan keyin HECH QANDAY doimiy
  // iz qolmasdi - faqat bir lahzalik "uchib borish" animatsiyasi va tez
  // yo'qoladigan toast bor edi. Shu sabab foydalanuvchi "qabul qilinmadi"
  // deb bir necha marta qayta urinib ko'rgan (barcha urinishlar aslida
  // muvaffaqiyatli bo'lgan). Endi korxona markazi doim ko'rinadigan alohida
  // belgi bilan xaritada qoladi.
  const companyMarkerRef = useRef(null);
  const centeredOnceRef = useRef(false);
  // Korxona markazi hali belgilanmagan bo'lsa, xarita doim Toshkentda
  // qolib ketmasligi uchun - haydovchilarning HAQIQIY joylashuvi
  // yuklangan zahoti shu nuqtalarga bir marta avtomatik markazlanadi
  // (pastdagi Hook 1e'ga q.).
  const driversAutoCenteredRef = useRef(false);

  // Masofa o'lchash - xaritada ketma-ket bosilgan nuqtalar orasidagi masofani
  // ko'rsatadi. MUHIM: foydalanuvchi ANIQ so'ragani uchun - to'g'ri chiziq
  // (geodezik/"qush uchishi") EMAS, balki KO'CHA BO'YLAB haqiqiy yo'l
  // masofasi. Shu sabab OSRM (OpenStreetMap yo'l ma'lumotlari asosidagi
  // ochiq marshrutlash xizmati) orqali haqiqiy yo'l geometriyasi va masofasi
  // so'raladi - oddiy Leaflet distanceTo() bunga yetarli emas edi.
  const [measuring, setMeasuring] = useState(false);
  const [measurePoints, setMeasurePoints] = useState([]);
  const [measureResult, setMeasureResult] = useState(null); // { distanceM, durationS }
  const [measureLoading, setMeasureLoading] = useState(false);
  const measureGroupRef = useRef(null);

  // Joy qidirish - istalgan nom (mahalla, ko'cha, muassasa) bo'yicha
  // Nominatim (OSM'ning ochiq geokodlash xizmati) orqali izlab, xaritani
  // o'sha yerga olib boradi. Haydovchi qidirishdan (chap paneldagi) ALOHIDA -
  // bu xaritaning O'ZIDA istalgan joyni topish uchun.
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState([]);
  const [placeSearching, setPlaceSearching] = useState(false);
  const [placeResultsOpen, setPlaceResultsOpen] = useState(false);
  const placeMarkerRef = useRef(null);
  const placeSearchTimerRef = useRef(null);
  const isMountedRef = useRef(true);

  const searchPlace = (query) => {
    if (placeSearchTimerRef.current) clearTimeout(placeSearchTimerRef.current);
    if (!query || query.trim().length < 3) {
      setPlaceResults([]);
      setPlaceSearching(false);
      return;
    }
    setPlaceSearching(true);
    // MUHIM: Nominatim foydalanish siyosati OG'IR/tez-tez so'rovlarni
    // taqiqlaydi - shu sabab har harf kiritilganda EMAS, foydalanuvchi
    // yozishni 500ms to'xtatgandagina so'rov yuboriladi (debounce).
    placeSearchTimerRef.current = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&countrycodes=uz&accept-language=uz`;
        const res = await fetch(url);
        const data = await res.json();
        // Komponent shu orada UNMOUNT bo'lgan bo'lishi mumkin (sahifadan
        // chiqib ketish) - shunday holatda state yangilash React ogohlantirish
        // (warning) chiqaradi, foydali emas.
        if (!isMountedRef.current) return;
        setPlaceResults(Array.isArray(data) ? data : []);
        setPlaceResultsOpen(true);
      } catch {
        if (isMountedRef.current) setPlaceResults([]);
      } finally {
        if (isMountedRef.current) setPlaceSearching(false);
      }
    }, 500);
  };

  const goToPlace = (place) => {
    const lat = parseFloat(place.lat);
    const lon = parseFloat(place.lon);
    setPlaceResultsOpen(false);
    setPlaceQuery(place.display_name);
    if (!mapRef.current) return;
    mapRef.current.invalidateSize();
    mapRef.current.flyTo([lat, lon], 17, { animate: true, duration: 1.2 });
    if (placeMarkerRef.current) mapRef.current.removeLayer(placeMarkerRef.current);
    placeMarkerRef.current = L.marker([lat, lon], {
      icon: L.divIcon({
        className: 'place-search-marker-icon',
        html: `<div class="relative flex items-center justify-center">
                 <div class="absolute w-9 h-9 rounded-full bg-rose-500/30 animate-ping"></div>
                 <div class="w-7 h-7 rounded-full bg-rose-500 border-2 border-white shadow-xl"></div>
               </div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }),
    }).addTo(mapRef.current).bindPopup(place.display_name).openPopup();
  };

  const loadCompanyCenter = async () => {
    try {
      const loc = await api.getCompanyLocation({ silent403: true });
      if (loc && loc.latitude != null && loc.longitude != null) {
        setCompanyCenter([loc.latitude, loc.longitude]);
      }
      // MUHIM (jonli holatda topilgan xato, tuzatildi): avval markaz hali
      // belgilanmagan bo'lsa, sahifa ochilishi bilan O'ZI, SO'ROVSIZ brauzer
      // geolokatsiyasini chaqirib, natijani DARHOL saqlardi. Kompyuterda GPS
      // chipi yo'q - brauzer WiFi/IP orqali TAXMINIY joylashuv beradi, bu
      // butunlay boshqa shaharga (masalan Samarqandga) chiqishi mumkin -
      // aynan shunday bo'lgan va butun kompaniya uchun umumiy markaz xato
      // saqlanib qolgan edi. Endi markazlash FAQAT foydalanuvchi ANIQ
      // "Joriy joylashuvim" yoki "Markazni belgilash" tugmasini bosganda
      // sodir bo'ladi - avtomatik/so'rovsiz emas.
    } catch {
      // Ruxsat yo'q - jimgina Toshkent zaxirasida qolamiz.
    }
  };

  // MUHIM (jonli sinovda topilgan xato, tuzatildi): avval bu funksiya
  // state'ni yangilardi-yu, harakatlanish (flyTo/setView) esa alohida,
  // await'siz joyda (useMyLocationAsCenter) DARHOL chaqirilardi - shu bilan
  // bir vaqtda Hook 1b (companyCenter o'zgarganda ishga tushadigan) HAM
  // setView chaqirardi. Ikkita raqobatlashuvchi Leaflet view-almashtirish
  // amali (biri animatsiyali flyTo, biri darhol setView) bir-birini
  // to'xtatib, plitka qatlamini "oq" holatda qoldirib ketishi mumkin edi.
  // Endi markazlashning YAGONA joyi shu yerda - Hook 1b faqat SERVERDAN
  // birinchi yuklanishda (foydalanuvchi harakatisiz) ishlaydi.
  const saveCompanyCenter = async (lat, lng) => {
    setSavingCenter(true);
    try {
      await api.updateCompanyLocation(lat, lng);
      setCompanyCenter([lat, lng]);
      centeredOnceRef.current = true;
      if (mapRef.current) {
        // Konteyner o'lchami oxirgi renderdan beri o'zgargan bo'lishi mumkin
        // (masalan yangi tugma qo'shilib joylashuv biroz siljigan bo'lsa) -
        // Leaflet buni bilmaydi va eski o'lchov bilan plitka so'raydi, natija
        // "oq" ko'rinish. invalidateSize() shuni majburan qayta hisoblaydi.
        mapRef.current.invalidateSize();
        mapRef.current.flyTo([lat, lng], 16, { animate: true, duration: 1.2 });
      }
      showToast("Korxona markazi belgilandi", 'success');
    } catch (err) {
      showToast(err.message || "Markazni saqlashda xatolik yuz berdi");
    } finally {
      setSavingCenter(false);
    }
  };

  // Joriy joylashuvimni markaz qilish - brauzer/kompyuter geolokatsiyasi.
  // Natija DARHOL saqlanmaydi - xaritada ko'rsatiladi va foydalanuvchi
  // tasdiqlashini kutadi (yuqoridagi pendingLocation izohiga qarang).
  const requestBrowserLocation = () => {
    if (!navigator.geolocation) {
      showToast("Brauzeringiz joylashuvni aniqlashni qo'llab-quvvatlamaydi");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setPendingLocation([latitude, longitude]);
        setPendingLocationSource('geolocation');
        if (mapRef.current) {
          mapRef.current.invalidateSize();
          mapRef.current.flyTo([latitude, longitude], 16, { animate: true, duration: 1.2 });
        }
      },
      () => showToast("Joylashuvni aniqlab bo'lmadi - brauzer ruxsatini tekshiring"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Load data from API
  const loadData = async () => {
    try {
      const [driversData, allOrders, statusesData] = await Promise.all([
        api.getDriversGps(),
        api.getOrders(),
        api.getOrderStatuses()
      ]);

      // "Yakunlangan" - ro'yxatdagi eng oxirgi bosqich (sort_order bo'yicha),
      // chunki har bir kompaniya statuslarni o'zi moslashtirib sozlaydi.
      const sortedStatuses = [...statusesData].sort((a, b) => a.sortOrder - b.sortOrder);
      const completedStatusId = sortedStatuses.length > 0 ? sortedStatuses.slice(-1)[0].id : null;

      const driverUsers = driversData.map(d => ({
        id: d.id,
        full_name: d.fullName,
        username: d.username,
        role: d.role,
        phone: d.phone,
        status: d.status,
        // Haqiqiy GPS ma'lumoti bo'lmasa null qoldiramiz - Toshkent markaziga
        // "soxta" joylashtirib, hali hech qachon signal yubormagan haydovchini
        // xaritada "onlayn"dek ko'rsatib yubormaslik uchun.
        lat: d.latitude ?? null,
        lng: d.longitude ?? null,
        lastSeenMs: d.lastLocationAt ? new Date(d.lastLocationAt).getTime() : null
      }));

      const mappedOrders = allOrders.map(o => ({
        id: o.id,
        client_name: o.client ? o.client.fullName : '',
        // MUHIM (tekshiruv chog'ida topilgan xato, tuzatildi): mijoz
        // telefoni, xizmat nomi va manzil UMUMAN uzatilmagan edi - shu
        // sabab pastdagi popup'larda (haydovchi va manzil belgisi) bu
        // maydonlar doim BO'SH (undefined) ko'rinar edi - foydalanuvchi
        // aynan shuni "mijoz ma'lumotlari ko'rinmayapti" deb topdi.
        client_phone: o.client ? o.client.phone : '',
        service_name: o.service ? (o.service.nameUz || o.service.name_uz || '') : '',
        address: o.address || (o.client ? o.client.address : '') || '',
        worker_name: o.worker ? o.worker.fullName : '',
        // MUHIM (jonli xato bo'yicha qo'shildi): "worker_name" haydovchi va
        // sex hodimini bir xil maydonga yozgani sabab popup'da doim
        // "Haydovchi: X" deb ko'rsatilardi - X aslida sex hodimi bo'lsa
        // ham. Endi backend ikkalasini alohida qaytaradi (Order.driver /
        // Order.sexWorker) - shu ikkisi aniq, adashmasdan ko'rsatiladi.
        driver_name: o.driver ? o.driver.fullName : '',
        sex_worker_name: o.sexWorker ? o.sexWorker.fullName : '',
        status_id: o.status ? o.status.id : null,
        status_name: o.status ? o.status.nameUz : '',
        completed: o.status ? o.status.id === completedStatusId : false,
        // MUHIM (tekshiruv chog'ida topilgan xato, tuzatildi): haqiqiy
        // koordinata yo'q bo'lsa avval Toshkentga (41.31, 69.24) qo'yib
        // yuborilardi - buyurtma manzili haydovchidan yuzlab km narida
        // bo'lsa ham. Endi `null` qoldiriladi - getOrderCoords() haydovchi
        // yaqinidagi taxminiy nuqtaga tushiradi (pastga q.), aks holda
        // xaritada mantiqsiz uzun marshrut chizig'i chiqib qolardi.
        latitude: o.latitude ?? null,
        longitude: o.longitude ?? null,
        price: o.price,
        // "Xaritada qaysi buyurtmalar ko'rinsin" filtri uchun (pastga q.).
        createdAt: o.createdAt || o.created_at || null
      }));

      const now = Date.now();
      const enrichedDrivers = driverUsers.map(driver => {
        const activeOrder = mappedOrders.find(o =>
          o.worker_name === driver.full_name && o.status_id !== completedStatusId
        );

        const hasLocation = driver.lat != null && driver.lng != null;
        const isStale = !driver.lastSeenMs || (now - driver.lastSeenMs) > GPS_STALE_MS;

        let status = 'FREE';
        if (driver.status === 'BLOCKED' || !hasLocation || isStale) {
          status = 'OFFLINE';
        } else if (activeOrder) {
          status = 'BUSY';
        }

        return {
          ...driver,
          status,
          hasLocation,
          activeOrder
        };
      });

      setDrivers(enrichedDrivers);
      setOrders(mappedOrders);
    } catch (err) {
      console.error("Failed to load map data:", err);
    }
  };

  // Haydovchi joylashuvini DARHOL (kutishsiz) yangilaydi - WebSocket
  // orqali GPS_UPDATE kelganda chaqiriladi. Status BLOCKED holatini bu
  // yerda qayta tekshira olmaymiz (loadData() dagi xom "status" maydoni
  // enrichedDrivers'da FREE/BUSY/OFFLINE bilan almashtiriladi) - shu
  // sabab faqat "joylashuv yo'q/eskirgan" sababli OFFLINE bo'lgan
  // haydovchini optimistik ravishda jonlantiramiz; keyingi 6s so'rov
  // (loadData) baribir to'liq TO'G'RILAYDI.
  const patchDriverPosition = (driverId, lat, lng, recordedAtMs) => {
    setDrivers(prev => prev.map(d => {
      if (d.id !== driverId) return d;
      const nextStatus = d.status === 'OFFLINE' ? (d.activeOrder ? 'BUSY' : 'FREE') : d.status;
      return { ...d, lat, lng, lastSeenMs: recordedAtMs, hasLocation: true, status: nextStatus };
    }));
  };

  // Real vaqt GPS kanali (/ws/gps) - foydalanuvchi "bir soniya ham farq
  // qilmasin" deb so'ragani uchun. Backend haydovchining yangi nuqtasini
  // saqlagan ZAHOTI shu orqali DARHOL yuboradi - 6 soniyalik polling
  // navbatini kutish shart emas. Polling FALLBACK sifatida saqlanadi
  // (buyurtma/status o'zgarishlari va WebSocket vaqtincha uzilib qolsa).
  // Naqsh useTelephonyControl.js bilan BIR XIL (keepalive + avtomatik
  // qayta ulanish) - u yerda sinovdan o'tgan.
  useEffect(() => {
    const wsRef = { current: null };
    const pingRef = { current: null };
    const reconnectRef = { current: null };
    let stopped = false;

    const connect = () => {
      const token = localStorage.getItem('auth_token');
      if (!token || stopped) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(
        `${protocol}//${window.location.host}/ws/gps?token=${encodeURIComponent(token)}`
      );

      ws.onopen = () => {
        if (pingRef.current) clearInterval(pingRef.current);
        // KEEPALIVE: Cloudflare/nginx bo'sh WebSocket'ni ~100s da uzadi -
        // telefoniya kanali bilan bir xil 40s oraliq.
        pingRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: 'PING' }));
          }
        }, 40000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'GPS_UPDATE' && data.payload) {
            const { driverId, latitude, longitude, recordedAt } = data.payload;
            patchDriverPosition(driverId, latitude, longitude, new Date(recordedAt).getTime());
          }
        } catch (e) {
          console.error('GPS WebSocket message parse error:', e);
        }
      };

      ws.onerror = (e) => console.error('GPS WebSocket error:', e);

      ws.onclose = () => {
        if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }
        if (stopped) return;
        if (reconnectRef.current) clearTimeout(reconnectRef.current);
        reconnectRef.current = setTimeout(connect, 3000);
      };

      wsRef.current = ws;
    };

    connect();

    return () => {
      stopped = true;
      if (reconnectRef.current) { clearTimeout(reconnectRef.current); reconnectRef.current = null; }
      if (pingRef.current) { clearInterval(pingRef.current); pingRef.current = null; }
      if (wsRef.current) {
        wsRef.current.onclose = null; // qayta ulanishni to'xtatamiz
        wsRef.current.close();
      }
    };
  }, [tab]);

  // Xarita uslubi tanlov ro'yxati ochiq bo'lsa, tashqarisiga bosilganda yopiladi.
  useEffect(() => {
    if (!styleMenuOpen) return;
    const closeMenu = () => setStyleMenuOpen(false);
    // Keyingi tsiklda ulanadi - aks holda shu tugmani ochgan bosishning
    // O'ZI darhol qayta yopib qo'yardi (bir xil click hodisasi ichida).
    const timer = setTimeout(() => window.addEventListener('click', closeMenu), 0);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', closeMenu);
    };
  }, [styleMenuOpen]);

  // Joy qidirish natijalari ro'yxati ochiq bo'lsa, tashqarisiga bosilganda yopiladi.
  useEffect(() => {
    if (!placeResultsOpen) return;
    const closeResults = () => setPlaceResultsOpen(false);
    const timer = setTimeout(() => window.addEventListener('click', closeResults), 0);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', closeResults);
    };
  }, [placeResultsOpen]);

  // Buyurtma filtri tanlov ro'yxati ochiq bo'lsa, tashqarisiga bosilganda yopiladi.
  useEffect(() => {
    if (!orderFilterMenuOpen) return;
    const closeMenu = () => setOrderFilterMenuOpen(false);
    const timer = setTimeout(() => window.addEventListener('click', closeMenu), 0);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', closeMenu);
    };
  }, [orderFilterMenuOpen]);

  useEffect(() => {
    loadData();
    loadCompanyCenter();
    // Poll the backend GPS coordinates every 6 seconds - agar shu vaqtda
    // biror haydovchi tanlangan bo'lsa, uning safarlar ro'yxati ham SHU
    // davrda jim yangilanadi (foydalanuvchi so'rovi bo'yicha - faol safar
    // masofasi/vaqti panelda eskirib qolmasligi uchun).
    const dbInterval = setInterval(() => {
      loadData();
      if (selectedDriverIdRef.current) {
        refreshDriverTripsQuiet(selectedDriverIdRef.current);
      }
    }, 6000);

    return () => clearInterval(dbInterval);
  }, [tab]);

  // Filtered drivers based on search input and status tabs
  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = 
      driver.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (driver.phone && driver.phone.includes(search));
    
    const matchesStatus = statusFilter === 'ALL' || driver.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate order coordinates deterministically near the driver's initial coords
  const getOrderCoords = (order, driver) => {
    if (order.latitude && order.longitude) {
      return [order.latitude, order.longitude];
    }
    const seed = order.id.charCodeAt(order.id.length - 1) || 0;
    const latOffset = 0.0035 + (seed % 4) * 0.001;
    const lngOffset = 0.0035 + (seed % 3) * 0.0012;
    return [driver.lat + latOffset, driver.lng + lngOffset];
  };

  // Haydovchini tanlash - xaritada topish (bor bo'lsa) VA safarlar tarixini
  // yuklash. MUHIM: avval joylashuv yo'q (hozir offline) haydovchida hech
  // narsa qilmasdi - lekin safarlar TARIXIY, hozir offline bo'lsa ham
  // ko'rish kerak, shu sabab ikkalasi ENDI bir-biridan mustaqil.
  const handleLocateDriver = (driver) => {
    setSelectedDriverId(driver.id);
    selectedDriverIdRef.current = driver.id;
    loadDriverTrips(driver.id);
    if (mapRef.current && driver.lat && driver.lng) {
      // 17: OSM plitkalarida joy/ko'cha nomlari zoom darajasiga qarab
      // ko'proq chiqadi (bu - plitkalarni o'zi tayyorlaydigan tashqi
      // serverning cheklovi, biz faqat qaysi darajada ochishni tanlay
      // olamiz) - foydalanuvchi ko'proq nom chiqishini so'ragani uchun
      // oshirildi.
      mapRef.current.flyTo([driver.lat, driver.lng], 17, {
        animate: true,
        duration: 1.5
      });
    }
  };

  // Faol safar davomida masofa/vaqt panelda ESKIRIB qolmasligi uchun -
  // xarita 6 soniyada bir marta haydovchi nuqtasini yangilagani kabi,
  // safarlar ro'yxati ham SHU davrda "jim" (yuklanish ko'rsatkichisiz,
  // tanlangan safar/yo'l chizig'ini buzmasdan) yangilanadi.
  const refreshDriverTripsQuiet = async (driverId) => {
    try {
      const trips = await api.getDriverTrips(driverId);
      if (selectedDriverIdRef.current !== driverId) return; // shu orada boshqa haydovchi tanlangan
      setDriverTrips(trips);
    } catch {
      // Fon yangilanishi - xato bo'lsa jim o'tkazib yuboriladi, eski
      // ro'yxat ko'rinishda qoladi (keyingi tsiklda qayta urinib ko'radi).
    }
  };

  const loadDriverTrips = async (driverId) => {
    setTripsLoading(true);
    setDriverTrips([]);
    setSelectedTripId(null);
    if (tripPathGroupRef.current) tripPathGroupRef.current.clearLayers();
    // MUHIM (tekshiruv chog'ida topilgan poyga holati): foydalanuvchi ikkita
    // haydovchini TEZ ketma-ket bossa, ikkita so'rov parallel ketadi -
    // BIRINCHI (eski) so'rov javobi IKKINCHISIDAN keyin qaytishi mumkin va
    // noto'g'ri haydovchining safarlarini ko'rsatib qo'yardi. Faqat ENG
    // OXIRGI so'ralgan driverId hali ham "joriy tanlov" bo'lsagina natija
    // qabul qilinadi.
    latestTripsRequestRef.current = driverId;
    try {
      const trips = await api.getDriverTrips(driverId);
      if (latestTripsRequestRef.current !== driverId) return;
      setDriverTrips(trips);
    } catch {
      // Xato allaqachon global toast orqali ko'rsatiladi (handleResponse).
    } finally {
      if (latestTripsRequestRef.current === driverId) setTripsLoading(false);
    }
  };

  // Tanlangan safarning bosib o'tilgan yo'lini (haqiqiy GPS nuqtalari
  // bo'yicha, ko'cha bo'ylab) xaritada chizadi.
  const viewTripPath = async (trip) => {
    if (!mapRef.current || !tripPathGroupRef.current) return;
    setSelectedTripId(trip.id);
    tripPathGroupRef.current.clearLayers();
    try {
      const points = await api.getTripPath(trip.id);
      if (!points || points.length === 0) return;
      const latlngs = points.map(p => [p.latitude, p.longitude]);
      L.polyline(latlngs, { color: '#8b5cf6', weight: 4, opacity: 0.85 }).addTo(tripPathGroupRef.current);
      L.circleMarker(latlngs[0], {
        radius: 6, color: '#fff', weight: 2, fillColor: '#10b981', fillOpacity: 1,
      }).addTo(tripPathGroupRef.current).bindPopup('Markazdan chiqqan nuqta');
      L.circleMarker(latlngs[latlngs.length - 1], {
        radius: 6, color: '#fff', weight: 2, fillColor: '#ef4444', fillOpacity: 1,
      }).addTo(tripPathGroupRef.current).bindPopup(
        trip.active ? "Oxirgi ma'lum joylashuv (safar hali davom etmoqda)" : 'Markazga qaytgan nuqta'
      );
      mapRef.current.invalidateSize();
      mapRef.current.fitBounds(latlngs, { padding: [60, 60] });
    } catch {
      // Xato allaqachon global toast orqali ko'rsatiladi.
    }
  };

  // Center/Fit all driver markers on map
  const handleFitBounds = () => {
    if (!mapRef.current || drivers.length === 0) return;
    const validCoords = drivers
      .filter(d => d.lat && d.lng)
      .map(d => [d.lat, d.lng]);
    
    if (validCoords.length > 0) {
      mapRef.current.fitBounds(validCoords, { padding: [50, 50] });
    }
  };

  const markerGroupRef = useRef(null);
  const routeGroupRef = useRef(null);
  const routeRenderGenRef = useRef(0);
  // Barcha KUTILAYOTGAN (hali yakunlanmagan) buyurtmalar - foydalanuvchi
  // so'rovi bo'yicha: avval FAQAT band (BUSY) haydovchiga bog'langan
  // buyurtma xaritada ko'rinardi, boshqa barcha mijozlar (hali haydovchi
  // biriktirilmagan yoki haydovchi boshqa sababdan band emas holatidagi)
  // umuman ko'rinmasdi.
  const pendingOrdersGroupRef = useRef(null);

  // Haydovchi - buyurtma manzili orasidagi marshrut - foydalanuvchi ANIQ
  // so'radi: to'g'ri chiziq (geodezik) EMAS, KO'CHA BO'YLAB haqiqiy yo'l
  // (OSRM, "Masofa o'lchash" funksiyasidagi bilan bir xil manba).
  const drawRoadRoute = async (driver, orderCoords, renderGen) => {
    try {
      const coordsParam = `${driver.lng},${driver.lat};${orderCoords[1]},${orderCoords[0]}`;
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordsParam}?overview=full&geometries=geojson`);
      const data = await res.json();
      // Shu orada YANGI polling tsikli (6s) allaqachon routeGroupRef'ni
      // tozalab, YANGI marshrut(lar) chizgan bo'lishi mumkin - eski
      // (kechikkan) javob endi noto'g'ri/eskirgan bo'lsa chizilmaydi.
      if (renderGen !== routeRenderGenRef.current || !routeGroupRef.current) return;
      if (data.code !== 'Ok' || !data.routes?.[0]) return;
      const latlngs = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      L.polyline(latlngs, {
        color: '#f43f5e', // rose-500
        weight: 3,
        opacity: 0.8
      }).addTo(routeGroupRef.current);
    } catch {
      // Marshrut xizmati vaqtincha ishlamasa - belgilar (haydovchi/manzil)
      // baribir ko'rinadi, faqat ulovchi chiziq chizilmay qoladi.
    }
  };
  const tileLayerRef = useRef(null);
  // Sun'iy yo'ldosh uslubidagi ko'cha/joy nomlari qatlami - asosiy plitka
  // qatlamidan ALOHIDA boshqariladi (o'chirilishi/qo'shilishi kerak, faqat
  // "satellite" tanlanganda mavjud bo'ladi).
  const overlayLayerRef = useRef(null);

  // Hook 1: Initialize Leaflet Map instance once on mount
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false
    }).setView(FALLBACK_CENTER, 14);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    mapRef.current = map;

    // Create layer groups for markers and routes
    markerGroupRef.current = L.layerGroup().addTo(map);
    routeGroupRef.current = L.layerGroup().addTo(map);
    pendingOrdersGroupRef.current = L.layerGroup().addTo(map);
    measureGroupRef.current = L.layerGroup().addTo(map);
    tripPathGroupRef.current = L.layerGroup().addTo(map);

    // MUHIM: konteyner flex/grid layout ichida - o'zining "yakuniy" o'lchamiga
    // Leaflet ishga tushgan zumda emas, DOM joylashuvi tugagach yetadi.
    // Buni bilmagan Leaflet ESKI (ko'pincha 0 balandlikdagi) o'lchov bilan
    // plitka so'rovlarini yuboradi - natija "oq" xarita. invalidateSize()
    // keyingi tsiklda haqiqiy o'lchovni qayta o'qib, to'g'irlaydi.
    const resizeTimer = setTimeout(() => map.invalidateSize(), 100);
    const handleWindowResize = () => map.invalidateSize();
    window.addEventListener('resize', handleWindowResize);

    return () => {
      isMountedRef.current = false;
      if (placeSearchTimerRef.current) clearTimeout(placeSearchTimerRef.current);
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleWindowResize);
      map.remove();
      mapRef.current = null;
    };
  }, []); // Run once on mount

  // Hook 1b: korxona markazi (API'dan) birinchi marta yuklanganda xaritani
  // O'SHA nuqtaga ko'chiradi - FAQAT bir marta (centeredOnceRef), aks holda
  // har 6 soniyalik pollingda foydalanuvchi xaritani qo'lda siljitgan bo'lsa
  // ham qayta-qayta markazga qaytarib qo'yardi.
  useEffect(() => {
    if (!companyCenter || centeredOnceRef.current || !mapRef.current) return;
    centeredOnceRef.current = true;
    mapRef.current.setView(companyCenter, 17);
  }, [companyCenter]);

  // Hook 1c: "Xaritada belgilash" rejimi - yoqilgan bo'lsa, bosilgan nuqtani
  // TASDIQLASH kutilayotgan holatga qo'yadi.
  //
  // MUHIM (tekshiruv chog'ida topilgan nomuvofiqlik, tuzatildi): avval bu
  // yerda saveCompanyCenter() TO'G'RIDAN-TO'G'RI, hech qanday tasdiqlashsiz
  // chaqirilardi - bitta adashib bosilgan joy (masalan xaritani surish
  // paytida qo'l tegib ketishi) butun korxona markazini darhol, ORTGA
  // QAYTARIB BO'LMAYDIGAN tarzda xato joyga o'zgartirib qo'yardi. "Joriy
  // joylashuvim" (brauzer geolokatsiyasi) yo'li esa ANIQ shu sabab bilan
  // (noaniqlik xavfi) tasdiqlash bosqichidan o'tkazilgan edi - ikkala yo'l
  // ham xuddi shunday xavfli, shuning uchun endi ikkalasi ham BIR XIL
  // pendingLocation tasdiqlash mexanizmidan o'tadi.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !pickingCenter) return;
    const handleClick = (e) => {
      setPendingLocation([e.latlng.lat, e.latlng.lng]);
      setPendingLocationSource('manual');
      setPickingCenter(false);
    };
    map.on('click', handleClick);
    const prevCursor = map.getContainer().style.cursor;
    map.getContainer().style.cursor = 'crosshair';
    return () => {
      map.off('click', handleClick);
      map.getContainer().style.cursor = prevCursor;
    };
  }, [pickingCenter]);

  // Hook 1d: brauzer geolokatsiyasi topgan "tasdiqlanmagan" nuqtani xaritada
  // ko'rinadigan (sariq, taxminiy) belgi bilan ko'rsatadi - foydalanuvchi
  // buni ko'rib, to'g'ri/noto'g'riligini o'zi baholaydi.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (pendingMarkerRef.current) {
      map.removeLayer(pendingMarkerRef.current);
      pendingMarkerRef.current = null;
    }
    if (!pendingLocation) return;
    pendingMarkerRef.current = L.marker(pendingLocation, {
      icon: L.divIcon({
        className: 'pending-center-marker-icon',
        html: `<div class="flex items-center justify-center">
                 <div class="absolute w-9 h-9 rounded-full bg-amber-500/30 animate-ping"></div>
                 <div class="w-6 h-6 rounded-full bg-amber-500 border-2 border-white shadow-xl"></div>
               </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      })
    }).addTo(map);
  }, [pendingLocation]);

  // Hook 1d-2: korxona markazi DOIMIY belgisi - companyCenter o'zgargan
  // sayin (birinchi yuklanganda va har safar qayta saqlanganda) xaritada
  // doim ko'rinadigan alohida (binafsha) belgi qoladi. Buning yo'qligi
  // "joylashuv qabul qilinmadi" degan noto'g'ri taassurotga sabab bo'lgan
  // edi - saqlash aslida har safar muvaffaqiyatli edi.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (companyMarkerRef.current) {
      map.removeLayer(companyMarkerRef.current);
      companyMarkerRef.current = null;
    }
    if (!companyCenter) return;
    companyMarkerRef.current = L.marker(companyCenter, {
      icon: L.divIcon({
        className: 'company-center-marker-icon',
        html: `<div class="relative flex items-center justify-center">
                 <div class="w-9 h-9 rounded-full bg-violet-600 border-[3px] border-white shadow-2xl flex items-center justify-center text-white text-base leading-none">★</div>
               </div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      }),
      zIndexOffset: 1000
    }).addTo(map).bindPopup(`
      <div style="color: #1e293b; font-family: 'Outfit', sans-serif; padding: 4px; font-size: 11px;">
        <strong style="color: #7c3aed;">Korxona markazi</strong>
      </div>
    `);
  }, [companyCenter]);

  // Hook 1e: korxona markazi HALI belgilanmagan bo'lsa (companyCenter=null),
  // xarita doim qattiq yozilgan Toshkent nuqtasida qolib ketmasligi uchun -
  // haydovchilarning HAQIQIY GPS joylashuvi birinchi marta yuklanganda shu
  // nuqta(lar)ga avtomatik markazlanadi/sig'diriladi. FAQAT bir marta
  // (driversAutoCenteredRef) - aks holda har 6s pollingda foydalanuvchi
  // qo'lda siljitgan xaritani qayta-qayta qaytarib qo'yardi. Korxona markazi
  // keyinroq yuklansa (Hook 1b), u ustunlik qiladi.
  useEffect(() => {
    if (companyCenter || driversAutoCenteredRef.current || !mapRef.current) return;
    const withLocation = drivers.filter(d => d.lat != null && d.lng != null);
    if (withLocation.length === 0) return;
    driversAutoCenteredRef.current = true;
    if (withLocation.length === 1) {
      mapRef.current.setView([withLocation[0].lat, withLocation[0].lng], 17);
    } else {
      mapRef.current.fitBounds(withLocation.map(d => [d.lat, d.lng]), { padding: [60, 60] });
    }
  }, [drivers, companyCenter]);

  // Hook 1f: "Masofa o'lchash" rejimi yoqilganda - har bir xarita bosilishi
  // yangi nuqta qo'shadi (ketma-ket, istalgancha nuqta).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !measuring) return;
    const handleClick = (e) => {
      setMeasurePoints(prev => [...prev, [e.latlng.lat, e.latlng.lng]]);
    };
    map.on('click', handleClick);
    const prevCursor = map.getContainer().style.cursor;
    map.getContainer().style.cursor = 'crosshair';
    return () => {
      map.off('click', handleClick);
      map.getContainer().style.cursor = prevCursor;
    };
  }, [measuring]);

  // Hook 1g: nuqtalar belgilarini chizadi va (2+ nuqta bo'lsa) OSRM'dan
  // KO'CHA BO'YLAB haqiqiy yo'l geometriyasi + masofasini so'raydi - to'g'ri
  // chiziq masofasi EMAS (foydalanuvchi aniq shuni so'radi).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !measureGroupRef.current) return;
    measureGroupRef.current.clearLayers();

    if (measurePoints.length === 0) {
      setMeasureResult(null);
      return;
    }

    // Har bir bosilgan nuqta - raqamlangan belgi.
    measurePoints.forEach((pt, idx) => {
      L.marker(pt, {
        icon: L.divIcon({
          className: 'measure-point-icon',
          html: `<div style="width:20px;height:20px;border-radius:50%;background:#f59e0b;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;color:white;font-size:10px;font-weight:800;font-family:sans-serif;">${idx + 1}</div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        }),
      }).addTo(measureGroupRef.current);
    });

    if (measurePoints.length < 2) {
      setMeasureResult(null);
      return;
    }

    let cancelled = false;
    setMeasureLoading(true);
    const coordsParam = measurePoints.map(([lat, lng]) => `${lng},${lat}`).join(';');

    fetch(`https://router.project-osrm.org/route/v1/driving/${coordsParam}?overview=full&geometries=geojson`)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        if (data.code !== 'Ok' || !data.routes?.[0]) {
          showToast("Bu nuqtalar orasida yo'l topilmadi");
          setMeasureResult(null);
          return;
        }
        const route = data.routes[0];
        // GeoJSON [lng, lat] tartibida qaytaradi - Leaflet [lat, lng] kutadi.
        const latlngs = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        L.polyline(latlngs, { color: '#f59e0b', weight: 4, opacity: 0.85 }).addTo(measureGroupRef.current);
        setMeasureResult({ distanceM: route.distance, durationS: route.duration });
      })
      .catch(() => {
        if (!cancelled) {
          showToast("Masofani hisoblab bo'lmadi - tarmoqni tekshiring");
          setMeasureResult(null);
        }
      })
      .finally(() => {
        if (!cancelled) setMeasureLoading(false);
      });

    return () => { cancelled = true; };
  }, [measurePoints]);

  const clearMeasurement = () => {
    setMeasuring(false);
    setMeasurePoints([]);
    setMeasureResult(null);
  };

  // Hook 2: Update tile layer style when mapStyle changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    if (overlayLayerRef.current) {
      map.removeLayer(overlayLayerRef.current);
      overlayLayerRef.current = null;
    }

    const style = MAP_STYLES[mapStyle] || MAP_STYLES.streets;
    tileLayerRef.current = L.tileLayer(style.url, style.options).addTo(map);

    // Ko'cha/joy nomlari qatlami - faqat shu uslub (masalan "satellite")
    // buni belgilagan bo'lsa qo'shiladi, asosiy qatlam USTIGA chiziladi.
    if (style.overlay) {
      overlayLayerRef.current = L.tileLayer(style.overlay.url, style.overlay.options).addTo(map);
    }
  }, [mapStyle]);

  // Hook 3: Draw markers and route polylines when drivers list updates
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !markerGroupRef.current || !routeGroupRef.current) return;

    // Har bir chaqiruv (6s pollingda) o'z "avlodi" - marshrut OSRM'dan
    // ASINXRON qaytadi, shu orada YANGI polling tsikli allaqachon
    // routeGroupRef'ni tozalab yuborgan bo'lishi mumkin. Shu holatda ESKI
    // (kechikkan) marshrut javobi endi YO'Q bo'lgan guruhga chizilib
    // qolmasligi uchun har bir chizish shu "avlod" hali joriy ekanini
    // tekshiradi.
    routeRenderGenRef.current += 1;
    const renderGen = routeRenderGenRef.current;

    // Clear existing layers
    markerGroupRef.current.clearLayers();
    routeGroupRef.current.clearLayers();

    // Render Driver markers and order destination routes
    drivers.forEach(driver => {
      if (!driver.lat || !driver.lng) return;

      const initials = driver.full_name
        ? driver.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        : '?';

      const colorClass = driver.status === 'FREE' 
        ? 'bg-emerald-500' 
        : driver.status === 'BUSY'
        ? 'bg-indigo-500'
        : 'bg-slate-400';

      const pulseClass = driver.status === 'FREE'
        ? 'bg-emerald-500/30'
        : driver.status === 'BUSY'
        ? 'bg-indigo-500/30'
        : 'bg-slate-400/20';

      // Custom marker icon showing driver initials and pulse aura
      const driverIcon = L.divIcon({
        className: 'custom-driver-marker-icon',
        html: `<div class="relative flex items-center justify-center cursor-pointer">
                 <div class="absolute w-8 h-8 rounded-full ${pulseClass} ${driver.status !== 'OFFLINE' ? 'animate-ping' : ''}"></div>
                 <div class="w-7 h-7 rounded-full ${colorClass} border-2 border-white dark:border-slate-800 shadow-xl flex items-center justify-center text-[9px] font-bold text-white font-sans">
                   ${initials}
                 </div>
               </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const driverMarker = L.marker([driver.lat, driver.lng], { icon: driverIcon })
        .addTo(markerGroupRef.current);

      // Bind custom popup
      driverMarker.bindPopup(`
        <div style="color: #1e293b; font-family: 'Outfit', sans-serif; padding: 6px; font-size: 11px; width: 180px;">
          <h4 style="margin: 0 0 3px; font-weight: 800; font-size: 12px; color: #1e1b4b;">${driver.full_name}</h4>
          <p style="margin: 0; color: #64748b; font-weight: 550;">Tel: ${driver.phone || '—'}</p>
          <div style="margin-top: 6px; display: flex; align-items: center; gap: 4px;">
            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background-color: ${
              driver.status === 'FREE' ? '#10b981' : driver.status === 'BUSY' ? '#6366f1' : '#94a3b8'
            }"></span>
            <span style="font-weight: 700; text-transform: uppercase; font-size: 9px; color: ${
              driver.status === 'FREE' ? '#059669' : driver.status === 'BUSY' ? '#4f46e5' : '#64748b'
            };">
              ${driver.status === 'FREE' ? 'Online / Bo\'sh' : driver.status === 'BUSY' ? 'Buyurtmada' : 'Offline'}
            </span>
          </div>
          <div style="margin-top: 4px; color: #94a3b8; font-size: 9px;">So'nggi signal: ${formatLastSeen(driver.lastSeenMs)}</div>
          ${driver.activeOrder ? `
            <div style="margin-top: 8px; border-top: 1px dashed #e2e8f0; padding-top: 6px; font-size: 10px;">
              <span style="font-weight: bold; color: #4f46e5; display: block; font-size: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Faol Buyurtma:</span>
              <span style="color: #334155; font-weight: 600; display: block; margin-top: 1px;">${driver.activeOrder.service_name || 'Xizmat'}</span>
              <span style="color: #64748b; font-size: 9px; display: block; margin-top: 1px;">Mijoz: ${driver.activeOrder.client_name || '—'}</span>
              ${driver.activeOrder.client_phone ? `<span style="color: #64748b; font-size: 9px; display: block; margin-top: 1px;">Tel: ${driver.activeOrder.client_phone}</span>` : ''}
              <span style="color: #64748b; font-size: 9px; display: block; margin-top: 1px;">Manzil: ${driver.activeOrder.address || '—'}</span>
            </div>
          ` : ''}
        </div>
      `);

      // If driver is busy on an order, show route and destination on the map
      if (driver.status === 'BUSY' && driver.activeOrder) {
        const orderCoords = getOrderCoords(driver.activeOrder, driver);
        
        // Order Destination Icon
        const orderIcon = L.divIcon({
          className: 'custom-order-destination-icon',
          html: `<div class="flex items-center justify-center cursor-pointer">
                   <div class="w-5 h-5 rounded-full bg-rose-500/20 border border-rose-500 flex items-center justify-center">
                     <div class="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                   </div>
                 </div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        // Add order marker - to'liq mijoz ma'lumoti bilan (ism, telefon,
        // xizmat, manzil) - avval faqat manzil ko'rsatilardi, qolganlari
        // mappedOrders'da UMUMAN uzatilmagani uchun bo'sh chiqardi.
        L.marker(orderCoords, { icon: orderIcon })
          .addTo(routeGroupRef.current)
          .bindPopup(`
            <div style="font-family: sans-serif; font-size: 11px; padding: 4px; width: 170px;">
              <strong style="color: #e11d48; display: block;">${driver.activeOrder.client_name || 'Mijoz'}</strong>
              ${driver.activeOrder.client_phone ? `<p style="margin: 2px 0 0; color: #475569;">Tel: ${driver.activeOrder.client_phone}</p>` : ''}
              <p style="margin: 4px 0 0; color: #334155; font-weight: 600;">${driver.activeOrder.service_name || 'Xizmat'}</p>
              <p style="margin: 3px 0 0; color: #475569;">${driver.activeOrder.address || '—'}</p>
            </div>
          `);

        // Transit yo'nalishi - foydalanuvchi so'rovi bo'yicha to'g'ri
        // chiziq (geodezik) O'RNIGA ko'cha bo'ylab haqiqiy yo'l (OSRM).
        drawRoadRoute(driver, orderCoords, renderGen);
      }
    });
  }, [drivers]);

  // Hook 4: kutilayotgan (hali yakunlanmagan) buyurtmalarni belgi sifatida
  // chizadi - QAYSI buyurtmalar ko'rinishini foydalanuvchi TOOLBAR'dagi
  // tanlov orqali o'zi belgilaydi (orderFilterMode - "bazadagi hamma
  // mijoz emas, faqat kerakli qism" degan so'rov bo'yicha funksiya
  // qilib qo'shildi). Band (BUSY) haydovchiga bog'langan buyurtma Hook
  // 3'da ALLAQACHON o'z belgisi va yo'l chizig'i bilan ko'rsatilgan - shu
  // yerda TAKRORLANMASLIGI uchun chiqarib tashlanadi.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !pendingOrdersGroupRef.current) return;
    pendingOrdersGroupRef.current.clearLayers();

    const activeOrderIds = new Set(
      drivers
        .filter(d => d.status === 'BUSY' && d.activeOrder)
        .map(d => d.activeOrder.id)
    );

    const filterFn = (ORDER_FILTERS[orderFilterMode] || ORDER_FILTERS.active).test;

    orders.forEach(order => {
      if (order.completed) return;
      if (activeOrderIds.has(order.id)) return;
      if (!filterFn(order)) return;
      // Haqiqiy koordinatasi yo'q buyurtma bu yerda o'ylab topilmaydi
      // (soxta/noaniq nuqta ko'rsatishning oldini olish uchun - avvalgi
      // "doim Toshkent" xatosi bilan bir xil sabab).
      if (order.latitude == null || order.longitude == null) return;

      const assigned = !!order.worker_name;
      const icon = L.divIcon({
        className: 'pending-order-marker-icon',
        html: `<div class="flex items-center justify-center cursor-pointer">
                 <div class="w-5 h-5 rounded-full ${assigned ? 'bg-amber-500/20 border-amber-500' : 'bg-slate-400/20 border-slate-400'} border flex items-center justify-center">
                   <div class="w-1.5 h-1.5 rounded-full ${assigned ? 'bg-amber-500' : 'bg-slate-400'}"></div>
                 </div>
               </div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      L.marker([order.latitude, order.longitude], { icon })
        .addTo(pendingOrdersGroupRef.current)
        .bindPopup(`
          <div style="font-family: sans-serif; font-size: 11px; padding: 4px; width: 170px;">
            <strong style="color: ${assigned ? '#b45309' : '#475569'}; display: block;">${order.client_name || 'Mijoz'}</strong>
            ${order.client_phone ? `<p style="margin: 2px 0 0; color: #475569;">Tel: ${order.client_phone}</p>` : ''}
            <p style="margin: 4px 0 0; color: #334155; font-weight: 600;">${order.service_name || 'Xizmat'}</p>
            <p style="margin: 3px 0 0; color: #475569;">${order.address || '—'}</p>
            <div style="margin-top: 5px; padding-top: 5px; border-top: 1px dashed #e2e8f0; font-size: 9px; color: #94a3b8;">
              ${order.status_name ? `Holat: ${order.status_name}<br/>` : ''}
              ${order.driver_name ? `Haydovchi: ${order.driver_name}<br/>` : ''}
              ${order.sex_worker_name ? `Sex hodimi: ${order.sex_worker_name}<br/>` : ''}
              ${!order.driver_name && !order.sex_worker_name ? 'Hali biriktirilmagan' : ''}
            </div>
          </div>
        `);
    });
  }, [orders, drivers, orderFilterMode]);

  return (
    <div className="space-y-6 h-[calc(100vh-130px)] flex flex-col animate-fade-in text-xs font-semibold">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-white/5 pb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight font-['Outfit']">Xodimlar Monitoringi</h2>
          <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">Haydovchi va kuryerlar joylashuvini real vaqtda OpenStreetMap orqali boshqarish</p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/10 transition cursor-pointer font-bold shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Yangilash</span>
          </button>
          
          <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-bold bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/10 px-3.5 py-2 rounded-xl flex items-center gap-2 uppercase tracking-wider shadow-sm">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            Real-Time Engine
          </span>
        </div>
      </div>

      {/* Main Console Split-Screen Grid */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6 items-stretch">
        
        {/* Left Side: Drivers Control Panel */}
        <div className="w-full lg:w-80 shrink-0 glass-card p-4 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-[#111827]/80 shadow-sm flex flex-col gap-4">
          
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 dark:text-gray-500" />
            <input 
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ism yoki telefon..."
              className="w-full glass-input rounded-xl pl-9 pr-4 py-2 text-slate-800 dark:text-white focus:outline-none"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
            {['ALL', 'FREE', 'BUSY', 'OFFLINE'].map(tabKey => (
              <button
                key={tabKey}
                onClick={() => setStatusFilter(tabKey)}
                className={`flex-1 text-[10px] py-1.5 rounded-lg cursor-pointer transition font-bold ${
                  statusFilter === tabKey
                    ? 'bg-white dark:bg-[#1f2937] text-slate-800 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-white'
                }`}
              >
                {tabKey === 'ALL' ? 'Barchasi' : tabKey === 'FREE' ? 'Bo\'sh' : tabKey === 'BUSY' ? 'Band' : 'Offline'}
              </button>
            ))}
          </div>

          {/* Drivers List container */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin max-h-[360px] lg:max-h-none">
            {filteredDrivers.length === 0 ? (
              <div className="text-center py-8 text-slate-400 dark:text-gray-500 font-medium">
                Xodimlar topilmadi
              </div>
            ) : (
              filteredDrivers.map(driver => {
                const isSelected = selectedDriverId === driver.id;
                return (
                  <div
                    key={driver.id}
                    onClick={() => handleLocateDriver(driver)}
                    className={`p-3 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-500/5 border-indigo-500/30'
                        : 'border-slate-150 dark:border-white/5 bg-slate-50/30 dark:bg-white/2 hover:bg-slate-100 dark:hover:bg-white/5'
                    }`}
                  >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      {/* Driver Name & status badge */}
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 dark:text-white leading-tight">
                          {driver.full_name}
                        </span>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          driver.status === 'FREE' ? 'bg-emerald-500' : driver.status === 'BUSY' ? 'bg-indigo-500' : 'bg-slate-400'
                        }`}></span>
                      </div>

                      {/* Phone */}
                      <div className="text-[10px] text-slate-400 dark:text-gray-500 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{driver.phone || '—'}</span>
                      </div>

                      {/* Last GPS signal - especially useful when OFFLINE */}
                      {driver.status === 'OFFLINE' && (
                        <div className="text-[9px] text-rose-400 dark:text-rose-400/80 font-medium">
                          So'nggi signal: {formatLastSeen(driver.lastSeenMs)}
                        </div>
                      )}

                      {/* Order info details */}
                      {driver.activeOrder && (
                        <div className="mt-2 text-[9px] bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/10 rounded-lg p-1.5 space-y-0.5">
                          <span className="text-indigo-600 dark:text-indigo-400 font-bold block uppercase tracking-wide text-[8px]">
                            Yetkazib berilmoqda:
                          </span>
                          <span className="text-slate-700 dark:text-gray-300 font-semibold block">
                            {driver.activeOrder.service_name}
                          </span>
                          <span className="text-slate-400 dark:text-gray-500 block truncate max-w-[220px]">
                            {driver.activeOrder.address}
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={(e) => { e.stopPropagation(); handleLocateDriver(driver); }}
                      className="p-2 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-650 dark:text-gray-300 transition cursor-pointer"
                      title="Xaritada topish"
                    >
                      <Navigation className="w-3.5 h-3.5 rotate-45" />
                    </button>
                  </div>

                  {/* Safarlar tarixi - haydovchi korxona markazidan (150m)
                      chiqib, qaytib kelgungacha bo'lgan HAR BIR safar
                      ALOHIDA qatorda - foydalanuvchi so'rovi bo'yicha
                      birlashtirilmagan. Faqat TANLANGAN haydovchida ochiladi. */}
                  {isSelected && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10"
                    >
                      <div className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-gray-500 mb-1.5">
                        Safarlar tarixi (markazdan chiqib-kirish)
                      </div>
                      {tripsLoading ? (
                        <div className="text-[10px] text-slate-400 dark:text-gray-500">Yuklanmoqda...</div>
                      ) : driverTrips.length === 0 ? (
                        <div className="text-[10px] text-slate-400 dark:text-gray-500">Hali safar qayd etilmagan</div>
                      ) : (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {driverTrips.map(trip => (
                            <button
                              key={trip.id}
                              onClick={() => viewTripPath(trip)}
                              className={`w-full text-left px-2 py-1.5 rounded-lg border transition cursor-pointer ${
                                selectedTripId === trip.id
                                  ? 'bg-violet-500/10 border-violet-500/40'
                                  : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/10'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-bold text-slate-700 dark:text-gray-200">
                                  {formatTripTime(trip.startedAt)}
                                  {trip.active && (
                                    <span className="ml-1.5 text-emerald-500">● davom etmoqda</span>
                                  )}
                                </span>
                                <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 shrink-0">
                                  {formatDistance(trip.distanceMeters)}
                                </span>
                              </div>
                              <div className="text-[9px] text-slate-400 dark:text-gray-500 mt-0.5">
                                {formatDuration(trip.durationSeconds)}
                                {trip.endedAt && ` • ${formatTripTime(trip.endedAt)}gacha`}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Toolbar (xarita USTIDA emas, uning TEPASIDA, bitta
            qatorda yonma-yon) + Map Viewport */}
        <div className="flex-1 flex flex-col gap-3 min-h-[480px]">

          {/* Joy qidirish - istalgan nom (mahalla, ko'cha, muassasa) bo'yicha
              xaritadan izlash - foydalanuvchi ANIQ so'ragan "har qanday joy
              nomi ko'rinishi/topilishi" imkoniyati. */}
          <div className="relative">
            <div className="flex items-center gap-2 bg-white dark:bg-[#111827]/85 border border-slate-200 dark:border-white/5 rounded-2xl px-3 py-2 shadow-sm">
              <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
              <input
                type="text"
                value={placeQuery}
                onChange={(e) => { setPlaceQuery(e.target.value); searchPlace(e.target.value); }}
                onFocus={() => { if (placeResults.length > 0) setPlaceResultsOpen(true); }}
                placeholder="Xaritadan joy qidirish (mahalla, ko'cha, muassasa)..."
                className="flex-1 bg-transparent text-slate-800 dark:text-white text-[11px] focus:outline-none placeholder:text-slate-400 dark:placeholder:text-gray-500"
              />
              {placeSearching && (
                <span className="text-[9px] text-slate-400 shrink-0">Qidirilmoqda...</span>
              )}
              {placeQuery && (
                <button
                  onClick={() => { setPlaceQuery(''); setPlaceResults([]); setPlaceResultsOpen(false); }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {placeResultsOpen && placeResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl shadow-2xl overflow-hidden z-30 max-h-64 overflow-y-auto">
                {placeResults.map((place) => (
                  <button
                    key={place.place_id}
                    onClick={() => goToPlace(place)}
                    className="w-full text-left px-3 py-2 text-[11px] font-semibold text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer border-b border-slate-100 dark:border-white/5 last:border-0 flex items-start gap-2"
                  >
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                    <span>{place.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Xarita boshqaruv paneli - avval xaritaning O'ZI ustiga suzib
              turuvchi (floating) tugmalar edi, ular xaritani to'sib turardi.
              Endi xaritadan TASHQARIDA, tepasida, bitta qatorda yonma-yon
              joylashadi. Ikki guruh ("Ko'rinish" / "Korxona markazi")
              orasiga ajratuvchi chiziq qo'yilgan. */}
          <div className="flex flex-wrap items-center gap-1.5 bg-white dark:bg-[#111827]/85 border border-slate-200 dark:border-white/5 rounded-2xl px-2 py-2 shadow-sm">

            {/* Xarita uslubi - ANIQ nomlangan tanlov menyusi */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setStyleMenuOpen(prev => !prev); }}
                className="px-3 py-2 rounded-xl text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer flex items-center gap-1.5 font-bold"
                title="Xarita uslubini tanlash"
              >
                <Layers className="w-4 h-4 text-indigo-500 shrink-0" />
                <span className="text-[10px]">{MAP_STYLES[mapStyle]?.label}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${styleMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {styleMenuOpen && (
                <div className="absolute top-full left-0 mt-1 w-44 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl shadow-2xl overflow-hidden z-30">
                  {Object.entries(MAP_STYLES).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => { setMapStyle(key); setStyleMenuOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-[11px] font-semibold transition cursor-pointer ${
                        mapStyle === key
                          ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                          : 'text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/10'
                      }`}
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fit Zoom Button */}
            <button
              onClick={handleFitBounds}
              className="px-3 py-2 rounded-xl text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer flex items-center gap-1.5 font-bold"
              title="Barcha xodimlarni sig'dirish"
            >
              <Compass className="w-4 h-4 text-indigo-500" />
              <span className="text-[10px]">Hammani markazlash</span>
            </button>

            {/* Xaritada qaysi buyurtmalar (mijozlar) ko'rinishi - foydalanuvchi
                o'zi tanlaydigan funksiya (avval qattiq yozilgan qoida edi). */}
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setOrderFilterMenuOpen(prev => !prev); }}
                className="px-3 py-2 rounded-xl text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer flex items-center gap-1.5 font-bold"
                title="Xaritada qaysi buyurtmalar ko'rinishini tanlash"
              >
                <Package className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-[10px]">{ORDER_FILTERS[orderFilterMode]?.label}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${orderFilterMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {orderFilterMenuOpen && (
                <div className="absolute top-full left-0 mt-1 w-52 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-[#334155] rounded-xl shadow-2xl overflow-hidden z-30">
                  {Object.entries(ORDER_FILTERS).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => { setOrderFilterMode(key); setOrderFilterMenuOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-[11px] font-semibold transition cursor-pointer ${
                        orderFilterMode === key
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/10'
                      }`}
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="w-px h-6 bg-slate-200 dark:bg-white/10 mx-1 shrink-0" />

            {/* Korxona markazini kompyuter/brauzer joylashuvidan belgilash */}
            <button
              onClick={() => requestBrowserLocation()}
              disabled={savingCenter}
              className="px-3 py-2 rounded-xl text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer flex items-center gap-1.5 font-bold disabled:opacity-50"
              title="Joriy joylashuvimni korxona markazi qilish"
            >
              <Crosshair className="w-4 h-4 text-indigo-500" />
              <span className="text-[10px]">Joriy joylashuvim</span>
            </button>

            {/* Xaritada bosib, korxona markazini qo'lda belgilash */}
            <button
              onClick={() => setPickingCenter(prev => !prev)}
              disabled={savingCenter}
              className={`px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 font-bold disabled:opacity-50 ${
                pickingCenter
                  ? 'bg-indigo-500 text-white'
                  : 'text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/10'
              }`}
              title="Xaritada bosib korxona markazini belgilash"
            >
              <Target className="w-4 h-4" />
              <span className="text-[10px]">
                {pickingCenter ? 'Xaritada bosing...' : 'Markazni belgilash'}
              </span>
            </button>

            <div className="w-px h-6 bg-slate-200 dark:bg-white/10 mx-1 shrink-0" />

            {/* Masofa o'lchash - ko'cha bo'ylab haqiqiy yo'l masofasi (OSRM) */}
            <button
              onClick={() => setMeasuring(prev => !prev)}
              className={`px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 font-bold ${
                measuring
                  ? 'bg-amber-500 text-white'
                  : 'text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/10'
              }`}
              title="Ko'cha bo'ylab masofa o'lchash"
            >
              <Ruler className="w-4 h-4" />
              <span className="text-[10px]">
                {measuring ? 'Xaritada nuqta bosing...' : "Masofa o'lchash"}
              </span>
            </button>

            {/* Natija - kamida bitta nuqta belgilanganda ko'rinadi */}
            {measurePoints.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25">
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  {measureLoading
                    ? 'Hisoblanmoqda...'
                    : measureResult
                      ? `${formatDistance(measureResult.distanceM)} • ~${Math.round(measureResult.durationS / 60)} daq`
                      : `${measurePoints.length} nuqta belgilandi`}
                </span>
                <button
                  onClick={clearMeasurement}
                  className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 cursor-pointer"
                  title="O'lchovni tozalash"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Map viewport */}
          <div className="flex-1 bg-white dark:bg-[#111827]/85 border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden p-1 relative shadow-sm">

            {/* OpenStreetMap viewport container */}
            <div ref={mapContainerRef} className="absolute inset-0 w-full h-full rounded-[22px] z-10" />

            {/* Markaz tasdiqlash paneli - IKKALA yo'l ("Joriy joylashuvim" va
                "Xaritada belgilash") ham shu orqali o'tadi, matni manbaga
                (pendingLocationSource) qarab farqlanadi - brauzer
                noaniqligi haqidagi ogohlantirish faqat geolokatsiyaga
                tegishli, xaritada ANIQ bosilgan nuqta uchun emas. */}
            {pendingLocation && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-white dark:bg-[#1e293b] border border-amber-500/40 rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3 max-w-[90%]">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
                <p className="text-[11px] text-slate-700 dark:text-gray-300 font-semibold">
                  {pendingLocationSource === 'manual'
                    ? "Shu nuqtani (sariq belgi) korxona markazi qilib belgilaysizmi?"
                    : "Brauzer shu nuqtani (sariq belgi) topdi. To'g'rimi? Kompyuterlarda bu ko'pincha noaniq bo'ladi."}
                </p>
                <button
                  onClick={() => { saveCompanyCenter(pendingLocation[0], pendingLocation[1]); setPendingLocation(null); setPendingLocationSource(null); }}
                  disabled={savingCenter}
                  className="shrink-0 bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition cursor-pointer disabled:opacity-50"
                >
                  Ha, to'g'ri
                </button>
                <button
                  onClick={() => { setPendingLocation(null); setPendingLocationSource(null); }}
                  className="shrink-0 bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-gray-300 text-[11px] font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
                >
                  Yo'q, bekor
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default LeafletMap;
