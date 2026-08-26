export default function StatCard({ icon: Icon, label, value, tone = 'blue' }) {
  const tones = {
    blue: { tile: 'from-[#f8e1e5] to-[#eec4c9] text-[#8f4a56]', bar: 'from-[#eec4c9] to-[#8f4a56]' },
    emerald: { tile: 'from-emerald-50 to-emerald-100 text-emerald-700', bar: 'from-emerald-300 to-emerald-600' },
    amber: { tile: 'from-amber-50 to-amber-100 text-amber-700', bar: 'from-amber-300 to-amber-500' },
    rose: { tile: 'from-[#fff0f2] to-[#fbdfe3] text-[#a04252]', bar: 'from-[#f3c4cb] to-[#a04252]' },
  };
  const selected = tones[tone] || tones.blue;

  return (
    <div className="panel panel-hover relative overflow-hidden p-5">
      <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${selected.bar} opacity-70`} />
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#7a6670]">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-[#2e2430]" style={{ fontVariantNumeric: 'tabular-nums' }}>{value ?? 0}</p>
        </div>
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${selected.tile} shadow-inner ring-1 ring-white/60`}>
          <Icon className="text-xl" />
        </span>
      </div>
    </div>
  );
}
