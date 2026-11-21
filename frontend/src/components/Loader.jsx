export default function Loader({ label = 'Chargement...' }) {
  return (
    <div className="panel grid min-h-44 place-items-center animate-fade-up">
      <div className="flex items-center gap-3 text-sm font-semibold text-[#60756b]">
        <span className="relative grid place-items-center">
          <span className="absolute h-8 w-8 animate-ping rounded-full bg-[#b7dec2]/40" />
          <span className="h-6 w-6 animate-spin rounded-full border-[3px] border-[#e6f3e9] border-t-[#147a54]" />
        </span>
        {label}
      </div>
    </div>
  );
}
