import stationeryImage from '../assets/images/sidebar-stationery.webp';

export default function PageHero({ eyebrow, title, description, icon: Icon, actions, stats = [] }) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#3a2d3f] via-[#2e2430] to-[#231b28] p-5 text-white shadow-[0_20px_50px_-20px_rgba(46,36,48,0.55)] sm:p-6 animate-fade-up">
      <div className="pointer-events-none absolute -left-16 -top-24 h-64 w-64 rounded-full bg-[#EEC4C9]/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 right-1/4 h-56 w-56 rounded-full bg-[#8f4a56]/30 blur-3xl" />
      <div className="absolute inset-y-0 right-0 hidden w-1/3 opacity-25 md:block">
        <img src={stationeryImage} alt="" className="h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#2e2430] via-[#2e2430]/75 to-transparent" />
      </div>
      <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3">
            {Icon && (
              <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/10 text-[#f7d9dd] shadow-inner backdrop-blur">
                <Icon className="text-xl" />
              </span>
            )}
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#EEC4C9]">{eyebrow}</p>
          </div>
          <h1 className="mt-4 text-2xl font-extrabold leading-tight sm:text-3xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#f8e1e5]/80">{description}</p>
        </div>
        {actions && <div className="relative z-10 flex flex-wrap gap-2">{actions}</div>}
      </div>
      {stats.length > 0 && (
        <div className="relative z-10 mt-6 grid divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-white/[0.07] backdrop-blur-md sm:grid-cols-2 sm:divide-x xl:grid-cols-4 sm:divide-y-0">
          {stats.map((stat) => (
            <div key={stat.label} className="p-3.5 transition hover:bg-white/[0.06]">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#f8e1e5]/70">{stat.label}</p>
              <p className="mt-1 text-2xl font-extrabold text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>{stat.value ?? 0}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
