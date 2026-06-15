import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import authImage from '../assets/images/auth-workspace.webp';
import logoImage from '../assets/images/asako-logo-ui.png';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', mot_de_passe: '' });
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success('Compte cree');
      navigate('/mon-espace');
    } catch (error) {
      const message = error.response?.data?.message
        || 'API indisponible. Verifiez que le backend tourne sur le port 5000.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fbf7f8] p-4 lg:p-8">
      <section className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-6xl overflow-hidden rounded-lg border border-[#ead7da] bg-white shadow-2xl lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative hidden min-h-full lg:block">
          <img src={authImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-white/10 to-white/80" />
          <div className="absolute bottom-8 left-8 max-w-md">
            <p className="text-sm font-bold uppercase tracking-wide text-[#8f4a56]">Espace candidat</p>
            <h2 className="mt-2 text-4xl font-black leading-tight text-[#2e2430]">Suivez vos candidatures avec clarte.</h2>
          </div>
        </div>
        <div className="flex items-center px-5 py-8 sm:px-8">
          <div className="w-full">
            <div className="flex items-center gap-3">
              <img src={logoImage} alt="ASAKO" className="h-12 w-12 rounded-md object-cover" />
              <div>
                <p className="text-2xl font-black text-[#8f4a56]">ASAKO</p>
                <p className="text-xs font-bold uppercase tracking-wide text-[#7a6670]">Espace candidat</p>
              </div>
            </div>
            <h1 className="mt-6 text-2xl font-black text-[#2e2430]">Inscription candidat</h1>
            <p className="mt-1 text-sm text-[#7a6670]">Créez votre compte pour suivre vos candidatures.</p>
            <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={submit}>
              <label className="block">
                <span className="label">Nom</span>
                <input className="input mt-1" required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
              </label>
              <label className="block">
                <span className="label">Prenom</span>
                <input className="input mt-1" required value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
              </label>
              <label className="block sm:col-span-2">
                <span className="label">Email</span>
                <input className="input mt-1" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </label>
              <label className="block sm:col-span-2">
                <span className="label">Mot de passe</span>
                <input className="input mt-1" type="password" required minLength="6" value={form.mot_de_passe} onChange={(e) => setForm({ ...form, mot_de_passe: e.target.value })} />
              </label>
              <button className="btn-primary sm:col-span-2" disabled={loading}>{loading ? 'Creation...' : 'Creer mon compte'}</button>
            </form>
            <p className="mt-5 text-center text-sm text-[#7a6670]">
              Deja inscrit ? <Link className="font-semibold text-[#8f4a56]" to="/login">Se connecter</Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
