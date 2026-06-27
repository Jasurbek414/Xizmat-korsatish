// Mock Database for SaaS ERP system (Superadmin & Company Admin)

const DEFAULT_STATUSES = [
  { id: '1', name_uz: 'Qabul qilindi', name_ru: 'Принят', name_en: 'Accepted', color_code: '#3b82f6', sort_order: 1 },
  { id: '2', name_uz: 'Kuryer yo\'lda', name_ru: 'Курьер в пути', name_en: 'Courier on the way', color_code: '#f59e0b', sort_order: 2 },
  { id: '3', name_uz: 'Bajarilmoqda', name_ru: 'Выполняется', name_en: 'In progress', color_code: '#8b5cf6', sort_order: 3 },
  { id: '4', name_uz: 'Tugallandi', name_ru: 'Завершено', name_en: 'Completed', color_code: '#10b981', sort_order: 4 },
];

const DEFAULT_SERVICES = [
  { id: '1', name_uz: 'Tezkor Yetkazib berish', name_ru: 'Экспресс Доставка', name_en: 'Express Delivery', price: 25000, category: 'Delivery' },
  { id: '2', name_uz: 'Standart Yetkazib berish', name_ru: 'Стандартная Доставка', name_en: 'Standard Delivery', price: 15000, category: 'Delivery' },
  { id: '3', name_uz: 'Uyni Tozalash Xizmati', name_ru: 'Уборка Дома', name_en: 'House Cleaning', price: 150000, category: 'Cleaning' },
  { id: '4', name_uz: 'Konditsioner Ta\'mirlash', name_ru: 'Ремонт Кондиционеров', name_en: 'AC Repair', price: 120000, category: 'Maintenance' },
];

const DEFAULT_COMPANIES = [
  { id: 'c1', name: 'Express Mail Tashkent', sub_domain: 'expressmail', status: 'ACTIVE', plan: 'PREMIUM', expires: '2027-12-31' },
  { id: 'c2', name: 'Clean & Shine', sub_domain: 'cleanshine', status: 'ACTIVE', plan: 'BASIC', expires: '2026-09-15' },
  { id: 'c3', name: 'FixIt Uz', sub_domain: 'fixit', status: 'BLOCKED', plan: 'BASIC', expires: '2026-05-01' }
];

const DEFAULT_USERS = [
  { id: 'u1', username: 'driver1', full_name: 'Alisher Qodirov', role: 'WORKER_DRIVER', phone: '+998 90 123 45 67', status: 'ACTIVE', lat: 41.311081, lng: 69.240562, password: 'admin' },
  { id: 'u2', username: 'driver2', full_name: 'Dostonbek Ergashev', role: 'WORKER_DRIVER', phone: '+998 93 321 65 54', status: 'ACTIVE', lat: 41.3275, lng: 69.2854, password: 'admin' },
  { id: 'u_admin', username: 'admin', full_name: 'Asosiy Administrator', role: 'ADMIN', phone: '+998 99 999 99 99', status: 'ACTIVE', password: 'admin' },
  { id: 'u_op1', username: 'operator1', full_name: 'Malika Axmedova', role: 'OPERATOR', phone: '+998 99 111 22 33', status: 'ACTIVE', password: 'admin' }
];

const DEFAULT_CLIENTS = [
  { id: 'cl1', full_name: 'Jasur Mavlonov', phone: '+998 99 888 77 66', address: 'Toshkent sh., Yunusobod tumani, 4-kvartal' },
  { id: 'cl2', full_name: 'Zilola Karimova', phone: '+998 90 777 66 55', address: 'Toshkent sh., Chilonzor tumani, 1-kvartal' }
];

const DEFAULT_TRANSACTIONS = [
  { id: 't1', type: 'INCOME', amount: 250000, category: 'ORDER_PAYMENT', description: 'Buyurtma #1021 to\'lovi', created_at: '2026-06-25T11:00:00Z', wallet_id: 'cash' },
  { id: 't2', type: 'EXPENSE', amount: 80000, category: 'SALARY', description: 'Alisher Qodirov uchun avans', created_at: '2026-06-25T14:30:00Z', wallet_id: 'cash' },
  { id: 't3', type: 'INCOME', amount: 150000, category: 'ORDER_PAYMENT', description: 'Buyurtma #1022 to\'lovi', created_at: '2026-06-26T09:15:00Z', wallet_id: 'card' }
];

const DEFAULT_WALLETS = [
  { id: 'cash', name_uz: 'Naqd pul (Kassa)', name_ru: 'Наличные (Касса)', name_en: 'Cash (Register)', balance: 4500000 },
  { id: 'bank', name_uz: 'Bank hisob raqami', name_ru: 'Банковский счет', name_en: 'Bank Account', balance: 25000000 },
  { id: 'card', name_uz: 'Plastik karta (Click/Payme)', name_ru: 'Пластиковая карта', name_en: 'Card Account', balance: 8200000 }
];

const DEFAULT_BUDGETS = [
  { category: 'SALARY', limit: 10000000 },
  { category: 'OFFICE_EXPENSE', limit: 2000000 },
  { category: 'TAX', limit: 1500000 }
];

const DEFAULT_DEBTS = [
  { id: 'd1', type: 'RECEIVABLE', person: 'Jasur Mavlonov', amount: 150000, description: 'AC Repair xizmati uchun qoldiq', status: 'ACTIVE', created_at: '2026-06-24T12:00:00Z' },
  { id: 'd2', type: 'PAYABLE', person: 'Kantselyariya MChJ', amount: 400000, description: 'Ofis jihozlari uchun', status: 'ACTIVE', created_at: '2026-06-25T10:00:00Z' }
];

const DEFAULT_SALARIES = [
  { id: 's1', user_id: 'u1', full_name: 'Alisher Qodirov', base_salary: 3000000, bonus: 450000, deductions: 50000, status: 'UNPAID', pay_period: '2026-06' },
  { id: 's2', user_id: 'u2', full_name: 'Dostonbek Ergashev', base_salary: 2800000, bonus: 300000, deductions: 0, status: 'PAID', pay_period: '2026-06' }
];

const DEFAULT_ORDERS = [
  { id: 'o1', client_name: 'Jasur Mavlonov', service_name: 'Tezkor Yetkazib berish', status_id: '2', worker_name: 'Alisher Qodirov', price: 25000, address: 'Yunusobod tumani, 4-kvartal', created_at: '2026-06-26T10:00:00Z' },
  { id: 'o2', client_name: 'Zilola Karimova', service_name: 'Konditsioner Ta\'mirlash', status_id: '1', worker_name: 'Dostonbek Ergashev', price: 120000, address: 'Chilonzor tumani, 1-kvartal', created_at: '2026-06-26T14:30:00Z' }
];

const DEFAULT_COMPANY_SETTINGS = {
  company_name: 'Express Mail Tashkent',
  company_phone: '+998 90 123 45 67',
  company_address: 'Toshkent sh., Yunusobod tumani, 4-kvartal',
  company_email: 'info@expressmail.uz',
  currency: 'so\'m',
  min_order_price: 15000,
  driver_kpi_percent: 10,
  work_start_time: '08:00',
  work_end_time: '22:00',
  sms_enabled: true,
  measurement_units: ['dona', 'kv. metr', 'kg', 'litr', 'metr'],
  sms_api_token: 'eskiz_token_example_1234567890',
  sms_template_created: 'Hurmatli {client}, buyurtmangiz qabul qilindi. ID: #{order_id}. Xizmat narxi: {price} so\'m.',
  sms_template_assigned: 'Hurmatli {client}, buyurtmangiz #{order_id} kuryer {worker}ga biriktirildi. Tel: {worker_phone}.',
  sms_template_completed: 'Hurmatli {client}, buyurtmangiz #{order_id} muvaffaqiyatli yakunlandi. Rahmat!'
};

export const initMockDb = () => {
  if (!localStorage.getItem('companies')) localStorage.setItem('companies', JSON.stringify(DEFAULT_COMPANIES));
  if (!localStorage.getItem('order_statuses')) localStorage.setItem('order_statuses', JSON.stringify(DEFAULT_STATUSES));
  if (!localStorage.getItem('services')) localStorage.setItem('services', JSON.stringify(DEFAULT_SERVICES));
  
  if (!localStorage.getItem('roles')) {
    const DEFAULT_ROLES = [
      {
        id: 'ADMIN',
        name_uz: 'Administrator',
        name_ru: 'Администратор',
        name_en: 'Administrator',
        is_system: true,
        permissions: {
          clients: true,
          employees: true,
          orders: true,
          finance: true,
          salaries: true,
          settings: true,
          map: true
        }
      },
      {
        id: 'OPERATOR',
        name_uz: 'Operator',
        name_ru: 'Оператор',
        name_en: 'Operator',
        is_system: true,
        permissions: {
          clients: true,
          employees: false,
          orders: true,
          finance: false,
          salaries: false,
          settings: false,
          map: true
        }
      }
    ];
    localStorage.setItem('roles', JSON.stringify(DEFAULT_ROLES));
  }

  const existingUsers = JSON.parse(localStorage.getItem('users'));
  if (!existingUsers || !existingUsers.some(u => u.username === 'admin')) {
    localStorage.setItem('users', JSON.stringify(DEFAULT_USERS));
  }
  
  if (!localStorage.getItem('clients')) localStorage.setItem('clients', JSON.stringify(DEFAULT_CLIENTS));
  if (!localStorage.getItem('transactions')) localStorage.setItem('transactions', JSON.stringify(DEFAULT_TRANSACTIONS));
  if (!localStorage.getItem('salaries')) localStorage.setItem('salaries', JSON.stringify(DEFAULT_SALARIES));
  if (!localStorage.getItem('orders')) localStorage.setItem('orders', JSON.stringify(DEFAULT_ORDERS));
  if (!localStorage.getItem('wallets')) localStorage.setItem('wallets', JSON.stringify(DEFAULT_WALLETS));
  if (!localStorage.getItem('budgets')) localStorage.setItem('budgets', JSON.stringify(DEFAULT_BUDGETS));
  if (!localStorage.getItem('debts')) localStorage.setItem('debts', JSON.stringify(DEFAULT_DEBTS));
  
  const currentSettings = localStorage.getItem('company_settings');
  if (currentSettings) {
    const parsed = JSON.parse(currentSettings);
    if (!parsed.measurement_units) {
      parsed.measurement_units = DEFAULT_COMPANY_SETTINGS.measurement_units || ['dona', 'kv. metr', 'kg', 'litr', 'metr'];
      localStorage.setItem('company_settings', JSON.stringify(parsed));
    }
  } else {
    localStorage.setItem('company_settings', JSON.stringify(DEFAULT_COMPANY_SETTINGS));
  }

  if (!localStorage.getItem('notifications')) {
    const DEFAULT_NOTIFICATIONS = [
      {
        id: 'n1',
        title_uz: 'Kassa balansi kam',
        title_ru: 'Низкий баланс кассы',
        title_en: 'Low Cash Register Balance',
        message_uz: 'Naqd pul kassasi balansi belgilangan minimal limitdan pastladi.',
        message_ru: 'Баланс наличной кассы опустился ниже установленного минимума.',
        message_en: 'The cash register balance fell below the established minimum limit.',
        type: 'WARNING',
        read: false,
        created_at: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
      },
      {
        id: 'n2',
        title_uz: 'Yangi kuryer faollashdi',
        title_ru: 'Активирован новый курьер',
        title_en: 'New Courier Online',
        message_uz: 'Alisher Qodirov xizmat ko\'rsatish hududiga kirdi.',
        message_ru: 'Алишер Кодиров вошел в зону обслуживания.',
        message_en: 'Alisher Qodirov entered the service area.',
        type: 'SUCCESS',
        read: true,
        created_at: new Date(Date.now() - 7200000).toISOString() // 2 hours ago
      }
    ];
    localStorage.setItem('notifications', JSON.stringify(DEFAULT_NOTIFICATIONS));
  }
};

export const getDbItem = (key) => JSON.parse(localStorage.getItem(key));
export const setDbItem = (key, data) => localStorage.setItem(key, JSON.stringify(data));

export const addNotification = (title_uz, title_ru, title_en, message_uz, message_ru, message_en, type) => {
  const current = JSON.parse(localStorage.getItem('notifications')) || [];
  const newNotification = {
    id: 'n_' + Date.now(),
    title_uz,
    title_ru,
    title_en,
    message_uz,
    message_ru,
    message_en,
    type,
    read: false,
    created_at: new Date().toISOString()
  };
  const updated = [newNotification, ...current].slice(0, 50); // limit to last 50
  localStorage.setItem('notifications', JSON.stringify(updated));
  // Dispatch dynamic storage event
  window.dispatchEvent(new Event('storage'));
  return newNotification;
};
