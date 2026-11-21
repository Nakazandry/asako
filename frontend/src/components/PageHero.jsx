export default function PageHero({ eyebrow, title, description, icon: Icon, actions, stats = [] }) {
  return (
    <section className="page-hero animate-fade-up">
      <div className="page-hero-heading">
        <div className="page-hero-copy">
          <div className="page-hero-eyebrow">
            {Icon && <span className="page-hero-icon"><Icon aria-hidden="true" /></span>}
            <p>{eyebrow}</p>
          </div>
          <h1>{title}</h1>
          <p className="page-hero-description">{description}</p>
        </div>
        {actions && <div className="page-hero-actions">{actions}</div>}
      </div>
      {stats.length > 0 && (
        <div className="page-hero-stats">
          {stats.map((stat) => (
            <div className="page-hero-stat" key={stat.label}>
              <p>{stat.label}</p>
              <span>{stat.value ?? 0}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
