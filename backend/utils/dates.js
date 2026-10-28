const isoDay = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  const d = value;
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

const todayIso = () => isoDay(new Date());

const frenchMonths = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

const formatFrDate = (value) => {
  const day = isoDay(value);
  if (!day) return '';
  const [year, month, date] = day.split('-').map(Number);
  if (!year || !month || !date || !frenchMonths[month - 1]) return '';
  return `${date} ${frenchMonths[month - 1]} ${year}`;
};

const formatFrTime = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const match = String(value).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return String(value);
  return `${match[1].padStart(2, '0')}:${match[2]}`;
};

const isPast = (value) => {
  const day = isoDay(value);
  if (!day) return false;
  return day < todayIso();
};

module.exports = { isoDay, todayIso, isPast, formatFrDate, formatFrTime };
