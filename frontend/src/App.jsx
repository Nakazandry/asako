import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import AppLayout from './components/AppLayout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Offres from './pages/Offres.jsx';
import Candidatures from './pages/Candidatures.jsx';
import Entretiens from './pages/Entretiens.jsx';
import Profil from './pages/Profil.jsx';
import MonEspace from './pages/MonEspace.jsx';
import Parametres from './pages/Parametres.jsx';

const Protected = ({ children, role }) => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role && user?.role !== role) return <Navigate to={user?.role === 'admin' ? '/dashboard' : '/mon-espace'} replace />;
  return children;
};

export default function App() {
  const { user } = useAuth();
  const home = user?.role === 'admin' ? '/dashboard' : '/mon-espace';

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<Protected><AppLayout /></Protected>}>
        <Route path="/" element={<Navigate to={home} replace />} />
        <Route path="/dashboard" element={<Protected role="admin"><Dashboard /></Protected>} />
        <Route path="/offres" element={<Offres />} />
        <Route path="/candidatures" element={<Protected role="admin"><Candidatures /></Protected>} />
        <Route path="/entretiens" element={<Entretiens />} />
        <Route path="/profil" element={<Profil />} />
        <Route path="/parametres" element={<Parametres />} />
        <Route path="/parametre" element={<Parametres />} />
        <Route path="/mon-espace" element={<Protected role="candidat"><MonEspace /></Protected>} />
      </Route>
      <Route path="*" element={<Navigate to={home || '/login'} replace />} />
    </Routes>
  );
}
