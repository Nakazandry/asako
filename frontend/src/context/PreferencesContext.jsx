import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const PreferencesContext = createContext(null);

const defaultPreferences = {
  language: 'fr',
  theme: 'light',
  compactMode: false,
  emailNotifications: true,
};

const readPreferences = () => {
  try {
    const raw = localStorage.getItem('asako_preferences');
    return raw ? { ...defaultPreferences, ...JSON.parse(raw) } : defaultPreferences;
  } catch {
    return defaultPreferences;
  }
};

export const languageOptions = [
  { value: 'fr', label: 'Francais', short: 'FR', description: 'Interface principale en francais.' },
  { value: 'mg', label: 'Malagasy', short: 'MG', description: 'Affichage adapte aux utilisateurs malagasy.' },
  { value: 'en', label: 'English', short: 'EN', description: 'Useful for international teams.' },
];

const translations = {
  fr: {
    'app.subtitle': 'RH & Recrutement',
    'navbar.title': 'ASAKO Recrutement',
    'navbar.subtitle': 'Gestion des candidatures et entretiens',
    'navbar.openMenu': 'Ouvrir le menu',
    'navbar.logout': 'Deconnexion',
    'sidebar.close': 'Fermer le menu',
    'nav.dashboard': 'Dashboard',
    'nav.offers': 'Offres',
    'nav.applications': 'Candidatures',
    'nav.interviews': 'Entretiens',
    'nav.profile': 'Profil',
    'nav.settings': 'Parametres',
    'nav.mySpace': 'Mon espace',
    'common.role': 'Role',
    'common.account': 'Compte',
    'common.language': 'Langue',
    'common.theme': 'Theme',
    'common.light': 'Clair',
    'common.dark': 'Sombre',
    'common.darkMode': 'Mode sombre',
    'common.lightMode': 'Mode clair',
    'profile.eyebrow': 'Identite ASAKO',
    'profile.title': 'Profil',
    'profile.description': 'Consultez les informations principales de votre compte et vos preferences de travail.',
    'profile.userFallback': 'Utilisateur ASAKO',
    'profile.activeTitle': 'Compte actif',
    'profile.activeDescription': 'Votre session est connectee et vos informations sont synchronisees avec ASAKO.',
    'profile.openSettings': 'Ouvrir les parametres',
    'profile.infoTitle': 'Informations du compte',
    'profile.infoDescription': 'Details utilises pour identifier votre profil dans la plateforme.',
    'profile.fullName': 'Nom complet',
    'profile.fullNameHelp': 'Identite affichee dans ASAKO.',
    'profile.emailHelp': 'Adresse de connexion au compte.',
    'profile.roleHelp': 'Droits et acces associes au profil.',
    'profile.created': 'Creation',
    'profile.createdHelp': "Date d'ouverture du compte.",
    'profile.languageHelp': 'Preference active pour votre espace.',
    'profile.themeHelp': "Apparence actuelle de l'interface.",
    'settings.eyebrow': 'Espace personnel',
    'settings.title': 'Parametres',
    'settings.description': "Ajustez la langue, le theme et les preferences d'affichage de votre espace ASAKO.",
    'settings.languageTitle': "Langue de l'interface",
    'settings.languageDescription': 'Choisissez la langue qui vous convient pour votre compte.',
    'settings.language.fr.description': 'Interface principale en francais.',
    'settings.language.mg.description': 'Affichage adapte aux utilisateurs malagasy.',
    'settings.language.en.description': 'Useful for international teams.',
    'settings.appearanceTitle': 'Apparence',
    'settings.appearanceDescription': 'Adaptez ASAKO a votre environnement de travail.',
    'settings.theme.light.description': 'Interface lumineuse pour le travail quotidien.',
    'settings.theme.dark.description': 'Contraste doux pour les longues sessions.',
    'settings.workTitle': 'Preferences de travail',
    'settings.workDescription': 'Quelques reglages simples pour rendre la plateforme plus confortable.',
    'settings.notificationsTitle': 'Notifications email',
    'settings.notificationsDescription': 'Recevoir les alertes importantes sur les candidatures, offres et entretiens.',
    'settings.compactTitle': 'Affichage compact',
    'settings.compactDescription': "Reduire legerement les espacements pour afficher plus d'informations a l'ecran.",
  },
  mg: {
    'app.subtitle': 'HR sy fandraisana mpiasa',
    'navbar.title': 'ASAKO Fandraisana',
    'navbar.subtitle': 'Fitantanana kandidà sy dinidinika',
    'navbar.openMenu': 'Sokafy ny menu',
    'navbar.logout': 'Hivoaka',
    'sidebar.close': 'Hidio ny menu',
    'nav.dashboard': 'Dashboard',
    'nav.offers': 'Tolotra asa',
    'nav.applications': 'Fangatahana',
    'nav.interviews': 'Dinidinika',
    'nav.profile': 'Mombamomba',
    'nav.settings': 'Fikirana',
    'nav.mySpace': 'Espace-ko',
    'common.role': 'Andraikitra',
    'common.account': 'Kaonty',
    'common.language': 'Fiteny',
    'common.theme': 'Endrika',
    'common.light': 'Mazava',
    'common.dark': 'Maizina',
    'common.darkMode': 'Mode maizina',
    'common.lightMode': 'Mode mazava',
    'profile.eyebrow': 'Mombamomba ASAKO',
    'profile.title': 'Mombamomba',
    'profile.description': 'Jereo ny vaovao fototra momba ny kaontinao sy ny safidinao.',
    'profile.userFallback': 'Mpampiasa ASAKO',
    'profile.activeTitle': 'Kaonty mandeha',
    'profile.activeDescription': 'Mifandray ny session-nao ary voatahiry amin ASAKO ny mombamomba anao.',
    'profile.openSettings': 'Sokafy ny fikirana',
    'profile.infoTitle': 'Vaovaon ny kaonty',
    'profile.infoDescription': 'Antsipiriany ampiasaina hamantarana ny profil-nao ato amin ny sehatra.',
    'profile.fullName': 'Anarana feno',
    'profile.fullNameHelp': 'Anarana aseho ato amin ASAKO.',
    'profile.emailHelp': 'Adiresy email hidirana amin ny kaonty.',
    'profile.roleHelp': 'Zo sy fidirana mifanaraka amin ny profil.',
    'profile.created': 'Noforonina',
    'profile.createdHelp': 'Daty nanokafana ny kaonty.',
    'profile.languageHelp': 'Fiteny voafidy ho an ny espace-nao.',
    'profile.themeHelp': 'Endrika ampiasain ny interface.',
    'settings.eyebrow': 'Espace manokana',
    'settings.title': 'Fikirana',
    'settings.description': 'Ovay ny fiteny, endrika ary safidin ny fampisehoana ASAKO.',
    'settings.languageTitle': 'Fitenin ny interface',
    'settings.languageDescription': 'Safidio ny fiteny tianao hampiasaina amin ny kaontinao.',
    'settings.language.fr.description': 'Interface fototra amin ny teny frantsay.',
    'settings.language.mg.description': 'Fampisehoana mifanaraka amin ny mpampiasa malagasy.',
    'settings.language.en.description': 'Mety ho an ny ekipa iraisam-pirenena.',
    'settings.appearanceTitle': 'Endrika',
    'settings.appearanceDescription': 'Ampifanaraho amin ny tontolon ny asanao ny ASAKO.',
    'settings.theme.light.description': 'Interface mazava ho an ny asa isan andro.',
    'settings.theme.dark.description': 'Kontrasta malefaka ho an ny fotoana lava.',
    'settings.workTitle': 'Safidin ny asa',
    'settings.workDescription': 'Fikirana vitsivitsy hanatsarana ny fampiasana ny sehatra.',
    'settings.notificationsTitle': 'Fampahafantarana email',
    'settings.notificationsDescription': 'Handray fampandrenesana lehibe momba fangatahana, tolotra asa ary dinidinika.',
    'settings.compactTitle': 'Fampisehoana compact',
    'settings.compactDescription': 'Ahena kely ny elanelana mba hahitana vaovao bebe kokoa.',
  },
  en: {
    'app.subtitle': 'HR & Recruitment',
    'navbar.title': 'ASAKO Recruitment',
    'navbar.subtitle': 'Applications and interviews management',
    'navbar.openMenu': 'Open menu',
    'navbar.logout': 'Log out',
    'sidebar.close': 'Close menu',
    'nav.dashboard': 'Dashboard',
    'nav.offers': 'Jobs',
    'nav.applications': 'Applications',
    'nav.interviews': 'Interviews',
    'nav.profile': 'Profile',
    'nav.settings': 'Settings',
    'nav.mySpace': 'My space',
    'common.role': 'Role',
    'common.account': 'Account',
    'common.language': 'Language',
    'common.theme': 'Theme',
    'common.light': 'Light',
    'common.dark': 'Dark',
    'common.darkMode': 'Dark mode',
    'common.lightMode': 'Light mode',
    'profile.eyebrow': 'ASAKO Identity',
    'profile.title': 'Profile',
    'profile.description': 'Review your main account information and workspace preferences.',
    'profile.userFallback': 'ASAKO User',
    'profile.activeTitle': 'Active account',
    'profile.activeDescription': 'Your session is connected and your information is synced with ASAKO.',
    'profile.openSettings': 'Open settings',
    'profile.infoTitle': 'Account information',
    'profile.infoDescription': 'Details used to identify your profile across the platform.',
    'profile.fullName': 'Full name',
    'profile.fullNameHelp': 'Identity displayed in ASAKO.',
    'profile.emailHelp': 'Email address used to sign in.',
    'profile.roleHelp': 'Permissions and access linked to this profile.',
    'profile.created': 'Created',
    'profile.createdHelp': 'Account opening date.',
    'profile.languageHelp': 'Active preference for your space.',
    'profile.themeHelp': 'Current interface appearance.',
    'settings.eyebrow': 'Personal space',
    'settings.title': 'Settings',
    'settings.description': 'Adjust language, theme, and display preferences for your ASAKO workspace.',
    'settings.languageTitle': 'Interface language',
    'settings.languageDescription': 'Choose the language you want for your account.',
    'settings.language.fr.description': 'Main interface in French.',
    'settings.language.mg.description': 'Display adapted for Malagasy users.',
    'settings.language.en.description': 'Useful for international teams.',
    'settings.appearanceTitle': 'Appearance',
    'settings.appearanceDescription': 'Adapt ASAKO to your work environment.',
    'settings.theme.light.description': 'Bright interface for everyday work.',
    'settings.theme.dark.description': 'Soft contrast for long sessions.',
    'settings.workTitle': 'Work preferences',
    'settings.workDescription': 'Simple settings to make the platform more comfortable.',
    'settings.notificationsTitle': 'Email notifications',
    'settings.notificationsDescription': 'Receive important alerts about applications, jobs, and interviews.',
    'settings.compactTitle': 'Compact display',
    'settings.compactDescription': 'Slightly reduce spacing to show more information on screen.',
  },
};

export const PreferencesProvider = ({ children }) => {
  const [preferences, setPreferences] = useState(readPreferences);

  useEffect(() => {
    localStorage.setItem('asako_preferences', JSON.stringify(preferences));
    document.documentElement.dataset.theme = preferences.theme;
    document.documentElement.lang = preferences.language;
    document.documentElement.classList.toggle('theme-dark', preferences.theme === 'dark');
    document.documentElement.classList.toggle('theme-compact', preferences.compactMode);
  }, [preferences]);

  const updatePreference = (key, value) => {
    setPreferences((current) => ({ ...current, [key]: value }));
  };

  const t = (key) => translations[preferences.language]?.[key] || translations.fr[key] || key;

  const value = useMemo(() => ({ preferences, updatePreference, t }), [preferences]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
};

export const usePreferences = () => useContext(PreferencesContext);
