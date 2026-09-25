// Universal Service API Client using native fetch API

import { showErrorToast } from './toast';

const API_BASE_URL = '/api/v1';

const getHeaders = () => {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  };
  
  const token = localStorage.getItem('auth_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const tenantId = localStorage.getItem('tenant_id');
  if (tenantId) {
    headers['X-TenantID'] = tenantId;
  }

  return headers;
};

// Login/subdomain endpointlari xato PAROL uchun ham 401 qaytaradi - ular pastdagi
// avtomatik logout mantig'idan ISTISNO qilinishi SHART. Aks holda foydalanuvchi
// parolni bir marta xato kiritsa, "parol xato" xabari ko'rsatilish o'rniga sahifa
// qayta yuklanib, cheksiz reload halqasi hosil bo'lardi.
const AUTH_ENDPOINTS_RE = /\/auth\/(login|subdomain)/;

/**
 * Qurilma identifikatori. Refresh token AYNAN shu qurilmaga bog'lanadi -
 * token boshqa kompyuterga ko'chirilsa, u yerdagi device_id boshqacha
 * bo'ladi va server sessiyani yopadi.
 *
 * Bu ko'chirishning oldini OLMAYDI (nusxa oluvchi buni ham ko'chirishi
 * mumkin), lekin oddiy "tokenni olib qo'ydim" holatini to'sadi va
 * o'g'irlikni serverda aniqlashga imkon beradi.
 */
const getDeviceId = () => {
  let id = localStorage.getItem('device_id');
  if (!id) {
    id = (crypto.randomUUID && crypto.randomUUID()) ||
         (Date.now().toString(36) + Math.random().toString(36).slice(2));
    localStorage.setItem('device_id', id);
  }
  return id;
};

// Bir vaqtda 10 ta so'rov 401 olsa, 10 ta refresh yuborilmasligi kerak:
// birinchisi so'rov yuboradi, qolganlari SHU va'daga ulanadi. Aks holda
// rotatsiya tufayli ikkinchisi allaqachon ishlatilgan tokenni yuborib,
// server buni o'g'irlik deb qabul qilib butun sessiyani yopib qo'yardi.
let refreshPromise = null;

const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return false;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken, device_id: getDeviceId() })
        });
        if (!res.ok) return false;
        const data = await res.json();
        if (!data.token) return false;
        localStorage.setItem('auth_token', data.token);
        if (data.refreshToken) localStorage.setItem('refresh_token', data.refreshToken);
        return true;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
};

/**
 * Access token muddati tugagan bo'lsa jimgina yangilab, so'rovni QAYTA
 * yuboradi. Foydalanuvchi hech narsa sezmaydi - avval esa token eskirsa
 * sahifa to'satdan login ekraniga otib yuborardi.
 */
const authFetch = async (url, options = {}) => {
  let res;
  try {
    res = await fetch(url, options);
  } catch (e) {
    // Tarmoq darajasidagi xato (server umuman javob bermadi) - handleResponse'ga
    // yetib bormaydi, shuning uchun bu yerda ko'rsatiladi.
    showErrorToast("Server bilan aloqa yo'q. Internet ulanishini tekshiring.");
    throw e;
  }

  if (res.status === 401 && !AUTH_ENDPOINTS_RE.test(url)) {
    const ok = await refreshAccessToken();
    if (ok) {
      const headers = { ...(options.headers || {}) };
      headers['Authorization'] = `Bearer ${localStorage.getItem('auth_token')}`;
      res = await fetch(url, { ...options, headers });
    }
  }

  return res;
};

// `silent403`: chaqiruvchi BU aniq so'rovda 403'ni KUTAYOTGAN bo'lsa (masalan
// bir nechta modulni birlashtirib yuklaydigan sahifada, ba'zi rollarda
// ba'zi moduллarga huquq yo'qligi normal holat) va o'zi allaqachon
// natijani jimgina fallback qiymat bilan almashtiryapti (.catch(() => []))
// - shu holda ogohlantirish umuman KERAK EMAS. MUHIM (audit'da topilgan):
// avval bunday joylarda ham har safar "Sizda bu amalni bajarish uchun
// huquq yo'q" toast'i chiqaverardi - sahifaning o'zi to'g'ri ishlasa ham,
// masalan Dispetcher har safar Bosh sahifaga yoki Buyurtmalarga kirganda.
const handleResponse = async (response, { silent403 = false } = {}) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const suppressToast = silent403 && response.status === 403;

    // Xatoni foydalanuvchiga KO'RSATAMIZ (2026-08-10 auditda topilgan: sahifa
    // catch'lari faqat console.error qilardi - server aniq sabab qaytarsa ham
    // "tugma ishlamayapti" bo'lib ko'rinardi). Istisnolar:
    //  - auth endpointlari: LoginPage xatoni formaning o'zida ko'rsatadi;
    //  - 401: pastdagi mantiq sahifani qayta yuklaydi, toast ko'rsatishga ulgurmaydi;
    //  - silent403: yuqoridagi izohga qarang.
    if (!suppressToast && response.status !== 401 && !AUTH_ENDPOINTS_RE.test(response.url || '')) {
      showErrorToast(errorData.message || `Server xatosi (${response.status})`);
    }

    // MUHIM (jonli holatda topilgan xato, tuzatildi): 401 kelganda hech qanday
    // chora ko'rilmasdi - saqlangan token yaroqsiz bo'lib qolgan holatda (masalan
    // admin panelda xodimning login nomi o'zgartirilgan bo'lsa) foydalanuvchi
    // har bir sahifada xato xabarini ko'rib, o'zi qo'lda "Chiqish"ni topmaguncha
    // shu holatda qamalib qolardi. Endi yaroqsiz sessiya avtomatik tozalanadi.
    // reload() ATAYIN qat'iy yo'nalish (masalan '/login') o'rniga ishlatiladi:
    // joriy URL saqlanib qoladi, App.jsx esa auth_user yo'qligini ko'rib
    // o'zining marshrut mantig'i bilan TO'G'RI login sahifasiga yuboradi
    // (superadmin uchun /spd, kompaniya hisobi uchun /login) - qat'iy yo'nalish
    // superadminni noto'g'ri sahifaga tushirib qo'yardi.
    if (response.status === 401 && !AUTH_ENDPOINTS_RE.test(response.url || '')) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('tenant_id');
      window.location.reload();
    }

    // status/data ATAYLAB Error obyektiga qo'shiladi (JS Error'ga ixtiyoriy
    // maydon qo'shish mumkin) - ba'zi chaqiruvchi joylar (masalan xodimni
    // o'chirishda 409 kelsa) faqat matn emas, backend qaytargan struktura
    // asosida (masalan qaysi bo'lim bog'liqligini) UI qaror qabul qilishi kerak.
    const err = new Error(errorData.message || `API Error: ${response.status}`);
    err.status = response.status;
    err.data = errorData;
    throw err;
  }
  if (response.status === 204) return null;
  return response.json();
};

export const api = {
  // Auth
  // `subdomain` endi login formasida foydalanuvchi qo'lda kiritgan kompaniya
  // kodi - bir nechta kompaniya BITTA umumiy domenda (servicecore.ecos.uz) ishlagani
  // uchun hostname'dan avtomatik aniqlash imkonsiz (barchasida bir xil host).
  async checkSubdomain(subdomain) {
    const res = await authFetch(`${API_BASE_URL}/auth/subdomain/${subdomain}`);
    const data = await handleResponse(res);
    localStorage.setItem('tenant_id', data.id);
    return data;
  },

  // `companyCode` (kompaniya kodi = subdomain) SERVERGA yuboriladi. Avval u
  // faqat javob kelgandan KEYIN, mijoz tomonida solishtirilardi - ya'ni token
  // allaqachon localStorage'ga yozilgan bo'lardi va noto'g'ri kompaniya
  // kiritilgan bo'lsa ham amalda sessiya ochilib ketardi. Endi mos kelmasa
  // server 401 qaytaradi va token umuman berilmaydi.
  async login(username, password, companyCode) {
    const res = await authFetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // client_type: server bu hisob veb panelga kira olishini tekshiradi
      // (haydovchi/ishchi/sex xodimi faqat mobil ilova uchun).
      body: JSON.stringify({
        username, password,
        company_code: companyCode,
        client_type: 'WEB',
        // Refresh token shu qurilmaga bog'lanadi.
        device_id: getDeviceId()
      })
    });
    const data = await handleResponse(res);
    localStorage.setItem('auth_token', data.token);
    if (data.refreshToken) localStorage.setItem('refresh_token', data.refreshToken);
    localStorage.setItem('auth_user', JSON.stringify(data.user));
    return data;
  },

  /**
   * Chiqish. Refresh tokenni SERVERDA ham bekor qiladi - aks holda u
   * localStorage'dan o'chirilsa ham 30 kun davomida yaroqli qolardi va
   * nusxasi bo'lgan odam undan foydalanaverardi.
   *
   * Tarmoq xatosi chiqishni to'smasligi kerak: server javob bermasa ham
   * mahalliy sessiya baribir tozalanadi.
   */
  async logout() {
    const refreshToken = localStorage.getItem('refresh_token');
    try {
      if (refreshToken) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken })
        });
      }
    } catch {
      // jimgina o'tkazamiz - pastdagi tozalash baribir bajariladi
    } finally {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('tenant_id');
    }
  },

  async getMe() {
    const res = await authFetch(`${API_BASE_URL}/auth/me`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Clients
  async getClients({ silent403 = false } = {}) {
    const res = await authFetch(`${API_BASE_URL}/clients`, {
      headers: getHeaders()
    });
    return handleResponse(res, { silent403 });
  },

  async createClient(client) {
    const res = await authFetch(`${API_BASE_URL}/clients`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(client)
    });
    return handleResponse(res);
  },

  async updateClient(id, client) {
    const res = await authFetch(`${API_BASE_URL}/clients/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(client)
    });
    return handleResponse(res);
  },

  async deleteClient(id) {
    const res = await authFetch(`${API_BASE_URL}/clients/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async getClientNotes(clientId) {
    const res = await authFetch(`${API_BASE_URL}/clients/${clientId}/notes`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async addClientNote(clientId, text) {
    const res = await authFetch(`${API_BASE_URL}/clients/${clientId}/notes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ text })
    });
    return handleResponse(res);
  },

  // Employees
  async getEmployees({ silent403 = false } = {}) {
    const res = await authFetch(`${API_BASE_URL}/employees`, {
      headers: getHeaders()
    });
    return handleResponse(res, { silent403 });
  },

  async createEmployee(employee) {
    const res = await authFetch(`${API_BASE_URL}/employees`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(employee)
    });
    return handleResponse(res);
  },

  async updateEmployee(id, employee) {
    const res = await authFetch(`${API_BASE_URL}/employees/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(employee)
    });
    return handleResponse(res);
  },

  async deleteEmployee(id) {
    const res = await authFetch(`${API_BASE_URL}/employees/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async resetEmployeePassword(id, password) {
    const res = await authFetch(`${API_BASE_URL}/employees/${id}/password`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ password })
    });
    return handleResponse(res);
  },

  async getDrivers() {
    const res = await authFetch(`${API_BASE_URL}/employees/drivers`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Services Catalog
  async getServices() {
    const res = await authFetch(`${API_BASE_URL}/services`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async createService(service) {
    const res = await authFetch(`${API_BASE_URL}/services`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(service)
    });
    return handleResponse(res);
  },

  async updateService(id, service) {
    const res = await authFetch(`${API_BASE_URL}/services/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(service)
    });
    return handleResponse(res);
  },

  async deleteService(id) {
    const res = await authFetch(`${API_BASE_URL}/services/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Order Statuses
  async getOrderStatuses({ silent403 = false } = {}) {
    const res = await authFetch(`${API_BASE_URL}/order-statuses`, {
      headers: getHeaders()
    });
    return handleResponse(res, { silent403 });
  },

  async createOrderStatus(status) {
    const res = await authFetch(`${API_BASE_URL}/order-statuses`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(status)
    });
    return handleResponse(res);
  },

  async reorderStatuses(orderedIds) {
    const res = await authFetch(`${API_BASE_URL}/order-statuses/reorder`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(orderedIds)
    });
    return handleResponse(res);
  },

  async updateOrderStatusDefinition(id, status) {
    const res = await authFetch(`${API_BASE_URL}/order-statuses/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(status)
    });
    return handleResponse(res);
  },

  async deleteOrderStatus(id) {
    const res = await authFetch(`${API_BASE_URL}/order-statuses/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Gilam (OrderItem) ishlov bosqichlari - "Buyurtma statuslari" bilan BIR
  // XIL erkin CRUD (qo'shish/tahrirlash/o'chirish/tartib almashtirish).
  // Batafsil: backend ItemStatusLabel/ItemStatusController izohi.
  async getItemStatuses() {
    const res = await authFetch(`${API_BASE_URL}/item-statuses`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async createItemStatusLabel(label) {
    const res = await authFetch(`${API_BASE_URL}/item-statuses`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(label)
    });
    return handleResponse(res);
  },

  async updateItemStatusLabel(itemKey, label) {
    const res = await authFetch(`${API_BASE_URL}/item-statuses/${itemKey}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(label)
    });
    return handleResponse(res);
  },

  async deleteItemStatusLabel(itemKey) {
    const res = await authFetch(`${API_BASE_URL}/item-statuses/${itemKey}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async reorderItemStatuses(orderedIds) {
    const res = await authFetch(`${API_BASE_URL}/item-statuses/reorder`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(orderedIds)
    });
    return handleResponse(res);
  },

  async getOrders({ silent403 = false } = {}) {
    const res = await authFetch(`${API_BASE_URL}/orders`, {
      headers: getHeaders()
    });
    return handleResponse(res, { silent403 });
  },

  async getPendingHandovers() {
    const res = await authFetch(`${API_BASE_URL}/orders/pending-handovers`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async getPendingTransactions() {
    const res = await authFetch(`${API_BASE_URL}/finance/pending-transactions`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async confirmTransaction(txId) {
    const res = await authFetch(`${API_BASE_URL}/finance/transactions/${txId}/confirm`, {
      method: 'PUT',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async confirmHandover(orderId, actualAmount = null) {
    const body = actualAmount !== null ? JSON.stringify({ actual_amount: actualAmount }) : undefined;
    const res = await authFetch(`${API_BASE_URL}/orders/${orderId}/confirm-handover`, {
      method: 'PUT',
      headers: getHeaders(),
      body
    });
    return handleResponse(res);
  },

  async createOrder(order) {
    const res = await authFetch(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(order)
    });
    return handleResponse(res);
  },

  async updateOrderStatus(orderId, statusId) {
    const res = await authFetch(`${API_BASE_URL}/orders/${orderId}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status_id: statusId })
    });
    return handleResponse(res);
  },

  async updateOrderWorker(orderId, workerId) {
    const res = await authFetch(`${API_BASE_URL}/orders/${orderId}/worker`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ worker_id: workerId })
    });
    return handleResponse(res);
  },

  async updateOrder(id, order) {
    const res = await authFetch(`${API_BASE_URL}/orders/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(order)
    });
    return handleResponse(res);
  },

  async deleteOrder(id) {
    const res = await authFetch(`${API_BASE_URL}/orders/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Finance & Transactions
  async getTransactions({ silent403 = false } = {}) {
    const res = await authFetch(`${API_BASE_URL}/finance/transactions`, {
      headers: getHeaders()
    });
    return handleResponse(res, { silent403 });
  },

  async createTransaction(tx) {
    const res = await authFetch(`${API_BASE_URL}/finance/transactions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(tx)
    });
    return handleResponse(res);
  },

  async getFinanceStats({ silent403 = false } = {}) {
    const res = await authFetch(`${API_BASE_URL}/finance/stats`, {
      headers: getHeaders()
    });
    return handleResponse(res, { silent403 });
  },

  // Xato kiritilgan bitta tranzaksiyani o'chirish - butun tarixni
  // o'chiradigan resetFinance()dan farqli, faqat shu bitta yozuvga tegadi.
  async deleteTransaction(id) {
    const res = await authFetch(`${API_BASE_URL}/finance/transactions/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Korxona ishga tushishidan oldingi sinov davri kirim-chiqimlarini
  // o'chirib, balansni 0ga tushiradi. FAQAT transactions'ga tegadi.
  async resetFinance() {
    const res = await authFetch(`${API_BASE_URL}/finance/reset`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ confirm: 'RESET' })
    });
    return handleResponse(res);
  },

  // Finance: Debts (Nasiyalar & Qarzlar)
  async getDebts() {
    const res = await authFetch(`${API_BASE_URL}/finance/debts`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async createDebt(debt) {
    const res = await authFetch(`${API_BASE_URL}/finance/debts`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(debt)
    });
    return handleResponse(res);
  },

  async payDebt(id) {
    const res = await authFetch(`${API_BASE_URL}/finance/debts/${id}/pay`, {
      method: 'PUT',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Finance: Budgets (Byudjetlar)
  async getBudgets() {
    const res = await authFetch(`${API_BASE_URL}/finance/budgets`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async updateBudget(category, limitAmount) {
    const res = await authFetch(`${API_BASE_URL}/finance/budgets/${category}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ limitAmount })
    });
    return handleResponse(res);
  },

  // GPS Tracking
  async getDriversGps() {
    const res = await authFetch(`${API_BASE_URL}/gps/drivers`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Haydovchi korxona markazidan chiqib-kirgan har bir SAFAR (DriverTrip) -
  // masofa, vaqt, har biri ALOHIDA yozuv.
  async getDriverTrips(driverId) {
    const res = await authFetch(`${API_BASE_URL}/gps/trips?driverId=${driverId}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async getTripPath(tripId) {
    const res = await authFetch(`${API_BASE_URL}/gps/trips/${tripId}/path`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Salaries
  async getSalaries({ silent403 = false } = {}) {
    const res = await authFetch(`${API_BASE_URL}/salaries`, {
      headers: getHeaders()
    });
    return handleResponse(res, { silent403 });
  },

  async paySalary(id) {
    const res = await authFetch(`${API_BASE_URL}/salaries/${id}/pay`, {
      method: 'PUT',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  /// Xato bilan "to'landi" deb belgilangan hisobni bekor qiladi - status
  /// qaytadan UNPAID bo'ladi va tegishli xarajat tranzaksiyasi o'chiriladi.
  async unpaySalary(id) {
    const res = await authFetch(`${API_BASE_URL}/salaries/${id}/unpay`, {
      method: 'PUT',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async addSalaryDeduction(id, amount) {
    const res = await authFetch(`${API_BASE_URL}/salaries/${id}/deduction`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ amount })
    });
    return handleResponse(res);
  },

  async removeSalaryDeduction(id, amount) {
    const res = await authFetch(`${API_BASE_URL}/salaries/${id}/deduction/remove`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ amount })
    });
    return handleResponse(res);
  },

  async addSalaryBonus(id, amount) {
    const res = await authFetch(`${API_BASE_URL}/salaries/${id}/bonus`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ amount })
    });
    return handleResponse(res);
  },

  async removeSalaryBonus(id, amount) {
    const res = await authFetch(`${API_BASE_URL}/salaries/${id}/bonus/remove`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ amount })
    });
    return handleResponse(res);
  },

  /// pay_period: "YYYY-MM" (ixtiyoriy, berilmasa joriy oy ishlatiladi).
  /// Oyligi sozlangan barcha faol xodimlar uchun shu oylik hisobini yaratadi.
  async generatePayroll(payPeriod) {
    const res = await authFetch(`${API_BASE_URL}/salaries/generate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payPeriod ? { pay_period: payPeriod } : {})
    });
    return handleResponse(res);
  },

  // Attendance (davomat) - xodimning ishga kelmagan kunlari
  async getAbsences({ userId, period, silent403 = false } = {}) {
    const params = new URLSearchParams();
    if (userId) params.set('userId', userId);
    if (period) params.set('period', period);
    const qs = params.toString();
    const res = await authFetch(`${API_BASE_URL}/attendance${qs ? `?${qs}` : ''}`, {
      headers: getHeaders()
    });
    return handleResponse(res, { silent403 });
  },

  async markAbsent(userId, date, reason) {
    const res = await authFetch(`${API_BASE_URL}/attendance`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ userId, date, reason })
    });
    return handleResponse(res);
  },

  async removeAbsence(id) {
    const res = await authFetch(`${API_BASE_URL}/attendance/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Company Settings
  async getCompanySettings({ silent403 = false } = {}) {
    const res = await authFetch(`${API_BASE_URL}/company`, {
      headers: getHeaders()
    });
    return handleResponse(res, { silent403 });
  },

  async updateCompanySettings(settings) {
    const res = await authFetch(`${API_BASE_URL}/company`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(settings)
    });
    return handleResponse(res);
  },

  // Korxona markazi (Xarita bo'limi) - to'liq getCompanySettings'dan farqli,
  // 'map' huquqi bilan ham o'qish/yozish mumkin (sir emas, faqat koordinata).
  async getCompanyLocation({ silent403 = false } = {}) {
    const res = await authFetch(`${API_BASE_URL}/company/location`, {
      headers: getHeaders()
    });
    return handleResponse(res, { silent403 });
  },

  async updateCompanyLocation(latitude, longitude) {
    const res = await authFetch(`${API_BASE_URL}/company/location`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ latitude, longitude })
    });
    return handleResponse(res);
  },

  async changePassword(currentPassword, newPassword) {
    const res = await authFetch(`${API_BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ currentPassword, newPassword })
    });
    return handleResponse(res);
  },

  // Roles & Permissions
  async getRoles() {
    const res = await authFetch(`${API_BASE_URL}/roles`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async getPermissionKeys() {
    const res = await authFetch(`${API_BASE_URL}/roles/permission-keys`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async createRole(role) {
    const res = await authFetch(`${API_BASE_URL}/roles`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(role)
    });
    return handleResponse(res);
  },

  async updateRole(id, role) {
    const res = await authFetch(`${API_BASE_URL}/roles/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(role)
    });
    return handleResponse(res);
  },

  async deleteRole(id) {
    const res = await authFetch(`${API_BASE_URL}/roles/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Superadmin: Companies (tenants)
  async getCompanies() {
    const res = await authFetch(`${API_BASE_URL}/superadmin/companies`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async createCompany(company) {
    const res = await authFetch(`${API_BASE_URL}/superadmin/companies`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(company)
    });
    return handleResponse(res);
  },

  async updateCompanyStatus(id, status) {
    const res = await authFetch(`${API_BASE_URL}/superadmin/companies/${id}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status })
    });
    return handleResponse(res);
  },

  async getCompanyDetail(id) {
    const res = await authFetch(`${API_BASE_URL}/superadmin/companies/${id}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async updateCompany(id, data) {
    const res = await authFetch(`${API_BASE_URL}/superadmin/companies/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async getCompanyUsers(id) {
    const res = await authFetch(`${API_BASE_URL}/superadmin/companies/${id}/users`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async resetCompanyUserPassword(id, userId) {
    const res = await authFetch(`${API_BASE_URL}/superadmin/companies/${id}/users/${userId}/password`, {
      method: 'PUT',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async getCompanySubscriptions(id) {
    const res = await authFetch(`${API_BASE_URL}/superadmin/companies/${id}/subscriptions`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async createCompanySubscription(id, data) {
    const res = await authFetch(`${API_BASE_URL}/superadmin/companies/${id}/subscriptions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async updateCompanySubscription(id, subscriptionId, data) {
    const res = await authFetch(`${API_BASE_URL}/superadmin/companies/${id}/subscriptions/${subscriptionId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async getSuperadminStats() {
    const res = await authFetch(`${API_BASE_URL}/superadmin/stats`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Bildirishnomalar tarixi (qo'ng'iroqcha) - mobil ilova bilan BIR XIL
  // backend endpointlari (NotificationController). Avval qo'ng'iroqcha
  // mockDb/localStorage'dan o'qirdi - boshqa brauzerdan kirilsa tarix
  // "yo'qolib", mobil bilan mos kelmasdi.
  async getNotifications(page = 0, size = 30) {
    const res = await authFetch(`${API_BASE_URL}/notifications?page=${page}&size=${size}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async getUnreadNotificationCount() {
    const res = await authFetch(`${API_BASE_URL}/notifications/unread-count`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async markNotificationRead(id) {
    const res = await authFetch(`${API_BASE_URL}/notifications/${id}/read`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async markAllNotificationsRead() {
    const res = await authFetch(`${API_BASE_URL}/notifications/read-all`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async broadcastToEmployees(title, body) {
    const res = await authFetch(`${API_BASE_URL}/notifications/broadcast`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ title, body })
    });
    return handleResponse(res);
  },

  async broadcastAppUpdate(version, message) {
    const res = await authFetch(`${API_BASE_URL}/superadmin/broadcast/app-update`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ version, message })
    });
    return handleResponse(res);
  },

  async getSipAccounts() {
    const res = await authFetch(`${API_BASE_URL}/sip-accounts`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async createSipAccount(accountData) {
    const res = await authFetch(`${API_BASE_URL}/sip-accounts`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(accountData)
    });
    return handleResponse(res);
  },

  // Mavjud SipAccount'ni yangilaydi (yangi qator yaratmasdan) - "sozlamalarni
  // saqlash" har safar YANGI trunk yaratib, eskisini yetim qoldirmasligi uchun.
  async updateSipAccount(id, accountData) {
    const res = await authFetch(`${API_BASE_URL}/sip-accounts/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(accountData)
    });
    return handleResponse(res);
  },

  async deleteSipAccount(id) {
    const res = await authFetch(`${API_BASE_URL}/sip-accounts/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // JsSIP registratsiyasi uchun haqiqiy hisob ma'lumotlarini (parol bilan)
  // olish - umumiy /sip-accounts ro'yxati endi parolni qaytarmaydi.
  async getSipAccountCredentials(id) {
    const res = await authFetch(`${API_BASE_URL}/sip-accounts/${id}/credentials`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Backend endi qo'ng'iroqlarni ESL hodisalari orqali o'zi avtoritativ
  // yozadi (TelephonyService.endCall) - shu yozuvlarni o'qish uchun.
  async getCallSessions() {
    const res = await authFetch(`${API_BASE_URL}/call-sessions`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Brauzerning JsSIP orqali FreeSWITCH "internal" profiliga ro'yxatdan
  // o'tishi uchun - bu operatorning SHAXSIY ichki extension'i, UzTelecom
  // trunk (SipAccount) bilan hech qanday aloqasi yo'q. Har qanday
  // autentifikatsiya qilingan foydalanuvchi (jumladan DISPATCHER) chaqira oladi.
  async getMyExtension() {
    const res = await authFetch(`${API_BASE_URL}/telephony/my-extension`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  }
};
