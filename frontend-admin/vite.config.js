import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// MUHIM: bu fayl (index.html va postcss.config.js bilan birga) loyihaning
// ushbu nusxasida YETISHMAYOTGAN edi - faqat oldindan qurilgan `dist/` bor
// edi (Dockerfile.core ham aynan shuni ko'chiradi). Ya'ni admin panelning
// manba kodiga o'zgartirish kiritish MUMKIN, lekin uni qurib bo'lmasdi.
// Sozlamalar standart Vite + React: `dist/index.html` dagi asset yo'llari
// "/assets/..." ko'rinishida, ya'ni base = "/" (standart), alohida alias
// yoki maxsus chiqish papkasi ishlatilmagan.
export default defineConfig({
  plugins: [react()],
})
