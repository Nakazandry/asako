export default function Loader({ label = 'Chargement...' }) {
  return (
    <div className="grid min-h-44 place-items-center">
      <div className="flex items-center gap-3 rounded-md border border-[#ead7da] bg-white px-4 py-3 text-sm font-semibold text-[#7a6670] shadow-sm">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#f8e1e5] border-t-[#8f4a56]" />
        {label}
      </div>
    </div>
  );
}
