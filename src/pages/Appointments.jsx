import { useState } from "react";
import { Link } from "react-router-dom";
import photo from "../assets/logo.png";
import { useAppointments } from "../context/AppointmentContext.jsx";

const Appointments = () => {
    const {
        appointments, setAppointments,
        history, setHistory,
        requests, setRequests
    } = useAppointments();

    const [view, setView] = useState('list');
    const [activeTab, setActiveTab] = useState('upcoming');
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        specialty: "",
        doctor: "",
        date: "",
        time: "",
        motif: "",
        files: []
    });

    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);

    const specialties = [
        { id: 'cardio', name: 'Cardiologie' },
        { id: 'dermato', name: 'Dermatologie' },
        { id: 'general', name: 'Généraliste' },
        { id: 'gynéco', name: 'Gynécologie' },
        { id: 'ophtalmo', name: 'Ophtalmologie' },
        { id: 'ortho', name: 'Orthopédie' },
        { id: 'pédiatrie', name: 'Pédiatrie' },
        { id: 'rhumato', name: 'Rhumatologie' },
        { id: 'urologie', name: 'Urologie' },
    ];

    const [isActionSent, setIsActionSent] = useState(false);

    const currentAppointments = activeTab === 'upcoming'
        ? appointments
        : activeTab === 'history'
            ? history
            : requests;

    const handleConfirm = () => {
        const newRequest = {
            id: Date.now(),
            doctor: "En attente",
            specialty: formData.specialty,
            date: "",
            month: "",
            time: "En attente de confirmation",
            location: "",
            motif: formData.motif,
            status: "en_attente"
        };
        setRequests([...requests, newRequest]);
        setView('list');
        setActiveTab('requests');
        setStep(1);
        setFormData({ specialty: "", doctor: "", date: "", time: "", motif: "", files: [] });
    };

    const handleAction = (type) => {

        setAppointments(appointments.filter(apt => apt.id !== selectedAppointment.id));

        const newRequest = {
            ...selectedAppointment,
            status: 'en_attente',
            id: Date.now()
        };
        setRequests([...requests, newRequest]);

        setIsActionSent(true);
        setTimeout(() => {
            setIsActionSent(false);
            setShowDetailModal(false);
            setActiveTab('requests');
        }, 2000);
    };

    const handleDeleteHistory = (id) => {
        setHistory(history.filter(h => h.id !== id));
        setShowDetailModal(false);
    };

    const handleOpenCancel = (apt) => {
        setShowDetailModal(false);
        setSelectedAppointment(apt);
        setShowCancelModal(true);
    };

    if (view === 'new') {
        return (
            <div className="dashboard-wrapper">
                <header className="dashboard-header">
                    <div className="header-left">
                        <img src={photo} width="150" alt="logo" />
                        <div>
                            <h1 className="logo-title">Hôpital Connect</h1>
                            <p className="logo-subtitle">Plateforme Patient</p>
                        </div>
                    </div>
                    <nav className="header-navigation">
                        <Link to="/dashboard" className="navigation-link">Tableau de bord</Link>
                        <Link to="/profile" className="navigation-link">👤 Profile</Link>
                        <Link to="/appointments" className="navigation-link active">📅 Rendez-vous</Link>
                        <Link to="/documents" className="navigation-link">📄 Documents</Link>
                        <Link to="/prescriptions" className="navigation-link">💊 Ordonnances</Link>

                        <Link to="/urgence" className="btn-urgence">Urgence</Link>
                        <Link to="/" className="navigation-link">↗ Déconnexion</Link>
                    </nav>
                </header>

                <main className="dashboard-content-pfe">
                    <div className="new-apt-container">
                        <div className="back-btn-pfe" onClick={() => { setView('list'); setStep(1); }}>
                            <span className="arrow-left">←</span> Retour
                        </div>

                        <div className="new-apt-title-sec">
                            <h2 className="title-large-pfe">Nouveau rendez-vous</h2>
                            <p className="subtitle-pfe">Prenez rendez-vous </p>
                        </div>

                        <div className="stepper-pfe">
                            <div className={`step-circle ${step >= 1 ? 'active' : ''}`}>1</div>
                            <div className="step-line"></div>
                            <div className={`step-circle ${step >= 2 ? 'active' : ''}`}>2</div>
                            <div className="step-line"></div>
                            <div className={`step-circle ${step >= 3 ? 'active' : ''}`}>3</div>
                        </div>

                        <div className="booking-card-pfe">
                            {step === 1 && (
                                <>
                                    <div className="card-header-pfe">
                                        <div>
                                            <h3 className="card-title-pfe">Choisir une specialité</h3>

                                        </div>
                                    </div>

                                    <div className="form-content-pfe">
                                        <div className="field-group-pfe">
                                            <label>Spécialité médicale</label>
                                            <select
                                                className="select-pfe"
                                                value={formData.specialty}
                                                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                                            >
                                                <option value="">Sélectionnez une spécialité</option>
                                                {specialties.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                            </select>
                                        </div>

                                    </div>

                                    <button
                                        className={`btn-primary-pfe ${(!formData.specialty) ? 'disabled' : ''}`}
                                        onClick={() => setStep(2)}
                                        disabled={!formData.specialty}
                                    >
                                        Continuer
                                    </button>
                                </>
                            )}

                            {step === 2 && (
                                <>
                                    <div className="card-header-pfe">
                                        <div>
                                            <h3 className="card-title-pfe">Motif de consultation</h3>
                                            <p className="card-subtitle-pfe">Expliquez la raison de votre rendez-vous</p>
                                        </div>
                                    </div>

                                    <div className="form-content-pfe">
                                        <div className="field-group-pfe">
                                            <label>Motif</label>
                                            <textarea
                                                className="select-pfe"
                                                placeholder="Symptômes, contrôle, etc."
                                                value={formData.motif}
                                                onChange={(e) => setFormData({ ...formData, motif: e.target.value })}
                                                style={{ minHeight: '120px', resize: 'vertical' }}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <button className="btn-white-pfe" onClick={() => setStep(1)} style={{ flex: 1 }}>Retour</button>
                                        <button
                                            className={`btn-primary-pfe ${!formData.motif ? 'disabled' : ''}`}
                                            onClick={() => setStep(3)}
                                            style={{ flex: 2 }}
                                            disabled={!formData.motif}
                                        >
                                            Continuer
                                        </button>
                                    </div>
                                </>
                            )}

                            {step === 3 && (
                                <>
                                    <div className="card-header-pfe">
                                        <div>
                                            <h3 className="card-title-pfe">Documents médicaux</h3>
                                            <p className="card-subtitle-pfe">Téléchargez vos fichiers si nécessaire</p>
                                        </div>
                                    </div>

                                    <div className="form-content-pfe">
                                        <div className="field-group-pfe">
                                            <label>Fichiers (facultatif)</label>
                                            <div style={{ border: '2px dashed #e2e8f0', padding: '2rem', borderRadius: '12px', textAlign: 'center' }}>
                                                <input
                                                    type="file"
                                                    multiple
                                                    id="pfe-upload"
                                                    style={{ display: 'none' }}
                                                    onChange={(e) => setFormData({ ...formData, files: [...formData.files, ...e.target.files] })}
                                                />
                                                <label htmlFor="pfe-upload" style={{ cursor: 'pointer', color: '#64748b' }}>
                                                    Cliquez pour ajouter des fichiers
                                                </label>
                                                {formData.files.length > 0 && (
                                                    <div style={{ marginTop: '1rem', fontWeight: 600 }}>
                                                        {formData.files.length} fichiers sélectionnés
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <button className="btn-white-pfe" onClick={() => setStep(2)} style={{ flex: 1 }}>Retour</button>
                                        <button
                                            className="btn-primary-pfe"
                                            onClick={handleConfirm}
                                            style={{ flex: 2 }}
                                        >
                                            Confirmer
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="dashboard-wrapper">
            <header className="dashboard-header">
                <div className="header-left">
                    <img src={photo} width="150" alt="logo" />
                    <div>
                        <h1 className="logo-title">Hôpital Connect</h1>
                        <p className="logo-subtitle">Plateforme Patient</p>
                    </div>
                </div>

                <nav className="header-navigation">
                    <Link to="/dashboard" className="navigation-link">Tableau de bord</Link>
                    <Link to="/profile" className="navigation-link">👤 Profile</Link>
                    <Link to="/appointments" className="navigation-link active">📅 Rendez-vous</Link>
                    <Link to="/documents" className="navigation-link">📄 Documents</Link>
                    <Link to="/prescriptions" className="navigation-link">💊 Ordonnances</Link>
                    <Link to="/urgence" className="btn-urgence">Urgence</Link>
                    <Link to="/" className="navigation-link">↗ Déconnexion</Link>
                </nav>
            </header>

            <main className="dashboard-content-pfe">
                <div className="apt-list-header">
                    <div>
                        <h2 className="title-large-pfe">Mes Rendez-vous</h2>
                        <p className="subtitle-pfe">Gérez vos consultations médicales</p>
                    </div>
                    <button className="btn-black-pfe" onClick={() => setView('new')}>
                        <span className="plus-icon">+</span> Nouveau rendez-vous
                    </button>
                </div>

                <div className="tabs-pfe">
                    <button
                        className={`tab-btn-pfe ${activeTab === 'upcoming' ? 'active' : ''}`}
                        onClick={() => setActiveTab('upcoming')}
                    >
                        À venir ({appointments.length})
                    </button>
                    <button
                        className={`tab-btn-pfe ${activeTab === 'history' ? 'active' : ''}`}
                        onClick={() => setActiveTab('history')}
                    >
                        Historique ({history.length})
                    </button>
                    <button
                        className={`tab-btn-pfe ${activeTab === 'requests' ? 'active' : ''}`}
                        onClick={() => setActiveTab('requests')}
                    >
                        Mes demandes ({requests.length})
                    </button>
                </div>

                <div className="apt-items-container">
                    {currentAppointments.map(apt => (
                        <div
                            key={apt.id}
                            className="apt-card-horizontal"
                            style={{ cursor: 'pointer' }}
                            onClick={() => (setSelectedAppointment(apt), setShowDetailModal(true))}
                        >
                            {activeTab !== 'requests' && (
                                <div className="date-box-pfe">
                                    <span className="date-val">{apt.date}</span>
                                    <span className="date-month-pfe">{apt.month}</span>
                                </div>
                            )}
                            <div className="apt-info-pfe">
                                <h4 className="apt-doctor-name">{apt.doctor}</h4>
                                <p className="apt-spec-text">{apt.specialty}</p>
                                <div className="apt-meta-pfe">
                                    <span className="meta-time"> {apt.time}</span>
                                    {activeTab !== 'requests' && <span className="meta-loc"> {apt.location}</span>}
                                </div>
                                <p className="apt-motif-pfe">Motif: {apt.motif}</p>
                            </div>
                            <div className="apt-status-sec">
                                <span className={`status-tag ${apt.status}`}>{apt.status}</span>
                                {apt.status === 'confirmé'}
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {showDetailModal && selectedAppointment && (
                <div className="modal-overlay">
                    <div className="modal-content-pfe" style={{ maxWidth: '450px' }}>
                        {isActionSent ? (
                            <div className="success-notification-pfe">
                                <div className="success-icon-pfe">✓</div>
                                <h3 className="success-title-pfe">Demande envoyée</h3>
                                <p className="success-desc-pfe">Votre demande de reportation/annulation est en cours de traitement. Le statut a été mis à jour.</p>
                            </div>
                        ) : (
                            <>
                                <div className="modal-header-pfe">
                                    <div>
                                        <h3 className="modal-title-bold-pfe">Détails du rendez-vous</h3>
                                        <p className="modal-subtitle-simple-pfe">Informations complètes et options de gestion</p>
                                    </div>
                                    <button className="close-btn-pfe" onClick={() => setShowDetailModal(false)}>×</button>
                                </div>

                                <div className="modal-body-pfe">
                                    <div className="detail-hero-card-pfe">
                                        <div className="hero-top-pfe">
                                            <div>
                                                <p className="hero-label-pfe">Date et heure</p>
                                                <h4 className="hero-date-pfe">
                                                    {selectedAppointment.date ? `${selectedAppointment.date} ${selectedAppointment.month}` : 'Date non définie'} {selectedAppointment.year || '2026'}
                                                </h4>
                                                <p className="hero-time-pfe">{selectedAppointment.time}</p>
                                            </div>
                                            <span className={`status-tag-large-pfe ${selectedAppointment.status}`}>{selectedAppointment.status}</span>
                                        </div>
                                    </div>

                                    <div className="detail-list-pfe">
                                        <div className="detail-item-pfe">
                                            <span className="detail-icon-pfe">👤</span>
                                            <div>
                                                <p className="detail-label-pfe">Praticien</p>
                                                <p className="detail-value-bold-pfe">{selectedAppointment.doctor}</p>
                                                <p className="detail-sub-pfe">{selectedAppointment.specialty}</p>
                                            </div>
                                        </div>

                                        <div className="detail-item-pfe">
                                            <span className="detail-icon-pfe">📍</span>
                                            <div>
                                                <p className="detail-label-pfe">Lieu</p>
                                                <p className="detail-value-bold-pfe">{selectedAppointment.location || 'Bâtiment Principal'}</p>
                                            </div>
                                        </div>

                                        <div className="detail-item-pfe">
                                            <span className="detail-icon-pfe">🗓️</span>
                                            <div>
                                                <p className="detail-label-pfe">Motif</p>
                                                <p className="detail-value-bold-pfe">{selectedAppointment.motif || 'Non spécifié'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {selectedAppointment.status === 'confirmé' && (
                                        <div className="modal-footer-pfe">
                                            <button className="btn-outline-pfe" onClick={() => handleAction('report')}>
                                                <span className="btn-icon-pfe">✎</span> Reporter le rendez-vous
                                            </button>
                                            <button className="btn-outline-danger-pfe" onClick={() => handleAction('cancel')}>
                                                <span className="btn-icon-pfe">×</span> Annuler le rendez-vous
                                            </button>
                                        </div>
                                    )}

                                    {selectedAppointment.status === 'terminé' && (
                                        <div className="modal-footer-pfe">
                                            <button className="btn-outline-danger-pfe" onClick={() => handleDeleteHistory(selectedAppointment.id)}>
                                                <span className="btn-icon-pfe">🗑️</span> Supprimer du historique
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {showCancelModal && (
                <div className="modal-overlay">
                    <div className="modal-content-small">
                        <button className="close-btn-pfe" onClick={() => setShowCancelModal(false)}>×</button>
                        <h3 className="modal-title-pfe">Confirmer l'annulation</h3>
                        <p className="modal-desc-pfe">Êtes-vous sûr de vouloir annuler ce rendez-vous ?</p>
                        <div className="modal-actions-pfe">
                            <button className="btn-white-pfe" onClick={() => setShowCancelModal(false)}>Retour</button>
                            <button className="btn-danger-pfe" onClick={() => {
                                setAppointments(appointments.filter(a => a.id !== selectedAppointment.id));
                                setShowCancelModal(false);
                                setShowDetailModal(false);
                            }}>
                                ✓ Confirmer l'annulation
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Appointments;
