import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import photo from "../assets/logo sans bg.png";

const Login = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("connexion");
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = (e) => {
    e.preventDefault();
    navigate("/dashboard");
  };

  const handleRegister = (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Les mots de passe ne correspondent pas.");
      return;
    }
    navigate("/dashboard");
  };

  return (
    <div className="auth-page">
      <div className="auth-container-center">
        <div className="auth-logo">
          <img src={photo} className="auth-logo-image" width={200} height={200} />
          <h1 className="auth-brand">TuniSanté</h1>
          <p className="auth-tagline">Votre santé, simplifiée</p>
        </div>
        <div className="auth-tabs">
          <button
            className={`auth-tab ${activeTab === "connexion" ? "active" : ""}`}
            onClick={() => setActiveTab("connexion")}
          >
            Connexion
          </button>
          <button
            className={`auth-tab ${activeTab === "inscription" ? "active" : ""}`}
            onClick={() => setActiveTab("inscription")}
          >
            Inscription
          </button>
        </div>
        <div className="auth-card-modern">
          {activeTab === "connexion" ? (
            <>
              <div className="auth-card-header">
                <h2 className="auth-card-title">Se connecter</h2>
                <p className="auth-card-subtitle">
                  Accédez à votre espace patient
                </p>
              </div>

              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    name="email"
                    className="form-input-modern"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="votre e-mail"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Mot de passe</label>
                  <input
                    type="password"
                    name="password"
                    className="form-input-modern"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div className="form-row-between">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>Se souvenir de moi</span>
                  </label>
                  <Link to="/forgot-password" className="link-primary">
                    Mot de passe oublié ?
                  </Link>
                </div>

                <button type="submit" className="btn-primary-modern">
                  Se connecter
                </button>
              </form>

              <p className="auth-footer-text">
                En vous connectant, vous acceptez nos{" "}
                <Link to="/terms" className="link-primary">
                  conditions d'utilisation
                </Link>
              </p>
            </>
          ) : (
            <>
              <div className="auth-card-header">
                <h2 className="auth-card-title">Créer un compte</h2>
                <p className="auth-card-subtitle">
                  Rejoignez TuniSanté
                </p>
              </div>

              <form onSubmit={handleRegister}>
                <div className="form-group">
                  <label className="form-label">Nom complet</label>
                  <input
                    type="text"
                    name="fullName"
                    className="form-input-modern"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="votre nom et prenom"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    name="email"
                    className="form-input-modern"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="votre e-mail"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Mot de passe</label>
                  <input
                    type="password"
                    name="password"
                    className="form-input-modern"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Confirmer le mot de passe</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    className="form-input-modern"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                  />
                </div>

                <button type="submit" className="btn-primary-modern">
                  S'inscrire
                </button>
              </form>

              <p className="auth-footer-text">
                En vous inscrivant, vous acceptez nos{" "}
                <Link to="/terms" className="link-primary">
                  conditions d'utilisation
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
