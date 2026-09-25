// Ildizdagi .env dan frontend build uchun kerak bo'lgan qiymatlarni
// frontend-admin/.env.local ga ko'chiradi.
//
// NEGA KERAK: TURN kredensiali brauzerga yetib borishi SHART (WebRTC relay
// uchun), lekin u manba kodda turmasligi kerak - repo ochiq va har commit
// parolni qayta oshkor qilardi. Vite faqat "VITE_" prefiksli qiymatlarni
// bundle'ga qo'shadi, ".env.local" esa gitignore'dagi "*.local" ostida.
//
// Ishlatish:  node scripts/sync-frontend-env.js   (har "npm run build" dan oldin)
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const env = fs.readFileSync(path.join(root, '.env'), 'utf8');
const get = (k) => {
  const m = env.match(new RegExp('^' + k + '=(.*)$', 'm'));
  return m ? m[1].replace(/\r$/, '').trim() : '';
};

const turnUser = get('TURN_USER');
const turnPass = get('TURN_PASSWORD');
const turnHost = get('TURN_HOST') || '192.168.100.11';

if (!turnUser || !turnPass) {
  console.error('XATO: .env faylida TURN_USER yoki TURN_PASSWORD yo\'q.');
  process.exit(1);
}

const out = [
  '# AVTOMATIK GENERATSIYA QILINADI - qo\'lda tahrirlamang.',
  '# Manba: loyiha ildizidagi .env | Yangilash: node scripts/sync-frontend-env.js',
  '# Bu fayl gitignore ostida ("*.local") - commit qilinmaydi.',
  `VITE_TURN_HOST=${turnHost}`,
  `VITE_TURN_USER=${turnUser}`,
  `VITE_TURN_CREDENTIAL=${turnPass}`,
  ''
].join('\n');

const target = path.join(root, 'frontend-admin', '.env.local');
fs.writeFileSync(target, out);
console.log('frontend-admin/.env.local yangilandi (TURN_HOST/USER/CREDENTIAL).');
