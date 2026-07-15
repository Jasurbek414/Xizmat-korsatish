import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';

const CreateEmployeeModal = ({ isOpen, onClose, employee, onSubmit }) => {
  const { t, i18n } = useTranslation();
  const isEdit = !!employee;

  // Form states
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('WORKER_DRIVER');
  const [status, setStatus] = useState('ACTIVE');
  const [lat, setLat] = useState('41.311081');
  const [lng, setLng] = useState('69.240562');
  const [password, setPassword] = useState('');
  const [salary, setSalary] = useState('');
  const [salaryType, setSalaryType] = useState('MONTHLY');
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getRoles()
      .then(allRoles => setRoles(allRoles.map(r => ({
        id: r.key,
        name_uz: r.nameUz,
        name_ru: r.nameRu,
        name_en: r.nameEn
      }))))
      .catch(err => console.error('Failed to load roles:', err));
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (employee) {
        setFullName(employee.full_name || '');
        setUsername(employee.username || '');
        setPhone(employee.phone || '');
        setRole(employee.role || 'WORKER_DRIVER');
        setStatus(employee.status || 'ACTIVE');
        setLat(employee.lat ? employee.lat.toString() : '41.311081');
        setLng(employee.lng ? employee.lng.toString() : '69.240562');
        setPassword(employee.password || '');
        setSalary(employee.salary ? employee.salary.toString() : '');
        setSalaryType(employee.salary_type || employee.salaryType || 'MONTHLY');
      } else {
        setFullName('');
        setUsername('');
        setPhone('+998 ');
        setRole('WORKER_DRIVER');
        setStatus('ACTIVE');
        setLat('41.311081');
        setLng('69.240562');
        setPassword('admin'); // Default password for new employees
        setSalary('');
        setSalaryType('MONTHLY');
      }
      setError('');
    }
  }, [isOpen, employee]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!fullName || !username || !phone) {
      setError("Iltimos barcha majburiy maydonlarni to'ldiring");
      return;
    }

    const payload = {
      id: isEdit ? employee.id : 'u' + Date.now(),
      full_name: fullName,
      username: username.trim().toLowerCase(),
      phone: phone.trim(),
      role,
      status,
      password: password.trim(),
      salary: salary ? salary.trim() : '',
      salary_type: salaryType,
      lat: role === 'WORKER_DRIVER' ? parseFloat(lat) || 41.311081 : null,
      lng: role === 'WORKER_DRIVER' ? parseFloat(lng) || 69.240562 : null
    };

    onSubmit(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 text-xs font-semibold">
      <div className="glass-card rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-scale-in bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/5">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-2">
          <div className="flex items-center gap-1.5 text-indigo-500">
            <UserPlus className="w-4 h-4" />
            <h3 className="text-base font-bold text-slate-800 dark:text-white font-['Outfit']">
              {isEdit ? t('employees_page.edit_employee') : t('employees_page.add_employee')}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-gray-400 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl p-2.5 text-[10px] font-bold">
              {error}
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('employees_page.fullname')} *</label>
            <input 
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Masalan: Alisher Qodirov"
              className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
              required
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('employees_page.username')} *</label>
            <input 
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masalan: driver1"
              disabled={isEdit}
              className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none disabled:bg-slate-100 dark:disabled:bg-white/2 disabled:text-slate-400"
              required
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('employees_page.phone')} *</label>
            <input 
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Masalan: +998 90 123 45 67"
              className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
              required
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('employees_page.role')}</label>
            <select 
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full glass-input rounded-xl px-3 py-2 text-slate-850 dark:text-white focus:outline-none cursor-pointer"
            >
              {roles.map(r => {
                const rName = r[`name_${i18n.language}`] || r.name_uz;
                return (
                  <option key={r.id} value={r.id}>{rName}</option>
                );
              })}
            </select>
          </div>

          {/* Password */}
          <div>
            <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('employees_page.password')} *</label>
            <input 
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full glass-input rounded-xl px-3 py-2 text-slate-850 dark:text-white focus:outline-none"
              required
            />
          </div>

          {/* Status Selector */}
          <div>
            <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('employees_page.status')}</label>
            <select 
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="ACTIVE">{t('employees_page.active_status')}</option>
              <option value="BLOCKED">{t('employees_page.blocked_status')}</option>
            </select>
          </div>

          {/* Salary Amount */}
          <div>
            <label className="block text-slate-500 dark:text-gray-400 mb-1">Ish haqi / Oylik miqdori (UZS)</label>
            <input 
              type="number"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              placeholder="Masalan: 5000000"
              className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
            />
          </div>

          {/* Salary Type */}
          <div>
            <label className="block text-slate-500 dark:text-gray-400 mb-1">Ish turi / To'lov turi</label>
            <select 
              value={salaryType}
              onChange={(e) => setSalaryType(e.target.value)}
              className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value="MONTHLY">Oylik (Monthly)</option>
              <option value="DAILY">Kunlik (Daily)</option>
              <option value="HOURLY">Soatbay (Hourly)</option>
            </select>
          </div>

          {/* Location coordinates (optional, drivers only) */}
          {role === 'WORKER_DRIVER' && (
            <div className="grid grid-cols-2 gap-2 animate-scale-in bg-slate-50 dark:bg-white/2 p-2.5 rounded-xl border border-slate-100 dark:border-white/5">
              <div>
                <label className="block text-[9px] text-slate-400 mb-0.5">Latitude</label>
                <input 
                  type="text"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="41.3110"
                  className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-lg px-2 py-1 text-slate-800 dark:text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[9px] text-slate-400 mb-0.5">Longitude</label>
                <input 
                  type="text"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="69.2405"
                  className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-lg px-2 py-1 text-slate-800 dark:text-white focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Submit/Cancel */}
          <div className="flex justify-end gap-2 pt-2">
            <button 
              type="button" 
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 px-4 py-2 rounded-xl transition cursor-pointer"
            >
              {t('common.cancel')}
            </button>
            <button 
              type="submit" 
              className="premium-btn text-white px-4 py-2 rounded-xl transition cursor-pointer flex items-center gap-1"
            >
              <Save className="w-3.5 h-3.5" />
              {t('common.save')}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default CreateEmployeeModal;
