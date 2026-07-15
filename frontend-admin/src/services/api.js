// Universal Service API Client using native fetch API

const API_BASE_URL = '/api/v1';

export const getSubdomain = () => {
  const host = window.location.hostname;
  const parts = host.split('.');
  // Fallback to namifor for localhost/IP development
  if (parts.length <= 1 || host === 'localhost' || host === '127.0.0.1') {
    return 'namifor';
  }
  return parts[0];
};

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

const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${response.status}`);
  }
  if (response.status === 204) return null;
  return response.json();
};

export const api = {
  // Auth
  async checkSubdomain() {
    const subdomain = getSubdomain();
    const res = await fetch(`${API_BASE_URL}/auth/subdomain/${subdomain}`);
    const data = await handleResponse(res);
    localStorage.setItem('tenant_id', data.id);
    return data;
  },

  async login(username, password) {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await handleResponse(res);
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('auth_user', JSON.stringify(data.user));
    return data;
  },

  async getMe() {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Clients
  async getClients() {
    const res = await fetch(`${API_BASE_URL}/clients`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async createClient(client) {
    const res = await fetch(`${API_BASE_URL}/clients`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(client)
    });
    return handleResponse(res);
  },

  async updateClient(id, client) {
    const res = await fetch(`${API_BASE_URL}/clients/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(client)
    });
    return handleResponse(res);
  },

  async deleteClient(id) {
    const res = await fetch(`${API_BASE_URL}/clients/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Employees
  async getEmployees() {
    const res = await fetch(`${API_BASE_URL}/employees`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async createEmployee(employee) {
    const res = await fetch(`${API_BASE_URL}/employees`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(employee)
    });
    return handleResponse(res);
  },

  async updateEmployee(id, employee) {
    const res = await fetch(`${API_BASE_URL}/employees/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(employee)
    });
    return handleResponse(res);
  },

  async deleteEmployee(id) {
    const res = await fetch(`${API_BASE_URL}/employees/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async resetEmployeePassword(id, password) {
    const res = await fetch(`${API_BASE_URL}/employees/${id}/password`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ password })
    });
    return handleResponse(res);
  },

  async getDrivers() {
    const res = await fetch(`${API_BASE_URL}/employees/drivers`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Services Catalog
  async getServices() {
    const res = await fetch(`${API_BASE_URL}/services`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async createService(service) {
    const res = await fetch(`${API_BASE_URL}/services`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(service)
    });
    return handleResponse(res);
  },

  async updateService(id, service) {
    const res = await fetch(`${API_BASE_URL}/services/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(service)
    });
    return handleResponse(res);
  },

  async deleteService(id) {
    const res = await fetch(`${API_BASE_URL}/services/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Order Statuses
  async getOrderStatuses() {
    const res = await fetch(`${API_BASE_URL}/order-statuses`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async createOrderStatus(status) {
    const res = await fetch(`${API_BASE_URL}/order-statuses`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(status)
    });
    return handleResponse(res);
  },

  async reorderStatuses(orderedIds) {
    const res = await fetch(`${API_BASE_URL}/order-statuses/reorder`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(orderedIds)
    });
    return handleResponse(res);
  },

  async updateOrderStatusDefinition(id, status) {
    const res = await fetch(`${API_BASE_URL}/order-statuses/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(status)
    });
    return handleResponse(res);
  },

  async deleteOrderStatus(id) {
    const res = await fetch(`${API_BASE_URL}/order-statuses/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async getOrders() {
    const res = await fetch(`${API_BASE_URL}/orders`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async getPendingHandovers() {
    const res = await fetch(`${API_BASE_URL}/orders/pending-handovers`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async confirmHandover(orderId) {
    const res = await fetch(`${API_BASE_URL}/orders/${orderId}/confirm-handover`, {
      method: 'PUT',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async createOrder(order) {
    const res = await fetch(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(order)
    });
    return handleResponse(res);
  },

  async updateOrderStatus(orderId, statusId) {
    const res = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status_id: statusId })
    });
    return handleResponse(res);
  },

  async updateOrderWorker(orderId, workerId) {
    const res = await fetch(`${API_BASE_URL}/orders/${orderId}/worker`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ worker_id: workerId })
    });
    return handleResponse(res);
  },

  async updateOrder(id, order) {
    const res = await fetch(`${API_BASE_URL}/orders/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(order)
    });
    return handleResponse(res);
  },

  async deleteOrder(id) {
    const res = await fetch(`${API_BASE_URL}/orders/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Finance & Transactions
  async getTransactions() {
    const res = await fetch(`${API_BASE_URL}/finance/transactions`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async createTransaction(tx) {
    const res = await fetch(`${API_BASE_URL}/finance/transactions`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(tx)
    });
    return handleResponse(res);
  },

  async getFinanceStats() {
    const res = await fetch(`${API_BASE_URL}/finance/stats`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // GPS Tracking
  async getDriversGps() {
    const res = await fetch(`${API_BASE_URL}/gps/drivers`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Salaries
  async getSalaries() {
    const res = await fetch(`${API_BASE_URL}/salaries`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async paySalary(id) {
    const res = await fetch(`${API_BASE_URL}/salaries/${id}/pay`, {
      method: 'PUT',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async addSalaryDeduction(id, amount) {
    const res = await fetch(`${API_BASE_URL}/salaries/${id}/deduction`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ amount })
    });
    return handleResponse(res);
  },

  // Company Settings
  async getCompanySettings() {
    const res = await fetch(`${API_BASE_URL}/company`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async updateCompanySettings(settings) {
    const res = await fetch(`${API_BASE_URL}/company`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(settings)
    });
    return handleResponse(res);
  },

  async changePassword(currentPassword, newPassword) {
    const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ currentPassword, newPassword })
    });
    return handleResponse(res);
  },

  // Roles & Permissions
  async getRoles() {
    const res = await fetch(`${API_BASE_URL}/roles`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async getPermissionKeys() {
    const res = await fetch(`${API_BASE_URL}/roles/permission-keys`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async createRole(role) {
    const res = await fetch(`${API_BASE_URL}/roles`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(role)
    });
    return handleResponse(res);
  },

  async updateRole(id, role) {
    const res = await fetch(`${API_BASE_URL}/roles/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(role)
    });
    return handleResponse(res);
  },

  async deleteRole(id) {
    const res = await fetch(`${API_BASE_URL}/roles/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Superadmin: Companies (tenants)
  async getCompanies() {
    const res = await fetch(`${API_BASE_URL}/superadmin/companies`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async createCompany(company) {
    const res = await fetch(`${API_BASE_URL}/superadmin/companies`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(company)
    });
    return handleResponse(res);
  },

  async updateCompanyStatus(id, status) {
    const res = await fetch(`${API_BASE_URL}/superadmin/companies/${id}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status })
    });
    return handleResponse(res);
  },

  async getCalls() {
    const res = await fetch(`${API_BASE_URL}/calls`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async createCall(callData) {
    const res = await fetch(`${API_BASE_URL}/calls`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(callData)
    });
    return handleResponse(res);
  }
};
