import { useState } from "react";
import { Link } from "react-router-dom";
import photo from "../assets/logo.png";

const Documents = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState("Tous");

    const documentsData = [
        {
            id: 3,
            title: "Ordonnance - Traitement hypertension",
            doctor: "Dr. Rousseau",
            date: "20/01/2026",
            size: "120 KB",
            category: "ordonnance",

        }
    ];

    const filteredDocs = documentsData.filter(doc => {
        const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterType === "Tous" || doc.category === filterType.toLowerCase();
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="dashboard-wrapper">
            <header className="dashboard-header">
                <div className="header-left">
                    <img src={photo} width="150" alt="Logo" />
                    <div>
                        <h1 className="logo-title">Hôpital Connect</h1>
                        <p className="logo-subtitle">Plateforme Patient</p>
                    </div>
                </div>

                <nav className="header-navigation">
                    <Link to="/dashboard" className="navigation-link">Tableau de bord</Link>
                    <Link to="/profile" className="navigation-link">👤 Profil</Link>
                    <Link to="/appointments" className="navigation-link">📅 Rendez-vous</Link>
                    <Link to="/documents" className="navigation-link active">📄 Documents</Link>
                    <Link to="/prescriptions" className="navigation-link">💊 Ordonnances</Link>
                    <Link to="/urgence" className="btn-urgence">Urgence</Link>
                    <Link to="/" className="navigation-link">↗ Déconnexion</Link>
                </nav>
            </header>

            <div className="dashboard-content" style={{ padding: '2rem' }}>
                <div className="documents-header-top-pfe">
                    <div className="title-block-pfe">
                        <h2 className="welcome-title">Mes Documents</h2>
                        <p className="welcome-subtitle">Gérez vos documents et images médicales</p>
                    </div>
                </div>

                <div className="documents-search-filter-pfe">
                    <div className="search-section-pfe">
                        <input
                            type="text"
                            placeholder="Rechercher un document..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="filter-section-pfe">

                        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                            <option value="Tous">Tous les types</option>
                            <option value="radiologie">Radiologie</option>
                            <option value="analyse">Analyse</option>
                            <option value="autre">Autres</option>
                        </select>
                        <svg className="chevron-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </div>
                </div>

                <div className="documents-grid-pfe">
                    {filteredDocs.map(doc => (
                        <div key={doc.id} className="document-card-pfe">
                            <div className="doc-card-top-row-pfe">
                                <div className={`doc-icon-box-pfe ${doc.category}`}>
                                    {doc.icon}
                                </div>
                                <span className="doc-category-tag-pfe">{doc.category}</span>
                            </div>

                            <div className="doc-main-info-pfe">
                                <h3 className="doc-title-pfe">{doc.title}</h3>
                                <p className="doc-doctor-pfe">{doc.doctor}</p>
                            </div>

                            <div className="doc-stats-block-pfe">
                                <div className="stat-row-pfe">
                                    <span className="stat-label-pfe">Date</span>
                                    <span className="stat-value-pfe">{doc.date}</span>
                                </div>
                                <div className="stat-row-pfe">
                                    <span className="stat-label-pfe">Taille</span>
                                    <span className="stat-value-pfe">{doc.size}</span>
                                </div>
                            </div>

                            <div className="doc-card-actions-pfe">
                                <button className="btn-card-pfe btn-voir-pfe">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                    Voir
                                </button>
                                <button className="btn-card-pfe btn-telecharger-pfe">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4" />
                                        <polyline points="7 10 12 15 17 10" />
                                        <line x1="12" y1="3" x2="12" y2="15" />
                                    </svg>
                                    Télécharger
                                </button>
                            </div>

                            <button className="btn-delete-link-pfe">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6V20a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                                Supprimer
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Documents;
