import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiArrowRight,
  FiArrowUpRight,
  FiBell,
  FiBriefcase,
  FiCalendar,
  FiCheck,
  FiFileText,
  FiMenu,
  FiMessageCircle,
  FiSearch,
  FiTarget,
  FiUsers,
  FiX,
  FiZap,
} from 'react-icons/fi';
import recruitmentImage from '../assets/images/auth-workspace.webp';
import api from '../services/api';
import './landing-page.css';

const features = [
  {
    icon: FiSearch,
    title: 'Offres à portée de main',
    description: 'Parcourez les opportunités et trouvez celles qui correspondent à votre projet.',
  },
  {
    icon: FiFileText,
    title: 'Candidatures organisées',
    description: 'Déposez votre CV et gardez vos démarches réunies au même endroit.',
  },
  {
    icon: FiTarget,
    title: 'Suivi clair',
    description: 'Retrouvez l’avancement de vos candidatures et les prochaines étapes.',
  },
  {
    icon: FiCalendar,
    title: 'Entretiens planifiés',
    description: 'Consultez vos rendez-vous et les informations utiles pour vos échanges.',
  },
  {
    icon: FiBell,
    title: 'Notifications utiles',
    description: 'Restez informé des nouvelles concernant votre recrutement.',
  },
  {
    icon: FiMessageCircle,
    title: 'Assistant conversationnel',
    description: 'Échangez avec l’assistant IA intégré à votre espace Asako.',
  },
];

const candidateBenefits = [
  'Consultez les offres et leurs détails',
  'Postulez avec votre CV et votre lettre de motivation',
  'Complétez votre profil et vos compétences',
  'Suivez vos candidatures et vos entretiens',
];

const recruiterBenefits = [
  'Publiez et gérez vos offres d’emploi',
  'Centralisez les candidatures reçues',
  'Consultez les profils et les compétences',
  'Organisez les entretiens et leurs invitations',
];

function BenefitList({ items }) {
  return (
    <ul className="landing-benefits">
      {items.map((item) => (
        <li key={item}>
          <span className="landing-check"><FiCheck aria-hidden="true" /></span>
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [offersTotal, setOffersTotal] = useState(null);
  const [offersUnavailable, setOffersUnavailable] = useState(false);

  useEffect(() => {
    let active = true;

    api.get('/offres', { params: { limit: 1 } })
      .then(({ data }) => {
        const total = Number(data?.meta?.total);
        if (!Number.isFinite(total)) {
          throw new Error('La réponse des offres ne contient pas de total valide.');
        }
        if (active) setOffersTotal(total);
      })
      .catch((error) => {
        console.error('[ASAKO] Impossible de charger le nombre réel d’offres.', error);
        if (active) setOffersUnavailable(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-header-inner">
          <Link className="landing-brand" to="/" aria-label="Asako, accueil" onClick={closeMenu}>
            <img src="/akdigital.jpeg" alt="AK Digital Service" />
            <span>ASAKO</span>
          </Link>

          <button
            type="button"
            className="landing-menu-toggle"
            aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={menuOpen}
            aria-controls="landing-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <FiX /> : <FiMenu />}
          </button>

          <nav id="landing-navigation" className={`landing-navigation${menuOpen ? ' is-open' : ''}`}>
            <a href="#accueil" onClick={closeMenu}>Accueil</a>
            <a href="#fonctionnalites" onClick={closeMenu}>Fonctionnalités</a>
            <a href="#apropos" onClick={closeMenu}>À propos</a>
            <a href="#contact" onClick={closeMenu}>Contact</a>
            <div className="landing-nav-actions">
              <Link className="landing-login-link" to="/login" onClick={closeMenu}>Se connecter</Link>
              <Link className="landing-button landing-button-small" to="/register" onClick={closeMenu}>S’inscrire</Link>
            </div>
          </nav>
        </div>
      </header>

      <main>
        <section className="landing-hero landing-container" id="accueil">
          <div className="landing-hero-copy">
            <span className="landing-eyebrow"><span /> Le recrutement, plus humain</span>
            <h1>Trouvez les opportunités qui correspondent à <span>votre talent.</span></h1>
            <p>
              Asako rapproche candidats et recruteurs dans un espace simple pour découvrir des offres,
              suivre les candidatures et organiser les entretiens.
            </p>
            <div className="landing-hero-actions">
              <Link className="landing-button" to="/offres">
                Découvrir les offres <FiArrowRight aria-hidden="true" />
              </Link>
              <Link className="landing-button landing-button-outline" to="/register">
                Commencer maintenant
              </Link>
            </div>
            <div className="landing-hero-note">
              <span className="landing-note-icon"><FiUsers aria-hidden="true" /></span>
              <span>Un espace pensé pour les candidats et les équipes de recrutement.</span>
            </div>
          </div>

          <div className="landing-hero-visual">
            <div className="landing-hero-image-wrap">
              <img
                src={recruitmentImage}
                alt="CV et documents de candidature disposés sur un bureau lumineux"
                fetchPriority="high"
              />
              <div className="landing-image-shade" />
              <div className="landing-image-caption">
                <span className="landing-caption-icon"><FiBriefcase aria-hidden="true" /></span>
                <span><strong>Le bon parcours commence ici</strong><small>Recrutement et talents réunis</small></span>
              </div>
            </div>
            <div className="landing-visual-orbit landing-visual-orbit-one" />
            <div className="landing-visual-orbit landing-visual-orbit-two" />
            <div className="landing-floating-card">
              <span className="landing-floating-icon"><FiCheck aria-hidden="true" /></span>
              <span><strong>Un parcours plus clair</strong><small>De l’offre à l’entretien</small></span>
            </div>
          </div>
        </section>

        <section className="landing-stats landing-container" aria-label="Statistiques Asako">
          <div className="landing-stats-card">
            <div className="landing-stat">
              <span className="landing-stat-icon"><FiBriefcase aria-hidden="true" /></span>
              <div>
                <span className="landing-stat-value">
                  {offersTotal === null ? (offersUnavailable ? '—' : '…') : new Intl.NumberFormat('fr-FR').format(offersTotal)}
                </span>
                <span className="landing-stat-label">offres publiées</span>
              </div>
            </div>
            <p>
              {offersUnavailable
                ? 'Le nombre d’offres est temporairement indisponible.'
                : 'Nombre actuel issu directement des offres enregistrées sur Asako.'}
            </p>
          </div>
        </section>

        <section className="landing-section landing-container" id="fonctionnalites">
          <div className="landing-section-heading">
            <span className="landing-eyebrow">Une plateforme, un parcours complet</span>
            <h2>Tout le recrutement, <span>au même endroit.</span></h2>
            <p>Les outils essentiels pour avancer à chaque étape, côté candidat comme côté recruteur.</p>
          </div>
          <div className="landing-feature-grid">
            {features.map(({ icon: Icon, title, description }, index) => (
              <article className="landing-feature-card" key={title} style={{ '--card-index': index }}>
                <span className="landing-feature-icon"><Icon aria-hidden="true" /></span>
                <h3>{title}</h3>
                <p>{description}</p>
                <span className="landing-feature-arrow" aria-hidden="true"><FiArrowUpRight /></span>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-audience-section" id="apropos">
          <div className="landing-container">
            <div className="landing-section-heading">
              <span className="landing-eyebrow">Conçu pour chaque talent</span>
              <h2>Un recrutement plus fluide, <span>pour tous.</span></h2>
              <p>Chaque profil dispose d’un espace adapté à ses besoins et à son rôle.</p>
            </div>
            <div className="landing-audience-grid">
              <article className="landing-audience-card landing-candidate-card">
                <div className="landing-audience-art">
                  <span className="landing-art-document"><FiFileText aria-hidden="true" /></span>
                  <span className="landing-art-search"><FiSearch aria-hidden="true" /></span>
                  <span className="landing-art-check"><FiCheck aria-hidden="true" /></span>
                </div>
                <div className="landing-audience-content">
                  <span className="landing-card-kicker">Côté candidat</span>
                  <h3>Faites avancer votre projet professionnel.</h3>
                  <p>Retrouvez vos démarches et gardez une vue claire sur chaque opportunité.</p>
                  <BenefitList items={candidateBenefits} />
                  <Link className="landing-text-link" to="/register">Créer mon compte <FiArrowRight aria-hidden="true" /></Link>
                </div>
              </article>

              <article className="landing-audience-card landing-recruiter-card">
                <div className="landing-audience-art">
                  <span className="landing-art-person landing-art-person-one"><FiUsers aria-hidden="true" /></span>
                  <span className="landing-art-person landing-art-person-two"><FiFileText aria-hidden="true" /></span>
                  <span className="landing-art-check"><FiCheck aria-hidden="true" /></span>
                </div>
                <div className="landing-audience-content">
                  <span className="landing-card-kicker">Côté recruteur</span>
                  <h3>Recrutez avec méthode et sérénité.</h3>
                  <p>Centralisez les informations utiles pour piloter votre sélection et vos échanges.</p>
                  <BenefitList items={recruiterBenefits} />
                  <Link className="landing-text-link" to="/login">Accéder à mon espace <FiArrowRight aria-hidden="true" /></Link>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="landing-ai-section landing-container" id="assistant">
          <div className="landing-ai-visual" aria-hidden="true">
            <div className="landing-ai-orbit landing-ai-orbit-one" />
            <div className="landing-ai-orbit landing-ai-orbit-two" />
            <div className="landing-ai-core"><FiZap /></div>
            <div className="landing-ai-bubble landing-ai-bubble-left"><FiFileText /><span>Profil candidat</span></div>
            <div className="landing-ai-bubble landing-ai-bubble-right"><FiMessageCircle /><span>Assistant Asako</span></div>
            <div className="landing-ai-dots"><i /><i /><i /></div>
          </div>
          <div className="landing-ai-copy">
            <span className="landing-eyebrow">L’intelligence au service du lien</span>
            <h2>Un assistant IA pour <span>mieux avancer.</span></h2>
            <p>
              L’assistant conversationnel d’Asako accompagne les candidats dans leurs échanges
              et aide les recruteurs à repérer les points forts et les compétences à développer
              dans les candidatures.
            </p>
            <Link className="landing-text-link" to="/register">Découvrir Asako <FiArrowRight aria-hidden="true" /></Link>
          </div>
        </section>

        <section className="landing-cta landing-container" id="contact">
          <div className="landing-cta-content">
            <span className="landing-cta-mark"><FiUsers aria-hidden="true" /></span>
            <span className="landing-eyebrow">Prêt à passer à la suite ?</span>
            <h2>Prêt à simplifier votre processus de recrutement&nbsp;?</h2>
            <p>Créez votre espace Asako et retrouvez les outils adaptés à votre parcours.</p>
            <div className="landing-hero-actions">
              <Link className="landing-button landing-button-white" to="/register">Créer un compte <FiArrowRight aria-hidden="true" /></Link>
              <Link className="landing-cta-login" to="/login">Se connecter</Link>
            </div>
          </div>
          <div className="landing-cta-decoration" aria-hidden="true"><FiBriefcase /></div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-container">
          <div className="landing-footer-main">
            <div className="landing-footer-brand">
              <Link className="landing-brand" to="/" aria-label="Asako, accueil">
                <img src="/akdigital.jpeg" alt="AK Digital Service" />
                <span>ASAKO</span>
              </Link>
              <p>La plateforme qui rapproche les talents et les opportunités de recrutement.</p>
            </div>
            <div className="landing-footer-links">
              <div>
                <h3>Navigation</h3>
                <a href="#accueil">Accueil</a>
                <a href="#fonctionnalites">Fonctionnalités</a>
                <a href="#apropos">À propos</a>
              </div>
              <div>
                <h3>Votre espace</h3>
                <Link to="/offres">Consulter les offres</Link>
                <Link to="/login">Se connecter</Link>
                <Link to="/register">S’inscrire</Link>
              </div>
              <div id="mentions-legales">
                <h3>Contact & informations</h3>
                <a href="#contact">Nous contacter</a>
                <p className="landing-legal-note">Les coordonnées de contact et mentions légales sont à compléter par l’éditeur avant publication.</p>
              </div>
            </div>
          </div>
          <div className="landing-footer-bottom">
            <span>© {new Date().getFullYear()} ASAKO. Tous droits réservés.</span>
            <a href="#mentions-legales">Mentions légales</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
