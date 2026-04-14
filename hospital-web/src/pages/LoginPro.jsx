import { Lock, Mail, ShieldCheck, Stethoscope, Users } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo sans bg.png";

const roles = [
  {
    value: "Médecin",
    label: "Médecin",
    icon: Stethoscope,
    activeColor: "border-blue-600 bg-blue-50 text-blue-700",
    inactiveColor: "border-slate-200 bg-[#F1F5F9] text-slate-500 hover:border-slate-300 hover:text-slate-700",
  },
  {
    value: "Administrateur",
    label: "Administrateur",
    icon: ShieldCheck,
    activeColor: "border-purple-600 bg-purple-50 text-purple-700",
    inactiveColor: "border-slate-200 bg-[#F1F5F9] text-slate-500 hover:border-slate-300 hover:text-slate-700",
  },
  {
    value: "Sous-Administrateur",
    label: "Sous-Admin",
    icon: Users,
    activeColor: "border-emerald-600 bg-emerald-50 text-emerald-700",
    inactiveColor: "border-slate-200 bg-[#F1F5F9] text-slate-500 hover:border-slate-300 hover:text-slate-700",
  },
];

import api from "../lib/api";

const RoleSelector = ({ role, setRole }) => (
  <div>
    <label className="block text-[14px] font-semibold text-slate-900 mb-2">
      Je suis
    </label>
    <div className="grid grid-cols-3 gap-2">
      {roles.map(({ value, label, icon: Icon, activeColor, inactiveColor }) => (
        <button
          key={value}
          type="button"
          onClick={() => setRole(value)}
          className={`flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all duration-200 font-semibold text-[13px] ${role === value ? activeColor : inactiveColor
            }`}
        >
          <Icon className="h-5 w-5" />
          {label}
        </button>
      ))}
    </div>
  </div>
);

const LoginPro = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("connexion");
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [role, setRole] = useState("Médecin");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.post('/auth/login', {
        email: formData.email,
        password: formData.password
      });

      const { token, user } = response.data;


      const mappedRole = (user.role === 'DOCTOR' || user.role === 'MEDECIN') ? 'Médecin' :
        user.role === 'ADMIN' ? 'Administrateur' :
          user.role === 'SOUS_ADMIN' ? 'Sous-Administrateur' : '';

      if (mappedRole !== role) {
        setError(`Ce compte n'est pas associé au rôle ${role}.`);
        setLoading(false);
        return;
      }

      sessionStorage.setItem('proToken', token);
      sessionStorage.setItem('proUser', JSON.stringify(user));

      if (user.role === "DOCTOR" || user.role === "MEDECIN") {
        navigate("/doctor/dashboard");
      } else if (user.role === "ADMIN") {
        navigate("/admin/dashboard");
      } else if (user.role === "SOUS_ADMIN") {
        navigate("/sous-admin/dashboard");
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || "Erreur de connexion au serveur.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let apiRole = 'MEDECIN';
      if (role === 'Administrateur') apiRole = 'ADMIN';
      if (role === 'Sous-Administrateur') apiRole = 'SOUS_ADMIN';

      const response = await api.post('/auth/register', {
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        role: apiRole,
      });

      const { token, user } = response.data;

      sessionStorage.setItem('proToken', token);
      sessionStorage.setItem('proUser', JSON.stringify(user));

      if (user.role === "DOCTOR" || user.role === "MEDECIN") {
        navigate("/doctor/dashboard");
      } else if (user.role === "ADMIN") {
        navigate("/admin/dashboard");
      } else if (user.role === "SOUS_ADMIN") {
        navigate("/sous-admin/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Erreur lors de la création du compte.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    if (resetEmail) {
      alert(`Un email de réinitialisation a été envoyé à ${resetEmail}`);
      setIsForgotPassword(false);
      setResetEmail("");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-800" style={{ backgroundColor: '#F8FAFC' }}>
      <div className="w-full max-w-md space-y-8">

        <div className="flex flex-col items-center">
          <div className="mb-4 flex items-center justify-center w-28 h-28">
            <img src={logo} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Hôpital Connect</h1>
          <p className="mt-2 text-[15px] text-slate-500">Accès Professionnel de Santé</p>
        </div>

        <div className="bg-[#E2E8F0]/60 p-1 rounded-full flex mx-auto max-w-[340px]">
          <button
            onClick={() => setActiveTab("connexion")}
            className={`flex-1 py-2 text-[15px] font-medium rounded-full transition-all duration-200 ${activeTab === "connexion"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
              }`}
          >
            Connexion
          </button>
          <button
            onClick={() => setActiveTab("inscription")}
            className={`flex-1 py-2 text-[15px] font-medium rounded-full transition-all duration-200 ${activeTab === "inscription"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
              }`}
          >
            Inscription
          </button>
        </div>

        <div className="bg-white px-8 py-8 rounded-2xl border border-slate-100/60" style={{ boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)' }}>
          {isForgotPassword ? (
            <>
              <div className="mb-6">
                <h2 className="text-[17px] font-bold text-slate-900">Mot de passe oublié ?</h2>
                <p className="text-[15px] text-slate-500 mt-1">Entrez votre email pour recevoir un lien de réinitialisation.</p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div>
                  <label className="block text-[14px] font-semibold text-slate-900 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <Mail className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="dr.dupont@hopital.com"
                      className="block w-full rounded-xl border-0 py-3 pl-11 text-slate-900 bg-[#F1F5F9] placeholder:text-slate-500 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-[15px] transition-all outline-none"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    className="flex w-full justify-center rounded-xl bg-[#030712] px-3 py-3.5 text-[15px] font-semibold text-white shadow-sm hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 transition-colors"
                  >
                    Envoyer le lien de réinitialisation
                  </button>
                </div>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(false)}
                    className="text-[15px] text-blue-500 hover:text-blue-600 transition-colors font-medium"
                  >
                    Retour à la connexion
                  </button>
                </div>
              </form>
            </>
          ) : activeTab === "connexion" ? (
            <>
              <div className="mb-6">
                <h2 className="text-[17px] font-bold text-slate-900">Se connecter</h2>
                <p className="text-[15px] text-slate-500 mt-1">Accédez à votre espace professionnel</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <RoleSelector role={role} setRole={setRole} />

                <div>
                  <label className="block text-[14px] font-semibold text-slate-900 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <Mail className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="dr.dupont@hopital.com"
                      className="block w-full rounded-xl border-0 py-3 pl-11 text-slate-900 bg-[#F1F5F9] placeholder:text-slate-500 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-[15px] transition-all outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[14px] font-semibold text-slate-900 mb-2">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <Lock className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="password"
                      name="password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="block w-full rounded-xl border-0 py-3 pl-11 text-slate-900 bg-[#F1F5F9] placeholder:text-slate-500 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-[15px] transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 pb-2">
                  <div className="flex items-center">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 outline-none"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-[15px] text-slate-600 font-medium">
                      Se souvenir de moi
                    </label>
                  </div>

                  <div className="text-[15px]">
                    <button type="button" onClick={() => setIsForgotPassword(true)} className="text-blue-500 hover:text-blue-600 transition-colors">
                      Mot de passe oublié ?
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-rose-50 border border-rose-100 text-rose-700 px-4 py-3 rounded-xl text-sm font-bold animate-shake">
                    {error}
                  </div>
                )}

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className={`flex w-full justify-center rounded-xl bg-[#030712] px-3 py-3.5 text-[15px] font-semibold text-white shadow-sm hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {loading ? 'Connexion en cours...' : 'Se connecter'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-[17px] font-bold text-slate-900">Créer un compte professionnel</h2>
                <p className="text-[15px] text-slate-500 mt-1">Rejoignez le réseau Hôpital Connect</p>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <RoleSelector role={role} setRole={setRole} />

                <div>
                  <label className="block text-[14px] font-semibold text-slate-900 mb-2">
                    Nom complet (Dr. ...)
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="votre nom et prénom"
                    className="block w-full rounded-xl border-0 py-3 px-4 text-slate-900 bg-[#F1F5F9] placeholder:text-slate-500 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-[15px] transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[14px] font-semibold text-slate-900 mb-2">
                    Email Professionnel
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <Mail className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="dr.dupont@hopital.com"
                      className="block w-full rounded-xl border-0 py-3 pl-11 text-slate-900 bg-[#F1F5F9] placeholder:text-slate-500 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-[15px] transition-all outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[14px] font-semibold text-slate-900 mb-2">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <Lock className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="password"
                      name="password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="block w-full rounded-xl border-0 py-3 pl-11 text-slate-900 bg-[#F1F5F9] placeholder:text-slate-500 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-[15px] transition-all outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[14px] font-semibold text-slate-900 mb-2">
                    Confirmer le mot de passe
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <Lock className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="password"
                      name="confirmPassword"
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="block w-full rounded-xl border-0 py-3 pl-11 text-slate-900 bg-[#F1F5F9] placeholder:text-slate-500 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-[15px] transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="flex w-full justify-center rounded-xl bg-[#030712] px-3 py-3.5 text-[15px] font-semibold text-white shadow-sm hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 transition-colors"
                  >
                    S'inscrire
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPro;
