// Mock Database for Desktop Dispatcher Application
const DEFAULT_CLIENTS = [
  { id: 'cl1', full_name: 'Jasur Mavlonov', phone: '+998 99 888 77 66', address: 'Toshkent sh., Yunusobod tumani, 4-kvartal' },
  { id: 'cl2', full_name: 'Zilola Karimova', phone: '+998 90 777 66 55', address: 'Toshkent sh., Chilonzor tumani, 1-kvartal' },
  { id: 'cl3', full_name: 'Alisher Qodirov', phone: '+998 90 123 45 67', address: 'Toshkent sh., Mirobod tumani, Nukus ko\'chasi 12' },
  { id: 'cl4', full_name: 'Dostonbek Ergashev', phone: '+998 93 321 65 54', address: 'Toshkent sh., Yakkasaroy tumani, Shota Rustaveli 25' },
  { id: 'cl5', full_name: 'Umida Karimova', phone: '+998 94 999 88 77', address: 'Toshkent sh., Shayxontohur tumani, Navoiy ko\'chasi 4' }
];

const DEFAULT_OPERATORS = [
  { id: 'op1', username: 'operator1', password: 'admin', full_name: 'Malika Axmedova', extension: '101' },
  { id: 'op2', username: 'operator2', password: 'admin', full_name: 'Sardor Rahimov', extension: '102' },
  { id: 'op_admin', username: 'admin', password: 'admin', full_name: 'Asosiy Administrator', extension: '100' }
];

const DEFAULT_CALL_LOGS = [
  { id: 'call_1', phone: '+998 99 888 77 66', client_name: 'Jasur Mavlonov', type: 'INCOMING', status: 'ANSWERED', duration: '2m 14s', created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: 'call_2', phone: '+998 90 777 66 55', client_name: 'Zilola Karimova', type: 'OUTGOING', status: 'ANSWERED', duration: '1m 05s', created_at: new Date(Date.now() - 3600000 * 4).toISOString() },
  { id: 'call_3', phone: '+998 95 123 45 67', client_name: null, type: 'INCOMING', status: 'MISSED', duration: '--', created_at: new Date(Date.now() - 3600000 * 6).toISOString() }
];

const DEFAULT_SIP_CONFIG = {
  domain: 'sip.servicecore.uz',
  extension: '101',
  password: 'sip_password_101',
  port: '5060',
  connected: true
};

const DEFAULT_SIP_LINES = [
  { id: 'sip_line_1', label: 'Toshkent Liniyasi 1', domain: 'sip.servicecore.uz', extension: '101', password: 'sip_password_101', port: '5060', connected: true, isActive: true },
  { id: 'sip_line_2', label: 'Samarqand Liniyasi 2', domain: 'sip.servicecore.uz', extension: '102', password: 'sip_password_102', port: '5060', connected: false, isActive: false },
  { id: 'sip_line_3', label: 'Qo\'llab-quvvatlash 103', domain: 'sip.servicecore.uz', extension: '103', password: 'sip_password_103', port: '5060', connected: true, isActive: false }
];

export const initMockDb = () => {
  if (!localStorage.getItem('dispatcher_clients')) {
    localStorage.setItem('dispatcher_clients', JSON.stringify(DEFAULT_CLIENTS));
  }
  if (!localStorage.getItem('dispatcher_operators')) {
    localStorage.setItem('dispatcher_operators', JSON.stringify(DEFAULT_OPERATORS));
  }
  if (!localStorage.getItem('dispatcher_call_logs')) {
    localStorage.setItem('dispatcher_call_logs', JSON.stringify(DEFAULT_CALL_LOGS));
  }
  if (!localStorage.getItem('dispatcher_sip_config')) {
    localStorage.setItem('dispatcher_sip_config', JSON.stringify(DEFAULT_SIP_CONFIG));
  }
  if (!localStorage.getItem('dispatcher_sip_lines')) {
    localStorage.setItem('dispatcher_sip_lines', JSON.stringify(DEFAULT_SIP_LINES));
  }
  if (!localStorage.getItem('dispatcher_orders')) {
    localStorage.setItem('dispatcher_orders', JSON.stringify([]));
  }
};

export const getDbItem = (key) => JSON.parse(localStorage.getItem(key));
export const setDbItem = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
  window.dispatchEvent(new Event('storage'));
};
