export default function Loader({ label = 'Chargement...' }) {
  return (
    <div className="panel grid min-h-44 place-items-center animate-fade-up">
      <div className="flex items-center gap-3 text-sm font-semibold text-[#7a6670]">
        <span className="relative grid place-items-center">
          <span className="absolute h-8 w-8 animate-ping rounded-full bg-[#EEC4C9]/40" />
          <span className="h-6 w-6 animate-spin rounded-full border-[3px] border-[#f8e1e5] border-t-[#8f4a56]" />
        </span>
        {label}
      </div>
    </div>
  );
}
