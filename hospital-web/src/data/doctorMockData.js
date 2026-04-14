export const mockDoctor = {
    id: 'doc-1',
    nom: 'Makhbouche',
    prenom: 'Imen',
    specialite: 'Médecine générale',
    numeroOrdre: 'TN-45872',
    telephone: '+216 90 000 000'
};

export const mockPatientFiles = [
    {
        id: 'pat-1',
        patient: {
            id: 'pat-1',
            nom: 'Ben Salah',
            prenom: 'Amine',
            dateNaissance: '14/03/1988',
            numeroSecu: '1880314XXXX',
            email: 'amine.bensalah@example.com',
            telephone: '+216 98 111 111'
        },
        allergies: ['Pénicilline']
    },
    {
        id: 'pat-2',
        patient: {
            id: 'pat-2',
            nom: 'Trabelsi',
            prenom: 'Nour',
            dateNaissance: '22/11/1995',
            numeroSecu: '2951122XXXX',
            email: 'nour.trabelsi@example.com',
            telephone: '+216 98 222 222'
        },
        allergies: []
    }
];

export const aiSuggestions = {
    symptoms: [
        'Douleur thoracique',
        'Dyspnée',
        'Palpitations',
        'Fatigue',
        'Toux sèche'
    ],
    diagnoses: [
        {
            nom: 'Syndrome coronarien aigu',
            probabilite: 78,
            criteres: ['Douleur thoracique', 'Irradiation bras', 'Facteurs de risque']
        },
        {
            nom: 'Angor stable',
            probabilite: 62,
            criteres: ['Douleur à l’effort', 'Soulagement au repos']
        },
        {
            nom: 'Douleur musculosquelettique',
            probabilite: 35,
            criteres: ['Douleur localisée', 'Reproductible à la palpation']
        }
    ],
    treatments: [
        {
            medicament: 'Paracétamol',
            dosage: '1 g',
            frequence: '3 fois / jour',
            duree: '5 jours',
            indication: 'Antalgique de première intention'
        },
        {
            medicament: 'Aspirine',
            dosage: '75 mg',
            frequence: '1 fois / jour',
            duree: '30 jours',
            indication: 'Prévention cardiovasculaire selon contexte clinique'
        }
    ]
};
