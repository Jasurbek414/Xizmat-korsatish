import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import translationUZ from './uz.json';
import translationRU from './ru.json';
import translationEN from './en.json';

const resources = {
  uz: {
    translation: translationUZ
  },
  ru: {
    translation: translationRU
  },
  en: {
    translation: translationEN
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'uz', // default language
    fallbackLng: 'uz',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
