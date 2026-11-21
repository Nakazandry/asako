export default function AlertMessage({ type = 'info', children }) {
  const styles = {
    info: 'border-[#dce9df] bg-[#f1f8f3] text-[#147a54]',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    error: 'border-rose-200 bg-rose-50 text-rose-800',
  };
  return <div className={`rounded-md border px-4 py-3 text-sm font-semibold shadow-sm ${styles[type]}`}>{children}</div>;
}
