import React from 'react';
import { Eye, Edit2, Trash2, ShieldAlert, ShieldCheck, Phone, UserCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const EmployeesTable = ({ 
  users, 
  onToggleStatus, 
  onOpenDetails, 
  onOpenEdit, 
  onDelete 
}) => {
  const { t } = useTranslation();

  return (
    <div className="glass-card rounded-2xl overflow-hidden shadow-sm dark:shadow-none bg-white dark:bg-transparent border border-slate-200 dark:border-white/5 text-xs font-semibold">
      
      <div className="p-4 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-transparent flex justify-between items-center">
        <h4 className="font-bold text-slate-800 dark:text-white text-xs font-['Outfit'] uppercase tracking-wider">
          Xodimlar Ro'yxati (Employee List)
        </h4>
        <span className="text-[10px] text-slate-400 font-bold">Jami: {users.length} ta xodim</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/2 text-slate-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">
              <th className="p-4">F.I.SH & Foydalanuvchi</th>
              <th className="p-4">{t('employees_page.phone')}</th>
              <th className="p-4">{t('employees_page.role')}</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Amallar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-gray-300">
            {users.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-slate-400 dark:text-gray-500 font-semibold">
                  Xodimlar topilmadi
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-white/2 transition">
                  
                  {/* Full Name & Username */}
                  <td className="p-4">
                    <span className="font-semibold text-slate-800 dark:text-white block">{u.full_name}</span>
                    <span className="text-[9px] text-slate-400 font-mono">@{u.username}</span>
                  </td>

                  {/* Phone */}
                  <td className="p-4 font-medium text-slate-600 dark:text-gray-300">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {u.phone}
                    </span>
                  </td>

                  {/* Role */}
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border ${
                      u.role === 'WORKER_DRIVER'
                        ? 'bg-blue-500/10 text-blue-600 border-blue-500/10'
                        : 'bg-indigo-500/10 text-indigo-600 border-indigo-500/10'
                    }`}>
                      {u.role === 'WORKER_DRIVER' ? t('employees_page.worker_driver') : t('employees_page.office_staff')}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="p-4">
                    {u.status === 'ACTIVE' ? (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold uppercase">
                        <ShieldCheck className="w-3.5 h-3.5" /> Faol
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 text-[9px] font-bold uppercase">
                        <ShieldAlert className="w-3.5 h-3.5" /> Bloklangan
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 ml-auto w-fit">
                      
                      {/* View Profile */}
                      <button
                        onClick={() => onOpenDetails(u)}
                        title="Batafsil ma'lumot"
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 dark:text-gray-400 transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => onOpenEdit(u)}
                        title="Tahrirlash"
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 dark:text-gray-400 transition cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Block/Activate Toggle */}
                      <button
                        onClick={() => onToggleStatus(u.id)}
                        title={u.status === 'ACTIVE' ? "Bloklash" : "Faollashtirish"}
                        className={`p-1.5 rounded-lg transition cursor-pointer ${
                          u.status === 'ACTIVE' 
                            ? 'bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 border border-rose-500/5'
                            : 'bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-500 border border-emerald-500/5'
                        }`}
                      >
                        {u.status === 'ACTIVE' ? <ShieldAlert className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => onDelete(u.id)}
                        title="O'chirish"
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 dark:bg-white/5 dark:hover:bg-rose-500/10 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                    </div>
                  </td>

                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default EmployeesTable;
