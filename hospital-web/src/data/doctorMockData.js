export const mockDoctor = {
    id: 1,
    nom: "Martin",
    prenom: "Sophie",
    specialite: "Cardiologue",
    numeroOrdre: "123456789",
    telephone: "01 23 45 67 89",
    email: "dr.martin@hopital.fr"
};

export const mockWaitingRoom = [
    {
        id: 1,
        nom: "Dupont",
        prenom: "Marie",
        motif: "Consultation de suivi",
        heureArrivee: "09:45",
        priorite: "normale",
        statut: "en attente"
    },
    {
        id: 2,
        nom: "Martin",
        prenom: "Pierre",
        motif: "Douleurs thoraciques",
        heureArrivee: "10:15",
        priorite: "urgente",
        statut: "en attente"
    }
];

export const mockDoctorAppointments = [
    {
        id: 1,
        heure: "10:00",
        duree: 30,
        patient: { id: 101, nom: "Dupont", prenom: "Marie" },
        motif: "Contrôle de routine",
        statut: "prévu",
        salle: "A101"
    },
    {
        id: 2,
        heure: "10:30",
        duree: 30,
        patient: { id: 102, nom: "Bernard", prenom: "Jean" },
        motif: "Suivi diabète",
        statut: "prévu",
        salle: "A101"
    },
    {
        id: 3,
        heure: "11:00",
        duree: 30,
        patient: { id: 103, nom: "Petit", prenom: "Claire" },
        motif: "Première consultation",
        statut: "prévu",
        salle: "A101"
    },
    {
        id: 4,
        heure: "14:00",
        duree: 45,
        patient: { id: 104, nom: "Lefevre", prenom: "Marc" },
        motif: "Bilan complet",
        statut: "prévu",
        salle: "A101",
        rescheduleStatus: null,
        requestedTime: null
    },
    {
        id: 5,
        heure: "15:00",
        duree: 30,
        patient: { id: 105, nom: "Rousseau", prenom: "Anne" },
        motif: "Résultats examens",
        statut: "prévu",
        salle: "A101",
        rescheduleStatus: null,
        requestedTime: null
    }
];

export const mockPatientFiles = [
    {
        id: "1",
        patient: {
            id: "p1",
            nom: "Dupont",
            prenom: "Marie",
            dateNaissance: "15/05/1980",
            email: "marie.dupont@email.com",
            telephone: "06 12 34 56 78",
            numeroSecu: "2 80 05 75 123 456 78",
            groupeSanguin: "A+"
        },
        allergies: ["Pénicilline"],
        antecedents: ["Hypertension"],
        consultations: []
    },
    {
        id: "2",
        patient: {
            id: "p2",
            nom: "Martin",
            prenom: "Pierre",
            dateNaissance: "20/03/1975",
            email: "pierre.martin@email.com",
            telephone: "06 98 76 54 32",
            numeroSecu: "1 75 03 92 123 456 78",
            groupeSanguin: "O+"
        },
        allergies: [],
        antecedents: [],
        consultations: []
    }
];

export const aiSuggestions = {
    symptoms: ["Fièvre", "Toux", "Fatigue", "Céphalées", "Nausées"],
    diagnoses: [
        {
            nom: "Grippe",
            probabilite: 85,
            criteres: ["Fièvre > 38°C", "Toux sèche", "Fatigue intense"]
        },
        {
            nom: "COVID-19",
            probabilite: 60,
            criteres: ["Fièvre", "Toux", "Perte de goût/odorat"]
        }
    ],
    treatments: [
        {
            medicament: "Paracétamol",
            dosage: "1000mg",
            frequence: "3-4 fois/jour",
            duree: "5 jours",
            indication: "Douleur et fièvre"
        }
    ]
};
