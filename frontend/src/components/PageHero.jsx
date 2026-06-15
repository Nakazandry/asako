import stationeryImage from '../assets/images/sidebar-stationery.webp';

export default function PageHero({ eyebrow, title, description, icon: Icon, actions, stats = [] }) {
  return (
    <section className="relative overflow-hidden rounded-lg border border-[#ead7da] bg-[#2e2430] p-5 text-white shadow-sm sm:p-6">
      <div className="absolute inset-y-0 right-0 hidden w-1/3 opacity-30 md:block">
        <img src={stationeryImage} alt="" className="h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#2e2430] via-[#2e2430]/75 to-transparent" />
      </div>
      <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3">
            {Icon && (
              <span className="grid h-11 w-11 place-items-center rounded-md border border-white/10 bg-white/10 text-[#f7d9dd]">
                <Icon className="text-xl" />
              </span>
            )}
            <p className="text-xs font-bold uppercase tracking-wide text-[#EEC4C9]">{eyebrow}</p>
          </div>
          <h1 className="mt-4 text-2xl font-black leading-tight sm:text-3xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#f8e1e5]/85">{description}</p>
        </div>
        {actions && <div className="relative z-10 flex flex-wrap gap-2">{actions}</div>}
      </div>
      {stats.length > 0 && (
        <div className="relative z-10 mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-md border border-white/10 bg-white/10 p-3 backdrop-blur">
              <p className="text-xs font-semibold text-[#f8e1e5]/75">{stat.label}</p>
              <p className="mt-1 text-2xl font-black text-white">{stat.value ?? 0}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
