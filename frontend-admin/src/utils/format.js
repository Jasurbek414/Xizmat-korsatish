export const formatCurrency = (amount, lang = 'uz') => {
  if (amount === undefined || amount === null) return '';
  const formattedNumber = lang === 'en' 
    ? amount.toLocaleString('en-US')
    : amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  
  const unit = lang === 'en' ? ' UZS' : lang === 'ru' ? ' сум' : ' so\'m';
  return `${formattedNumber}${unit}`;
};

export const formatDate = (dateStr, lang = 'uz') => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  return date.toLocaleDateString(
    lang === 'en' ? 'en-US' : lang === 'ru' ? 'ru-RU' : 'uz-UZ',
    { year: 'numeric', month: '2-digit', day: '2-digit' }
  );
};
