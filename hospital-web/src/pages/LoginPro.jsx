import { Lock, Mail, ShieldCheck, Stethoscope, Users } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo sans bg.png";

const roles = [
  {
    value: "Médecin",
    label: "Médecin",
    icon: Stethoscope,
    activeColor: "border-indigo-400 bg-indigo-50 text-indigo-800 ring-1 ring-indigo-200/60",
    inactiveColor: "border-slate-200/90 bg-white/70 text-slate-600 hover:border-indigo-200 hover:text-indigo-800",
  },
  {
    value: "Administrateur",
    label: "Administrateur",
    icon: ShieldCheck,
    activeColor: "border-violet-400 bg-violet-50 text-violet-800 ring-1 ring-violet-200/60",
    inactiveColor: "border-slate-200/90 bg-white/70 text-slate-600 hover:border-violet-200 hover:text-violet-900",
  },
  {
    value: "Secrétaire",
    label: "Secrétaire",
    icon: Users,
    activeColor: "border-sky-400 bg-sky-50 text-sky-900 ring-1 ring-sky-200/60",
    inactiveColor: "border-slate-200/90 bg-white/70 text-slate-600 hover:border-sky-200 hover:text-sky-900",
  },
];

import api from "../lib/api";

const RoleSelector = ({ role, setRole }) => (
  <div>
    <label className="block text-[14px] font-semibold text-indigo-950 mb-2">
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
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [role, setRole] = useState("Médecin");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const normalizeRole = (rawRole) => {
    const value = String(rawRole || "").toUpperCase().replace(/[-\s]/g, "_");
    if (["DOCTOR", "MEDECIN", "MEDECINNE", "MEDECIN_NNE", "DOCTEUR"].includes(value)) {
      return "Médecin";
    }
    if (["ADMIN", "ADMINISTRATEUR"].includes(value)) {
      return "Administrateur";
    }
    if (["SOUS_ADMIN", "SOUSADMIN", "SUB_ADMIN"].includes(value)) {
      return "Secrétaire";
    }
    return "";
  };

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
        email: formData.email.trim(),
        password: formData.password
      });

      const { token, user } = response.data;
      const mappedRole = normalizeRole(user.role);

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
        navigate("/sous-admin");
      }
    } catch (err) {
      console.error('Login error:', err);
      if (!err.response) {
        setError("Impossible de contacter le serveur. Vérifiez que le backend est bien lancé.");
      } else {
        setError(err.response?.data?.error || "Erreur de connexion au serveur.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    const trimmed = resetEmail.trim();
    if (!trimmed) return;
    setForgotLoading(true);
    setForgotMessage("");
    try {
      await api.post("/auth/forgot-password", { email: trimmed });
      setForgotMessage("Si un compte existe pour cet email, un lien de réinitialisation vient d’être envoyé. Vérifiez aussi les indésirables.");
      setResetEmail("");
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        (err.response ? "Impossible d’envoyer l’email." : "Impossible de contacter le serveur (backend lancé sur le port 4000 ?).");
      setForgotMessage(msg);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-800"
      style={{
        background: "linear-gradient(160deg, #fdfcfa 0%, #f0f9ff 45%, #faf5ff 100%)",
      }}
    >
      <div className="w-full max-w-md space-y-8">

        <div className="flex flex-col items-center">
          <div className="mb-4 flex items-center justify-center w-28 h-28">
            <img src={logo} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-indigo-950 tracking-tight">Hôpital Connect</h1>
          <p className="mt-2 text-[15px] text-indigo-900/60">Accès Professionnel de Santé</p>
        </div>

        <div className="bg-indigo-100/50 p-1 rounded-full flex mx-auto max-w-[340px] ring-1 ring-indigo-200/40">
          <div className="flex-1 py-2 text-[15px] font-medium rounded-full bg-white/95 text-indigo-950 shadow-sm shadow-indigo-500/10 text-center">
            Connexion
          </div>
        </div>

        <div
          className="bg-white/95 px-8 py-8 rounded-2xl border border-indigo-200/45 backdrop-blur-sm"
          style={{ boxShadow: "0 8px 32px rgba(99, 102, 241, 0.1)" }}
        >
          {isForgotPassword ? (
            <>
              <div className="mb-6">
                <h2 className="text-[17px] font-bold text-indigo-950">Mot de passe oublié ?</h2>
                <p className="text-[15px] text-indigo-900/55 mt-1">Entrez votre email pour recevoir un lien de réinitialisation.</p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-5">
                {forgotMessage && (
                  <p className={`text-[14px] rounded-lg px-3 py-2 ${forgotMessage.includes("indésirables") ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
                    {forgotMessage}
                  </p>
                )}
                <div>
                  <label className="block text-[14px] font-semibold text-indigo-950 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <Mail className="h-4 w-4 text-indigo-400" />
                    </div>
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="dr.dupont@hopital.com"
                      className="block w-full rounded-xl border border-indigo-100 py-3 pl-11 text-slate-900 bg-[#fafafa] placeholder:text-slate-500 focus:ring-2 focus:ring-inset focus:ring-indigo-400 sm:text-[15px] transition-all outline-none"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex w-full justify-center rounded-xl bg-gradient-to-r from-sky-400 via-indigo-500 to-violet-400 px-3 py-3.5 text-[15px] font-semibold text-white shadow-md shadow-indigo-500/25 hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 transition-all disabled:opacity-60"
                  >
                    {forgotLoading ? "Envoi en cours…" : "Envoyer le lien de réinitialisation"}
                  </button>
                </div>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotMessage("");
                      setIsForgotPassword(false);
                    }}
                    className="text-[15px] text-indigo-600 hover:text-indigo-800 transition-colors font-medium"
                  >
                    Retour à la connexion
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-[17px] font-bold text-indigo-950">Se connecter</h2>
                <p className="text-[15px] text-indigo-900/55 mt-1">Accédez à votre espace professionnel</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <RoleSelector role={role} setRole={setRole} />

                <div>
                  <label className="block text-[14px] font-semibold text-indigo-950 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <Mail className="h-4 w-4 text-indigo-400" />
                    </div>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="dr.dupont@hopital.com"
                      className="block w-full rounded-xl border border-indigo-100 py-3 pl-11 text-slate-900 bg-[#fafafa] placeholder:text-slate-500 focus:ring-2 focus:ring-inset focus:ring-indigo-400 sm:text-[15px] transition-all outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[14px] font-semibold text-indigo-950 mb-2">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <Lock className="h-4 w-4 text-indigo-400" />
                    </div>
                    <input
                      type="password"
                      name="password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="block w-full rounded-xl border border-indigo-100 py-3 pl-11 text-slate-900 bg-[#fafafa] placeholder:text-slate-500 focus:ring-2 focus:ring-inset focus:ring-indigo-400 sm:text-[15px] transition-all outline-none"
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
                      className="h-4 w-4 rounded border-indigo-200 text-indigo-600 focus:ring-indigo-400 outline-none"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-[15px] text-slate-600 font-medium">
                      Se souvenir de moi
                    </label>
                  </div>

                  <div className="text-[15px]">
                    <button
                      type="button"
                      onClick={() => {
                        setForgotMessage("");
                        setIsForgotPassword(true);
                      }}
                      className="text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
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
                    className={`flex w-full justify-center rounded-xl bg-gradient-to-r from-sky-400 via-indigo-500 to-violet-400 px-3 py-3.5 text-[15px] font-semibold text-white shadow-md shadow-indigo-500/25 hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 transition-all ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {loading ? 'Connexion en cours...' : 'Se connecter'}
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
