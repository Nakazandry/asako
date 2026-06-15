export default function StatCard({ icon: Icon, label, value, tone = 'blue' }) {
  const tones = {
    blue: 'bg-[#f8e1e5] text-[#8f4a56]',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-[#fff0f2] text-[#a04252]',
  };

  return (
    <div className="panel p-5 transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(46,36,48,0.08)]">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#7a6670]">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-[#2e2430]">{value ?? 0}</p>
        </div>
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-md ${tones[tone]}`}>
          <Icon className="text-xl" />
        </span>
      </div>
    </div>
  );
}
