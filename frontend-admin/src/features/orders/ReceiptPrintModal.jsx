import React, { useState } from 'react';
import { X, Printer, Tag, FileText, CheckCircle2 } from 'lucide-react';

const ReceiptPrintModal = ({ order, isOpen, onClose, companyName = "Namifor Gilam Yuvish" }) => {
  const [activeTab, setActiveTab] = useState('receipt'); // 'receipt' or 'tags'
  const [paperWidth, setPaperWidth] = useState('58mm'); // '58mm' or '80mm'

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const totalArea = (order.items || []).reduce((sum, item) => {
    const a = (parseFloat(item.length) || 0) * (parseFloat(item.width) || 0);
    return sum + a;
  }, 0).toFixed(2);

  const totalSum = order.price ? Number(order.price) : 0;
  const orderDate = order.created_at
    ? new Date(order.created_at).toLocaleString('uz-UZ', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleDateString('uz-UZ');

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {/* Styles for print only */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-area, #printable-area * {
            visibility: visible;
          }
          #printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: ${paperWidth === '58mm' ? '58mm' : '80mm'};
            padding: 2mm;
            font-family: monospace;
            color: #000;
            background: #fff;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="glass-card rounded-2xl max-w-xl w-full p-6 shadow-2xl bg-white dark:bg-[#111827] flex flex-col max-h-[92vh] border border-slate-200 dark:border-white/10">
        {/* Modal Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-white/5 no-print">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-bold text-slate-800 dark:text-white ">
              Chop Etish Markazi
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 text-slate-500 hover:text-slate-700 dark:text-gray-400 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher & Paper Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 py-3 border-b border-slate-100 dark:border-white/5 no-print">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('receipt')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'receipt'
                  ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Mijoz Kvitansiyasi
            </button>
            <button
              onClick={() => setActiveTab('tags')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'tags'
                  ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-gray-400 hover:text-slate-900'
              }`}
            >
              <Tag className="w-3.5 h-3.5" /> Gilam Birkasi (Tag)
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Qog'oz:</span>
            <select
              value={paperWidth}
              onChange={(e) => setPaperWidth(e.target.value)}
              className="px-2 py-1 text-xs rounded border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111827] text-slate-700 dark:text-gray-200"
            >
              <option value="58mm">58mm (Termal)</option>
              <option value="80mm">80mm (Katta termal)</option>
            </select>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-y-auto py-4 flex justify-center bg-slate-50 dark:bg-black/30 rounded-xl my-3 p-4">
          <div
            id="printable-area"
            style={{ width: paperWidth === '58mm' ? '280px' : '360px' }}
            className="bg-white text-black p-4 rounded shadow-md border border-slate-200 text-xs font-mono space-y-3 leading-relaxed"
          >
            {activeTab === 'receipt' ? (
              /* Receipt Template */
              <div>
                <div className="text-center border-b border-dashed border-gray-400 pb-2">
                  <h4 className="font-extrabold text-sm uppercase">{companyName}</h4>
                  <p className="text-[10px] text-gray-600">Professional Gilam Yuvish</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Sana: {orderDate}</p>
                </div>

                <div className="py-2 border-b border-dashed border-gray-400 space-y-0.5 text-[11px]">
                  <div><strong>Buyurtma:</strong> #{order.id?.slice(0, 8).toUpperCase()}</div>
                  <div><strong>Mijoz:</strong> {order.client_name}</div>
                  <div><strong>Tel:</strong> {order.client_phone}</div>
                  {order.address && <div><strong>Manzil:</strong> {order.address}</div>}
                  {order.worker_name && <div><strong>Kuryer:</strong> {order.worker_name}</div>}
                </div>

                <div className="py-2 border-b border-dashed border-gray-400">
                  <div className="text-[10px] font-bold uppercase mb-1 flex justify-between">
                    <span>Gilam / O'lcham</span>
                    <span>Summa</span>
                  </div>
                  {(order.items || []).length === 0 ? (
                    <div className="text-[10px] italic text-gray-500">Gilamlar kiritilmagan</div>
                  ) : (
                    (order.items || []).map((item, idx) => {
                      const area = (parseFloat(item.length) || 0) * (parseFloat(item.width) || 0);
                      return (
                        <div key={idx} className="flex justify-between text-[11px] py-0.5">
                          <div>
                            <div>{idx + 1}. {item.name || 'Gilam'}</div>
                            <div className="text-[10px] text-gray-500">
                              {item.length}m × {item.width}m ({area.toFixed(1)} m²)
                            </div>
                          </div>
                          <div className="font-bold">
                            {Number(item.price || 0).toLocaleString()}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="pt-2 space-y-1">
                  <div className="flex justify-between font-bold text-[11px]">
                    <span>Jami yuzi:</span>
                    <span>{totalArea} m²</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-sm border-t border-black pt-1">
                    <span>JAMI:</span>
                    <span>{totalSum.toLocaleString()} UZS</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-600">
                    <span>To'lov holati:</span>
                    <span>{order.payment_status === 'HANDED_OVER' ? "To'langan" : 'Kutilmoqda'}</span>
                  </div>
                </div>

                <div className="text-center pt-3 text-[10px] text-gray-500 border-t border-dashed border-gray-400 mt-3">
                  <p>Xizmatimizdan foydalanganingiz uchun rahmat!</p>
                  <p className="text-[9px] mt-0.5">Toza va iforli gilamlar kafolati</p>
                </div>
              </div>
            ) : (
              /* Carpet Tags / Birkalar */
              <div className="space-y-4">
                {(order.items || []).length === 0 ? (
                  <div className="text-center py-6 text-gray-500 italic text-[11px]">
                    Buyurtmada birka chiqarish uchun gilamlar kiritilmagan
                  </div>
                ) : (
                  (order.items || []).map((item, idx) => {
                    const area = (parseFloat(item.length) || 0) * (parseFloat(item.width) || 0);
                    return (
                      <div
                        key={idx}
                        className="border-2 border-black p-3 rounded space-y-1.5 bg-white text-black"
                      >
                        <div className="flex justify-between items-center border-b border-black pb-1">
                          <span className="font-extrabold text-xs">{companyName}</span>
                          <span className="text-[10px] font-bold">#{idx + 1}/{(order.items || []).length}</span>
                        </div>
                        <div className="text-center py-1">
                          <div className="text-[9px] uppercase tracking-wider text-gray-600">Buyurtma Raqami</div>
                          <div className="text-xl font-extrabold tracking-widest font-mono">
                            #{order.id?.slice(0, 8).toUpperCase()}
                          </div>
                        </div>
                        <div className="text-[11px] border-t border-dashed border-gray-400 pt-1 space-y-0.5">
                          <div><strong>Mijoz:</strong> {order.client_name}</div>
                          <div><strong>Tel:</strong> {order.client_phone}</div>
                          <div><strong>Turi:</strong> {item.name || 'Gilam'}</div>
                          <div><strong>O'lchami:</strong> {item.length}m × {item.width}m ({area.toFixed(1)} m²)</div>
                        </div>
                        <div className="text-[9px] text-center text-gray-500 pt-1 border-t border-gray-300">
                          Qabul sanasi: {orderDate}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/5 no-print">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white"
          >
            Yopish
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-md cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            {activeTab === 'receipt' ? "Chekni Chop Etish" : "Birkalarni Chop Etish"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptPrintModal;

