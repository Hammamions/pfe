import { CheckCircle, Eye, EyeOff, KeyRound, Lock, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import logo from "../assets/logo sans bg.png";
import api from "../lib/api";

/* ── Password strength helper ─────────────────────────────────────── */
function getStrength(pwd) {
    if (!pwd) return { level: 0, label: "", color: "" };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (score <= 1) return { level: 1, label: "Faible", color: "#ef4444" };
    if (score <= 3) return { level: 2, label: "Moyen", color: "#f59e0b" };
    return { level: 3, label: "Fort", color: "#10b981" };
}

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token") || "";
    const navigate = useNavigate();

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPwd, setShowPwd] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const strength = getStrength(password);
    const passwordsMatch = confirm.length > 0 && password === confirm;
    const passwordsMismatch = confirm.length > 0 && password !== confirm;

    const onSubmit = async (e) => {
        e.preventDefault();
        setError("");
        if (password.length < 8) {
            setError("Le mot de passe doit contenir au moins 8 caractères.");
            return;
        }
        if (password !== confirm) {
            setError("Les mots de passe ne correspondent pas.");
            return;
        }
        setLoading(true);
        try {
            await api.post("/auth/reset-password", { token, newPassword: password });
            setSuccess(true);
            setTimeout(() => navigate("/login-pro"), 3000);
        } catch (err) {
            setError(err.response?.data?.error || "Impossible de réinitialiser le mot de passe.");
        } finally {
            setLoading(false);
        }
    };

    /* ── Invalid / missing token ─────────────────────────────────── */
    if (!token) {
        return (
            <div
                className="min-h-screen flex items-center justify-center p-6 font-sans"
                style={{ background: "linear-gradient(160deg, #fdfcfa 0%, #f0f9ff 45%, #faf5ff 100%)" }}
            >
                <div className="w-full max-w-md rounded-2xl border border-rose-200/50 bg-white/95 p-8 shadow-lg shadow-rose-500/10 text-center">
                    <ShieldCheck className="mx-auto h-12 w-12 text-rose-400 mb-4" />
                    <h1 className="text-xl font-bold text-rose-700 mb-2">Lien invalide ou expiré</h1>
                    <p className="text-sm text-slate-600 mb-6">
                        Ce lien de réinitialisation est manquant ou a expiré. Veuillez en demander un nouveau.
                    </p>
                    <button
                        onClick={() => navigate("/login-pro")}
                        className="w-full rounded-xl bg-gradient-to-r from-sky-400 via-indigo-500 to-violet-400 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 hover:brightness-105 transition-all"
                    >
                        Retour à la connexion
                    </button>
                </div>
            </div>
        );
    }

    /* ── Success state ───────────────────────────────────────────── */
    if (success) {
        return (
            <div
                className="min-h-screen flex flex-col items-center justify-center p-6 font-sans"
                style={{ background: "linear-gradient(160deg, #fdfcfa 0%, #f0f9ff 45%, #faf5ff 100%)" }}
            >
                <div className="w-full max-w-md rounded-2xl border border-emerald-200/50 bg-white/95 p-10 shadow-lg shadow-emerald-500/10 text-center">
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                        <CheckCircle className="h-9 w-9 text-emerald-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-emerald-700 mb-2">Mot de passe mis à jour !</h1>
                    <p className="text-sm text-slate-600 mb-1">
                        Votre nouveau mot de passe a été enregistré avec succès.
                    </p>
                    <p className="text-xs text-slate-400 mb-6">Redirection vers la connexion dans 3 secondes…</p>

                    {/* Animated progress bar */}
                    <div className="h-1 w-full rounded-full bg-emerald-100 overflow-hidden mb-6">
                        <div
                            className="h-full rounded-full bg-emerald-400"
                            style={{ animation: "progressBar 3s linear forwards" }}
                        />
                    </div>

                    <button
                        onClick={() => navigate("/login-pro")}
                        className="w-full rounded-xl bg-gradient-to-r from-sky-400 via-indigo-500 to-violet-400 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 hover:brightness-105 transition-all"
                    >
                        Se connecter maintenant
                    </button>
                </div>

                <style>{`
                    @keyframes progressBar {
                        from { width: 100%; }
                        to   { width: 0%;   }
                    }
                `}</style>
            </div>
        );
    }

    /* ── Main form ───────────────────────────────────────────────── */
    return (
        <div
            className="min-h-screen flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-800"
            style={{ background: "linear-gradient(160deg, #fdfcfa 0%, #f0f9ff 45%, #faf5ff 100%)" }}
        >
            <div className="w-full max-w-md space-y-8">

                {/* Logo + brand */}
                <div className="flex flex-col items-center">
                    <div className="mb-4 flex items-center justify-center w-28 h-28">
                        <img src={logo} alt="Logo TuniSanté" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="text-3xl font-bold text-indigo-950 tracking-tight">TuniSanté</h1>
                    <p className="mt-2 text-[15px] text-indigo-900/60">Réinitialisation du mot de passe</p>
                </div>

                {/* Card */}
                <div
                    className="bg-white/95 px-8 py-8 rounded-2xl border border-indigo-200/45 backdrop-blur-sm"
                    style={{ boxShadow: "0 8px 32px rgba(99, 102, 241, 0.1)" }}
                >
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
                            <KeyRound className="h-4 w-4 text-indigo-500" />
                        </div>
                        <div>
                            <h2 className="text-[17px] font-bold text-indigo-950">Nouveau mot de passe</h2>
                            <p className="text-[13px] text-indigo-900/55">Choisissez un mot de passe d'au moins 8 caractères.</p>
                        </div>
                    </div>

                    <form onSubmit={onSubmit} className="space-y-5">

                        {/* Password field */}
                        <div>
                            <label className="block text-[14px] font-semibold text-indigo-950 mb-2">
                                Nouveau mot de passe
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                                    <Lock className="h-4 w-4 text-indigo-400" />
                                </div>
                                <input
                                    type={showPwd ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                                    placeholder="••••••••"
                                    className="block w-full rounded-xl border border-indigo-100 py-3 pl-11 pr-11 text-slate-900 bg-[#fafafa] placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-400 sm:text-[15px] transition-all outline-none"
                                    autoComplete="new-password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPwd((v) => !v)}
                                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-indigo-500 transition-colors"
                                >
                                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>

                            {/* Strength bar */}
                            {password.length > 0 && (
                                <div className="mt-2">
                                    <div className="flex gap-1 mb-1">
                                        {[1, 2, 3].map((n) => (
                                            <div
                                                key={n}
                                                className="h-1.5 flex-1 rounded-full transition-all duration-300"
                                                style={{
                                                    backgroundColor: strength.level >= n ? strength.color : "#e2e8f0"
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-[12px] font-medium" style={{ color: strength.color }}>
                                        Force : {strength.label}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Confirm field */}
                        <div>
                            <label className="block text-[14px] font-semibold text-indigo-950 mb-2">
                                Confirmer le mot de passe
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                                    <Lock
                                        className="h-4 w-4 transition-colors"
                                        style={{ color: passwordsMismatch ? "#ef4444" : passwordsMatch ? "#10b981" : "#a5b4fc" }}
                                    />
                                </div>
                                <input
                                    type={showConfirm ? "text" : "password"}
                                    value={confirm}
                                    onChange={(e) => { setConfirm(e.target.value); setError(""); }}
                                    placeholder="••••••••"
                                    className="block w-full rounded-xl border py-3 pl-11 pr-11 text-slate-900 bg-[#fafafa] placeholder:text-slate-400 sm:text-[15px] transition-all outline-none focus:ring-2 focus:ring-inset"
                                    style={{
                                        borderColor: passwordsMismatch ? "#fca5a5" : passwordsMatch ? "#6ee7b7" : "#e0e7ff",
                                        "--tw-ring-color": passwordsMismatch ? "#fca5a5" : "#818cf8"
                                    }}
                                    autoComplete="new-password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm((v) => !v)}
                                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-indigo-500 transition-colors"
                                >
                                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            {passwordsMatch && (
                                <p className="mt-1.5 text-[12px] font-medium text-emerald-600 flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3" /> Les mots de passe correspondent
                                </p>
                            )}
                            {passwordsMismatch && (
                                <p className="mt-1.5 text-[12px] font-medium text-red-500">
                                    Les mots de passe ne correspondent pas
                                </p>
                            )}
                        </div>

                        {/* Error banner */}
                        {error && (
                            <div className="bg-rose-50 border border-rose-100 text-rose-700 px-4 py-3 rounded-xl text-sm font-medium">
                                {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full justify-center rounded-xl bg-gradient-to-r from-sky-400 via-indigo-500 to-violet-400 px-3 py-3.5 text-[15px] font-semibold text-white shadow-md shadow-indigo-500/25 hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 transition-all disabled:opacity-60"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                    </svg>
                                    Enregistrement…
                                </span>
                            ) : "Enregistrer le nouveau mot de passe"}
                        </button>

                        {/* Back link */}
                        <div className="text-center pt-1">
                            <button
                                type="button"
                                onClick={() => navigate("/login-pro")}
                                className="text-[14px] text-indigo-600 hover:text-indigo-800 transition-colors font-medium"
                            >
                                ← Retour à la connexion
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
