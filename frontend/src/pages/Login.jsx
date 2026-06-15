import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiLock, FiMail } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import authImage from '../assets/images/auth-workspace.webp';
import logoImage from '../assets/images/asako-logo-ui.png';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', mot_de_passe: '' });
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const user = await login(form);
      toast.success('Connexion reussie');
      navigate(user.role === 'admin' ? '/dashboard' : '/mon-espace');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Connexion impossible');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fbf7f8] p-4 lg:p-8">
      <section className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-6xl overflow-hidden rounded-lg border border-[#ead7da] bg-white shadow-2xl lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[1.15fr_0.85fr]">
        <div className="relative hidden min-h-full lg:block">
          <img src={authImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/5 to-white/75" />
          <div className="absolute bottom-8 left-8 max-w-sm">
            <p className="text-sm font-bold uppercase tracking-wide text-[#8f4a56]">Recrutement organise</p>
            <h2 className="mt-2 text-4xl font-black leading-tight text-[#2e2430]">Dossiers, talents et entretiens au meme endroit.</h2>
          </div>
        </div>
        <div className="flex items-center px-5 py-8 sm:px-8">
          <div className="w-full">
            <div className="mb-7">
              <div className="flex items-center gap-3">
                <img src={logoImage} alt="ASAKO" className="h-12 w-12 rounded-md object-cover" />
                <div>
                  <p className="text-2xl font-black text-[#8f4a56]">ASAKO</p>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#7a6670]">Recrutement</p>
                </div>
              </div>
              <h1 className="mt-6 text-2xl font-black text-[#2e2430]">Connexion</h1>
              <p className="mt-1 text-sm text-[#7a6670]">Accédez à votre espace recrutement.</p>
            </div>
            <form className="space-y-4" onSubmit={submit}>
              <label className="block">
                <span className="label">Email</span>
                <div className="mt-1 flex items-center gap-2 rounded-md border border-[#ead7da] bg-white px-3 focus-within:ring-2 focus-within:ring-[#EEC4C9]">
                  <FiMail className="text-[#b4868f]" />
                  <input className="w-full border-0 py-2 text-sm outline-none" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
              </label>
              <label className="block">
                <span className="label">Mot de passe</span>
                <div className="mt-1 flex items-center gap-2 rounded-md border border-[#ead7da] bg-white px-3 focus-within:ring-2 focus-within:ring-[#EEC4C9]">
                  <FiLock className="text-[#b4868f]" />
                  <input className="w-full border-0 py-2 text-sm outline-none" type="password" required value={form.mot_de_passe} onChange={(e) => setForm({ ...form, mot_de_passe: e.target.value })} />
                </div>
              </label>
              <button className="btn-primary w-full" disabled={loading}>{loading ? 'Connexion...' : 'Se connecter'}</button>
            </form>
            <p className="mt-5 text-center text-sm text-[#7a6670]">
              Nouveau candidat ? <Link className="font-semibold text-[#8f4a56]" to="/register">Creer un compte</Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
