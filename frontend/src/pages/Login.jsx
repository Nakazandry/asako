import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiEye, FiEyeOff, FiLock, FiMail } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import authImage from '../assets/images/auth-workspace.webp';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', mot_de_passe: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const user = await login(form);
      toast.success('Connexion réussie');
      navigate(user.role === 'admin' ? '/dashboard' : '/mon-espace');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Connexion impossible');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fbfdfb] p-4 lg:p-8">
      <section className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-6xl overflow-hidden rounded-3xl border border-[#dce9df] bg-white shadow-[0_24px_70px_-35px_rgba(27,65,41,0.28)] lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[1.15fr_0.85fr]">
        <div className="relative hidden min-h-full lg:block">
          <img src={authImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/5 to-white/75" />
          <div className="absolute bottom-8 left-8 max-w-sm">
            <p className="text-sm font-bold uppercase tracking-wide text-[#147a54]">Recrutement organisé</p>
            <h2 className="mt-2 text-4xl font-black leading-tight text-[#17362b]">Dossiers, talents et entretiens au même endroit.</h2>
          </div>
        </div>
        <div className="flex items-center px-5 py-8 sm:px-8">
          <div className="w-full">
            <div className="mb-7">
              <div className="flex items-center gap-3">
                <img src="/akdigital.jpeg" alt="AK Digital Service" className="h-12 w-24 object-contain" />
                <div>
                  <p className="text-2xl font-black text-[#147a54]">ASAKO</p>
                  <p className="text-xs font-bold uppercase tracking-wide text-[#60756b]">Recrutement</p>
                </div>
              </div>
              <h1 className="mt-6 text-2xl font-black text-[#17362b]">Connexion</h1>
              <p className="mt-1 text-sm text-[#60756b]">Accédez à votre espace recrutement.</p>
            </div>
            <form className="space-y-4" onSubmit={submit}>
              <label className="block">
                <span className="label">Email</span>
                <div className="mt-1 flex items-center gap-2 rounded-xl border border-[#dce9df] bg-white px-3 focus-within:border-[#83bd94] focus-within:ring-4 focus-within:ring-[#b7dec2]/35">
                  <FiMail className="text-[#6b9f7a]" />
                  <input className="w-full border-0 bg-transparent py-2.5 text-sm outline-none" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
              </label>
              <label className="block">
                <span className="label">Mot de passe</span>
                <div className="mt-1 flex items-center gap-2 rounded-xl border border-[#dce9df] bg-white px-3 focus-within:border-[#83bd94] focus-within:ring-4 focus-within:ring-[#b7dec2]/35">
                  <FiLock className="text-[#6b9f7a]" />
                  <input className="w-full border-0 bg-transparent py-2.5 text-sm outline-none" type={showPassword ? 'text' : 'password'} required value={form.mot_de_passe} onChange={(e) => setForm({ ...form, mot_de_passe: e.target.value })} />
                  <button type="button" tabIndex={-1} aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} onClick={() => setShowPassword(!showPassword)} className="p-1 text-[#6b9f7a] transition hover:text-[#147a54]">
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </label>
              <button className="btn-primary w-full" disabled={loading}>{loading ? 'Connexion...' : 'Se connecter'}</button>
            </form>
            <p className="mt-5 text-center text-sm text-[#60756b]">
              Nouveau candidat ? <Link className="font-semibold text-[#147a54]" to="/register">Créer un compte</Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
