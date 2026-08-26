const isoDay = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  const d = value;
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

const todayIso = () => isoDay(new Date());

const isPast = (value) => {
  const day = isoDay(value);
  if (!day) return false;
  return day < todayIso();
};

module.exports = { isoDay, todayIso, isPast };
