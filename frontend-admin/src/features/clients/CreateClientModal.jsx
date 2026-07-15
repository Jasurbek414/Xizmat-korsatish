import React from 'react';
import { useTranslation } from 'react-i18next';

const CreateClientModal = ({
  showAddModal,
  setShowAddModal,
  newClient,
  setNewClient,
  handleAddClient,
  showEditModal,
  setShowEditModal,
  editingClient,
  setEditingClient,
  handleEditClient
}) => {
  const { t } = useTranslation();

  return (
    <>
      {/* Add Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-scale-in bg-white dark:bg-[#111827]">
            <h3 className="text-base font-bold text-slate-800 dark:text-white font-['Outfit']">{t('clients_page.new_client')}</h3>
            <form onSubmit={handleAddClient} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('clients_page.fullname')}</label>
                <input 
                  type="text" 
                  value={newClient.full_name} 
                  onChange={(e) => setNewClient({...newClient, full_name: e.target.value})}
                  className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('clients_page.phone')}</label>
                <input 
                  type="text" 
                  value={newClient.phone} 
                  onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                  className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                  placeholder="+998 90 123 45 67"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('clients_page.address')}</label>
                <input 
                  type="text" 
                  value={newClient.address} 
                  onChange={(e) => setNewClient({...newClient, address: e.target.value})}
                  className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  type="submit" 
                  className="premium-btn text-white px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  {t('common.add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {showEditModal && editingClient && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl animate-scale-in bg-white dark:bg-[#111827]">
            <h3 className="text-base font-bold text-slate-800 dark:text-white font-['Outfit']">Mijozni Tahrirlash</h3>
            <form onSubmit={handleEditClient} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('clients_page.fullname')}</label>
                <input 
                  type="text" 
                  value={editingClient.full_name} 
                  onChange={(e) => setEditingClient({...editingClient, full_name: e.target.value})}
                  className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('clients_page.phone')}</label>
                <input 
                  type="text" 
                  value={editingClient.phone} 
                  onChange={(e) => setEditingClient({...editingClient, phone: e.target.value})}
                  className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-500 dark:text-gray-400 mb-1">{t('clients_page.address')}</label>
                <input 
                  type="text" 
                  value={editingClient.address || ''} 
                  onChange={(e) => setEditingClient({...editingClient, address: e.target.value})}
                  className="w-full glass-input rounded-xl px-3 py-2 text-slate-800 dark:text-white focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowEditModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  type="submit" 
                  className="premium-btn text-white px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default CreateClientModal;
