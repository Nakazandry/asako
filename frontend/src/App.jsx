import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import AppLayout from './components/AppLayout.jsx';
import LandingPage from './pages/LandingPage.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Offres from './pages/Offres.jsx';
import Candidatures from './pages/Candidatures.jsx';
import Entretiens from './pages/Entretiens.jsx';
import Notifications from './pages/Notifications.jsx';
import Profil from './pages/Profil.jsx';
import MonEspace from './pages/MonEspace.jsx';
import InvitationEntretien from './pages/InvitationEntretien.jsx';
import Parametres from './pages/Parametres.jsx';

const Protected = ({ children, role }) => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role && user?.role !== role) return <Navigate to={user?.role === 'admin' ? '/dashboard' : '/mon-espace'} replace />;
  return children;
};

const OffersLayout = () => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <AppLayout /> : <Outlet />;
};

export default function App() {
  const { user } = useAuth();
  const home = user?.role === 'admin' ? '/dashboard' : '/mon-espace';

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to={home} replace /> : <LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/offres" element={<OffersLayout />}>
        <Route index element={<Offres />} />
      </Route>
      <Route element={<Protected><AppLayout /></Protected>}>
        <Route path="/dashboard" element={<Protected role="admin"><Dashboard /></Protected>} />
        <Route path="/candidatures" element={<Protected role="admin"><Candidatures /></Protected>} />
        <Route path="/entretiens" element={<Entretiens />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profil" element={<Profil />} />
        <Route path="/parametres" element={<Parametres />} />
        <Route path="/parametre" element={<Parametres />} />
        <Route path="/mon-espace" element={<Protected role="candidat"><MonEspace /></Protected>} />
        <Route path="/invitations/:id" element={<Protected role="candidat"><InvitationEntretien /></Protected>} />
      </Route>
      <Route path="*" element={<Navigate to={user ? home : '/'} replace />} />
    </Routes>
  );
}
