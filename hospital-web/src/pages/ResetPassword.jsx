import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../lib/api";


export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token") || "";
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    const onSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");
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
            setSuccess("Mot de passe mis à jour. Redirection vers la connexion…");
            setTimeout(() => navigate("/login-pro"), 2000);
        } catch (err) {
            setError(err.response?.data?.error || "Impossible de réinitialiser le mot de passe.");
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div
                className="min-h-screen flex items-center justify-center p-6"
                style={{
                    background: "linear-gradient(160deg, #fdfcfa 0%, #f0f9ff 45%, #faf5ff 100%)",
                }}
            >
                <p className="text-indigo-950/80">Lien invalide ou expiré (token manquant).</p>
            </div>
        );
    }

    return (
        <div
            className="min-h-screen flex items-center justify-center p-6"
            style={{
                background: "linear-gradient(160deg, #fdfcfa 0%, #f0f9ff 45%, #faf5ff 100%)",
            }}
        >
            <div className="w-full max-w-md rounded-2xl border border-indigo-200/50 bg-white/95 p-8 shadow-lg shadow-indigo-500/10 backdrop-blur-sm">
                <h1 className="text-xl font-bold text-indigo-950 mb-1">Nouveau mot de passe</h1>
                <p className="text-sm text-indigo-900/55 mb-6">Choisissez un mot de passe d’au moins 8 caractères.</p>
                <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-indigo-950 mb-1">Nouveau mot de passe</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-xl border border-indigo-100 bg-[#fafafa] px-3 py-2.5 text-slate-900 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 outline-none"
                            autoComplete="new-password"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-indigo-950 mb-1">Confirmation</label>
                        <input
                            type="password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            className="w-full rounded-xl border border-indigo-100 bg-[#fafafa] px-3 py-2.5 text-slate-900 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200 outline-none"
                            autoComplete="new-password"
                            required
                        />
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    {success && <p className="text-sm text-emerald-700">{success}</p>}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl bg-gradient-to-r from-sky-400 via-indigo-500 to-violet-400 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-500/25 hover:brightness-105 disabled:opacity-60 transition-all"
                    >
                        {loading ? "Enregistrement…" : "Enregistrer"}
                    </button>
                </form>
            </div>
        </div>
    );
}
