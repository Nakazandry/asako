export default function AlertMessage({ type = 'info', children }) {
  const styles = {
    info: 'border-[#ead7da] bg-[#fff7f8] text-[#8f4a56]',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    error: 'border-rose-200 bg-rose-50 text-rose-800',
  };
  return <div className={`rounded-md border px-4 py-3 text-sm font-semibold shadow-sm ${styles[type]}`}>{children}</div>;
}
