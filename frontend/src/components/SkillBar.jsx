export default function SkillBar({ nom, niveau = 0, actions, children }) {
  const value = Math.max(0, Math.min(100, Number(niveau) || 0));

  return (
    <div className="rounded-md border border-[#ead7da] bg-[#fff7f8]/50 p-3 transition hover:border-[#d9b3ba]">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate font-semibold text-[#2e2430]">{nom}</p>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full border border-[#EEC4C9] bg-white px-2.5 py-0.5 text-xs font-black text-[#8f4a56]">
            {value}%
          </span>
          {actions}
        </div>
      </div>
      <div
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#f8e1e5]"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={nom}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#9d5563] to-[#783d47] transition-all duration-300"
          style={{ width: `${value}%` }}
        />
      </div>
      {children}
    </div>
  );
}
