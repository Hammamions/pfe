import { Link } from "react-router-dom";
import photo from "../../assets/logo.png";
import { useAppointments } from "../../context/AppointmentContext.jsx";

const Dashboard = () => {
    const { appointments } = useAppointments();
    const userName = "";

    const stats = [
        { label: "Rendez-vous à venir", value: appointments.length.toString(), bgColor: "#dbeafe" },
        { label: "Ordonnances actives", value: "2", bgColor: "#dcfce7" },
        { label: "Documents", value: "12", bgColor: "#f3e8ff" },
        { label: "Notifications", value: "3", bgColor: "#fef3c7" },
    ];

    // Show only first 2 for dashboard preview
    const displayAppointments = appointments.slice(0, 2);

    const prescriptions = [

    ];

    const notifications = [

    ];

    return (
        <div className="dashboard-wrapper">

            <header className="dashboard-header">
                <div className="header-left">
                    <img src={photo} width="150" />
                    <div>
                        <h1 className="logo-title">Hôpital Connect</h1>
                        <p className="logo-subtitle">Plateforme Patient</p>
                    </div>
                </div>

                <nav className="header-navigation">
                    <Link to="/dashboard" className="navigation-link active">
                        Tableau de bord
                    </Link>
                    <Link to="/profile" className="navigation-link">
                        👤 Profile
                    </Link>
                    <Link to="/appointments" className="navigation-link">
                        📅 Rendez-vous
                    </Link>
                    <Link to="/documents" className="navigation-link">
                        📄 Documents
                    </Link>
                    <Link to="/prescriptions" className="navigation-link">
                        💊 Ordonnances
                    </Link>

                    <Link to="/urgence" className="btn-urgence">
                        Urgence
                    </Link>

                    <Link to="/" className="navigation-link">
                        ↗ Déconnexion
                    </Link>

                </nav>
            </header >

            <div className="dashboard-content">
                <main className="main-content-area">

                    <div className="welcome-section">
                        <h2 className="welcome-title">Bonjour, {userName} </h2>
                        <p className="welcome-subtitle">
                            Bienvenue sur votre tableau de bord patient
                        </p>
                    </div>
                    <div className="stats-grid">
                        {stats.map((stat, index) => (
                            <div
                                key={index}
                                className="stat-card"
                                style={{ backgroundColor: stat.bgColor }}
                            >
                                <div className="stat-header">
                                    <span className="stat-label">{stat.label}</span>
                                </div>
                                <div className="stat-value">{stat.value}</div>
                            </div>
                        ))}
                    </div>


                    <div className="section-card">
                        <div className="section-header">
                            <h3 className="section-title">Prochains rendez-vous</h3>
                            <p className="section-subtitle">  Vos consultations à venir</p>
                            <Link to="/appointments" className="section-link">
                                Voir tout →
                            </Link>
                        </div>

                        <div className="appointments-list">
                            {displayAppointments.map((apt, index) => (
                                <div key={index} className="appointment-card">
                                    <div className="appointment-date">
                                        <span className="day">{apt.date}</span>
                                        <span className="month">{apt.month}</span>
                                    </div>
                                    <div className="appointment-info">
                                        <h4 className="doctor-name">{apt.doctor}</h4>
                                        <p className="specialty">{apt.specialty}</p>
                                        <div className="appointment-meta">
                                            <span className="meta-item">
                                                {apt.time}
                                            </span>
                                            <span className="meta-item">
                                                {apt.location}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="appointment-status">
                                        <span className="status-badge">{apt.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Link to="/appointments" className="btn-new-apt">
                            Prendre un nouveau rendez-vous
                        </Link>
                    </div>

                    <div className="section-card" style={{ marginTop: '2rem' }}>
                        <div className="section-header">
                            <h3 className="section-title">Ordonnances actives</h3>
                            <Link to="/prescriptions" className="section-link">
                                Voir tout →
                            </Link>
                        </div>
                        <div className="prescriptions-list">
                            {prescriptions.map((presc, idx) => (
                                <div key={idx} className="appointment-card" style={{ padding: '1.5rem' }}>
                                    <div style={{ flex: 1 }}>
                                        <h4 className="doctor-name">{presc.doctor}</h4>
                                        <div style={{ marginTop: '0.5rem' }}>
                                            {presc.meds.map((med, mIdx) => (
                                                <p key={mIdx} style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.25rem' }}>{med}</p>
                                            ))}
                                        </div>
                                    </div>
                                    <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                                        {presc.date}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>

                <aside className="notifications-sidebar">
                    <div className="sidebar-header">
                        <h3 className="sidebar-title">Notifications</h3>
                        <p className="sidebar-subtitle">Mises à jour récentes</p>
                    </div>
                    <div className="notifications-list">
                        {notifications.map((notif, index) => (
                            <div
                                key={index}
                                className={`notification-item ${notif.type}`}
                            >
                                <h4 className="notif-title">{notif.title}</h4>
                                <span className="notif-time">{notif.time}</span>
                            </div>
                        ))}
                    </div>

                    <div className="section-card" style={{ marginTop: '2rem', padding: '1.5rem' }}>
                        <h3 className="sidebar-title" style={{ marginBottom: '1rem' }}>Actions rapides</h3>
                        <div className="quick-actions">
                            <Link to="/appointments" className="navigation-link">
                                Nouveau rendez-vous
                            </Link>
                            <Link to="/documents" className="navigation-link">
                                Mes documents
                            </Link>

                            <Link to="/urgence" className="btn-urgence">
                                Urgence
                            </Link>
                        </div>
                    </div>

                    <div className="section-card" style={{ marginTop: '2rem', padding: '1.5rem' }}>
                        <h3 className="sidebar-title" style={{ marginBottom: '1rem' }}>Résumé santé</h3>
                        <div className="health-summary">
                            <div className="summary-row">
                                <span>Groupe sanguin</span>
                                <span className="summary-value">O+</span>
                            </div>
                            <div className="summary-row">
                                <span>Allergies</span>
                                <span className="summary-value">2</span>
                            </div>
                            <div className="summary-row">
                                <span>Antécédents</span>
                                <span className="summary-value">2</span>
                            </div>
                            <div className="view-complete">
                                <Link to="/profile" className="section-link" style={{ fontSize: '0.8125rem' }}>
                                    Voir le profil complet →
                                </Link>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </div >
    );
};

export default Dashboard;
