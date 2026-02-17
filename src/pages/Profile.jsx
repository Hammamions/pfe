import { useState } from "react";
import { Link } from "react-router-dom";
import photo from "../assets/logo.png";

const Profile = () => {
    const [isEditing, setIsEditing] = useState(false);
    const [patient, setPatient] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        birthDate: "",
        socialSecurity: "",
        bloodGroup: "",
        doctor: "",
        allergies: [],
        history: [],
        emergencyContact: {
            name: "",
            numerodetelephone: "",

        },
        spouse: {
            name: "",
            num: ""
        }
    });

    const [editData, setEditData] = useState({ ...patient });

    const handleEditToggle = () => {
        if (isEditing) {
            setEditData({ ...patient });
        }
        setIsEditing(!isEditing);
    };

    const handleInputChange = (field, value, section = null) => {
        if (section) {
            setEditData({
                ...editData,
                [section]: { ...editData[section], [field]: value }
            });
        } else {
            setEditData({ ...editData, [field]: value });
        }
    };

    const handleSave = () => {
        setPatient({ ...editData });
        setIsEditing(false);
    };

    const handleAddTag = (section) => {
        const value = prompt(`Ajouter ${section === 'allergies' ? 'une allergie' : 'un antécédent'} :`);
        if (value && value.trim()) {
            setEditData({
                ...editData,
                [section]: [...editData[section], value.trim()]
            });
        }
    };

    const handleBloodGroupCycle = () => {
        const groups = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];
        const currentIndex = groups.indexOf(editData.bloodGroup);
        const nextIndex = (currentIndex + 1) % groups.length;
        setEditData({ ...editData, bloodGroup: groups[nextIndex] });
    };

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
                    <Link to="/dashboard" className="navigation-link">
                        Tableau de bord
                    </Link>
                    <Link to="/profile" className="navigation-link active">
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
            </header>

            <main className="dashboard-content">
                <div className="profile-container">
                    <div className="profile-header">
                        <div>
                            <h2 className="profile-title">Mon Profil</h2>
                            <p className="profile-subtitle">Gérez vos informations personnelles et médicales</p>
                        </div>
                        <button className="btn-cancel-sm" onClick={handleEditToggle}>
                            {isEditing ? (
                                <><span></span> Annuler</>
                            ) : (
                                "Modifier"
                            )}
                        </button>
                    </div>

                    <div className="profile-grid">
                        <div className="profile-card-left">
                            <div className="profile-avatar-large">
                                {patient.firstName[0]}{patient.lastName[0]}
                            </div>
                            <h3 className="profile-name-large">{patient.firstName} {patient.lastName}</h3>
                            <p className="profile-email-large">{patient.email}</p>

                            <div className="profile-info-list" style={{ borderTop: 'none', padding: '0' }}>
                                <div className="profile-info-item">
                                    Patient depuis {patient.createdAt}
                                </div>
                                <div className="profile-info-item">
                                    Né(e) le {patient.birthDate}
                                </div>
                                <div className="profile-info-item">
                                    Groupe Sanguin {patient.bloodGroup}
                                </div>
                            </div>
                        </div>

                        <div className="profile-card-right">
                            <div className="profile-section-card">
                                <h4 className="profile-section-title">Informations personnelles</h4>
                                <p className="profile-section-subtitle">Vos coordonnées et informations de contact</p>

                                <div className="info-grid">
                                    <div className="info-field">
                                        <label className="info-label">Nom</label>
                                        {isEditing ? (
                                            <input
                                                className="profile-edit-input"
                                                value={editData.lastName}
                                                onChange={(e) => handleInputChange('lastName', e.target.value)}
                                            />
                                        ) : (
                                            <div className="info-value-box">{patient.lastName}</div>
                                        )}
                                    </div>
                                    <div className="info-field">
                                        <label className="info-label">Prénom</label>
                                        {isEditing ? (
                                            <input
                                                className="profile-edit-input"
                                                value={editData.firstName}
                                                onChange={(e) => handleInputChange('firstName', e.target.value)}
                                            />
                                        ) : (
                                            <div className="info-value-box">{patient.firstName}</div>
                                        )}
                                    </div>
                                    <div className="info-field">
                                        <label className="info-label">Email</label>
                                        {isEditing ? (
                                            <div className="input-with-icon">
                                                <span className="input-icon"></span>
                                                <input
                                                    className="profile-edit-input"
                                                    value={editData.email}
                                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                                />
                                            </div>
                                        ) : (
                                            <div className="info-value-box">{patient.email}</div>
                                        )}
                                    </div>
                                    <div className="info-field">
                                        <label className="info-label">Téléphone</label>
                                        {isEditing ? (
                                            <div className="input-with-icon">
                                                <span className="input-icon"></span>
                                                <input
                                                    className="profile-edit-input"
                                                    value={editData.phone}
                                                    onChange={(e) => handleInputChange('phone', e.target.value)}
                                                />
                                            </div>
                                        ) : (
                                            <div className="info-value-box">{patient.phone}</div>
                                        )}
                                    </div>
                                    <div className="info-field">
                                        <label className="info-label">Date de naissance</label>
                                        {isEditing ? (
                                            <input
                                                className="profile-edit-input"
                                                value={editData.birthDate}
                                                onChange={(e) => handleInputChange('birthDate', e.target.value)}
                                            />
                                        ) : (
                                            <div className="info-value-box">{patient.birthDate}</div>
                                        )}
                                    </div>
                                    <div className="info-field">
                                        <label className="info-label">Numéro de sécurité sociale</label>
                                        {isEditing ? (
                                            <input
                                                className="profile-edit-input"
                                                value={editData.socialSecurity}
                                                onChange={(e) => handleInputChange('socialSecurity', e.target.value)}
                                            />
                                        ) : (
                                            <div className="info-value-box">{patient.socialSecurity}</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="profile-section-card">
                                <h4 className="profile-section-title">Informations médicales</h4>
                                <p className="profile-section-subtitle">Votre dossier médical et antécédents</p>

                                <div className="info-field" style={{ marginBottom: '1.5rem' }}>
                                    <label className="info-label">Groupe Sanguin</label>
                                    <div
                                        className={`tag tag-blood ${isEditing ? 'tag-interactive' : ''}`}
                                        onClick={isEditing ? handleBloodGroupCycle : undefined}
                                        style={isEditing ? { cursor: 'pointer' } : {}}
                                    >
                                        {isEditing ? editData.bloodGroup : patient.bloodGroup}
                                        {isEditing && <span style={{ marginLeft: '8px', fontSize: '0.8em' }}></span>}
                                    </div>
                                </div>



                                <div className="info-field" style={{ marginBottom: '1.5rem' }}>
                                    <label className="info-label"> Allergies</label>
                                    <div className="medical-tags">
                                        {(isEditing ? editData.allergies : patient.allergies).map((allergy, i) => (
                                            <span key={i} className="tag tag-allergy">{allergy}</span>
                                        ))}
                                        {isEditing && (
                                            <button className="btn-add-tag" onClick={() => handleAddTag('allergies')}>+ Ajouter</button>
                                        )}
                                    </div>
                                </div>

                                <div className="info-field">
                                    <label className="info-label">Antécédents médicaux</label>
                                    <div className="medical-tags">
                                        {(isEditing ? editData.history : patient.history).map((item, i) => (
                                            <span key={i} className="tag tag-antecedent">{item}</span>
                                        ))}
                                        {isEditing && (
                                            <button className="btn-add-tag" onClick={() => handleAddTag('history')}>+ Ajouter</button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="profile-section-card">
                                <h4 className="profile-section-title">Contact d'urgence</h4>
                                <p className="profile-section-subtitle">Personne à contacter en cas d'urgence</p>

                                <div className="info-grid">
                                    <div className="info-field">
                                        <label className="info-label">Nom complet</label>
                                        {isEditing ? (
                                            <input
                                                className="profile-edit-input"
                                                value={editData.emergencyContact.name}
                                                onChange={(e) => handleInputChange('name', e.target.value, 'emergencyContact')}
                                            />
                                        ) : (
                                            <div className="info-value-box">{patient.emergencyContact.name}</div>
                                        )}
                                    </div>
                                    <div className="info-field">
                                        <label className="info-label">Relation</label>
                                        {isEditing ? (
                                            <input
                                                className="profile-edit-input"
                                                value={editData.emergencyContact.relation}
                                                onChange={(e) => handleInputChange('relation', e.target.value, 'emergencyContact')}
                                            />
                                        ) : (
                                            <div className="info-value-box">{patient.emergencyContact.relation}</div>
                                        )}
                                    </div>
                                    <div className="info-field">
                                        <label className="info-label">Téléphone</label>
                                        {isEditing ? (
                                            <input
                                                className="profile-edit-input"
                                                value={editData.emergencyContact.phone}
                                                onChange={(e) => handleInputChange('phone', e.target.value, 'emergencyContact')}
                                            />
                                        ) : (
                                            <div className="info-value-box">{patient.emergencyContact.phone}</div>
                                        )}
                                    </div>


                                </div>
                            </div>

                            <div className="profile-section-card">
                                <h4 className="profile-section-title">Informations du conjoint</h4>
                                <p className="profile-section-subtitle">Coordonnées de votre conjoint(e)</p>

                                <div className="info-grid">
                                    <div className="info-field">
                                        <label className="info-label">Nom du conjoint</label>
                                        {isEditing ? (
                                            <input
                                                className="profile-edit-input"
                                                value={editData.spouse.name}
                                                onChange={(e) => handleInputChange('name', e.target.value, 'spouse')}
                                            />
                                        ) : (
                                            <div className="info-value-box">{patient.spouse.name}</div>
                                        )}
                                    </div>
                                    <div className="info-field">
                                        <label className="info-label">Téléphone du conjoint</label>
                                        {isEditing ? (
                                            <input
                                                className="profile-edit-input"
                                                value={editData.spouse.phone}
                                                onChange={(e) => handleInputChange('phone', e.target.value, 'spouse')}
                                            />
                                        ) : (
                                            <div className="info-value-box">{patient.spouse.phone}</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {isEditing && (
                                <div className="profile-edit-actions">
                                    <button className="btn-cancel-large" onClick={handleEditToggle}>Annuler</button>
                                    <button className="btn-save" onClick={handleSave}>Enregistrer les modifications</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Profile;
