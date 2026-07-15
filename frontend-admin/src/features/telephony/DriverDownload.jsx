import React from 'react';
import { Download, Terminal } from 'lucide-react';

const DriverDownload = () => {
  return (
    <div className="glass-card p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/5 shadow-sm space-y-4">
      <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-2 font-['Outfit']">
        <Terminal className="w-4 h-4 text-indigo-500" /> Drayver Sozlamalari
      </h3>
      
      <p className="text-[10px] text-slate-500 dark:text-gray-400 leading-relaxed">
        Uztelecom SIP orqali brauzerdan ulanib gaplashish uchun kompyuterga maxsus drayver o'rnatilishi lozim. Bu fonda jimgina ishlovchi signallarni o'zgartirib beruvchi ko'prikdir.
      </p>
      
      {/* Real Download Button */}
      <a 
        href="/telephony-driver.zip" 
        download="telephony-driver.zip"
        className="w-full bg-indigo-600 hover:bg-indigo-750 text-white py-2 px-4 rounded-xl text-center font-bold text-[11px] transition flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-indigo-500/10"
      >
        <Download className="w-4 h-4" /> Drayverni Yuklab Olish (ZIP)
      </a>

      <div className="bg-slate-50 dark:bg-white/2 rounded-xl p-3 border border-slate-100 dark:border-white/5 space-y-2">
        <span className="font-bold text-slate-750 dark:text-gray-300 block text-[9px] uppercase tracking-wider">O'rnatish yo'riqnomasi:</span>
        <ol className="list-decimal list-inside text-[9px] text-slate-500 dark:text-gray-400 space-y-1">
          <li>Yuklab olingan arxivni papkaga oching.</li>
          <li>PowerShell terminalida <code className="font-mono text-indigo-500 bg-slate-100 dark:bg-black/35 px-1 py-0.5 rounded">.\install_driver.bat</code> skriptini ishga tushiring.</li>
          <li>Drayverni fonda ishga tushirish uchun <code className="font-mono text-indigo-500 bg-slate-100 dark:bg-black/35 px-1 py-0.5 rounded">start_hidden.vbs</code> faylini bosing.</li>
        </ol>
      </div>
    </div>
  );
};

export default DriverDownload;
