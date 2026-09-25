// Tailwind CSS v4 PostCSS orqali ulanadi (package.json devDependencies'da
// "@tailwindcss/postcss" bor, "@tailwindcss/vite" emas). Uslublar
// `src/index.css` ichidagi `@import "tailwindcss"` orqali kiradi.
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
