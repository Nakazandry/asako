export default function StatCard({ icon: Icon, label, value, tone = 'blue' }) {
  const tones = {
    blue: { tile: 'from-[#e6f3e9] to-[#b7dec2] text-[#147a54]', bar: 'from-[#b7dec2] to-[#147a54]' },
    emerald: { tile: 'from-emerald-50 to-emerald-100 text-emerald-700', bar: 'from-emerald-300 to-emerald-600' },
    amber: { tile: 'from-amber-50 to-amber-100 text-amber-700', bar: 'from-amber-300 to-amber-500' },
    rose: { tile: 'from-[#f5faf6] to-[#deefe2] text-[#256f4d]', bar: 'from-[#9dcdaa] to-[#256f4d]' },
  };
  const selected = tones[tone] || tones.blue;

  return (
    <div className="panel panel-hover relative overflow-hidden p-5">
      <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${selected.bar} opacity-70`} />
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#60756b]">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-[#17362b]" style={{ fontVariantNumeric: 'tabular-nums' }}>{value ?? 0}</p>
        </div>
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${selected.tile} shadow-inner ring-1 ring-white/60`}>
          <Icon className="text-xl" />
        </span>
      </div>
    </div>
  );
}
