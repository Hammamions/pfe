/** Données de démo pour l’assistant IA (mode « exemple statique » sans API). */
export const aiSuggestions = {
    symptoms: [
        'Douleur thoracique constrictive',
        'Dyspnée à l’effort',
        'Palpitations',
        'Toux productive',
        'Fièvre',
        'Céphalées intenses',
        'Nausées',
    ],
    diagnoses: [
        {
            nom: 'Angor stable (hypothèse)',
            probabilite: 62,
            criteres: ['Douleur rétrosternale', 'Facteurs de risque CV', 'Soulagement au repos'],
        },
        {
            nom: 'Bronchite aiguë (hypothèse)',
            probabilite: 48,
            criteres: ['Toux', 'Expectoration', 'Contexte viral possible'],
        },
        {
            nom: 'Anxiété / crise de panique (hypothèse)',
            probabilite: 35,
            criteres: ['Palpitations', 'Hyperventilation', 'Examen CV non contributif'],
        },
    ],
    treatments: [
        {
            medicament: 'Acide acétylsalicylique',
            dosage: '75–100 mg',
            frequence: '1 fois / jour',
            duree: 'Selon avis cardiologique',
            indication: 'Prévention secondaire si indiqué et sans contre-indication.',
        },
        {
            medicament: 'Paracétamol',
            dosage: '1 g',
            frequence: 'Toutes les 6–8 h si douleur',
            duree: '3 jours max sans réévaluation',
            indication: 'Douleur légère à modérée, antipyrétique.',
        },
    ],
};
