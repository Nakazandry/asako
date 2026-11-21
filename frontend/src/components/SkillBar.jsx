export default function SkillBar({ nom, niveau = 0, actions, children }) {
  const value = Math.max(0, Math.min(100, Number(niveau) || 0));

  return (
    <div className="rounded-md border border-[#dce9df] bg-[#f1f8f3]/50 p-3 transition hover:border-[#c1dac7]">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate font-semibold text-[#17362b]">{nom}</p>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full border border-[#b7dec2] bg-white px-2.5 py-0.5 text-xs font-black text-[#147a54]">
            {value}%
          </span>
          {actions}
        </div>
      </div>
      <div
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#e6f3e9]"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={nom}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#1c865d] to-[#0e6041] transition-all duration-300"
          style={{ width: `${value}%` }}
        />
      </div>
      {children}
    </div>
  );
}
