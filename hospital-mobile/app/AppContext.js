import { createContext, useContext, useEffect, useState } from 'react';
import { equipments as defaultEquipments, services as defaultServices } from '../hospitalData';

let AsyncStorage;
try {
    AsyncStorage = require('@react-native-async-storage/async-storage').default;
} catch (e) {
    AsyncStorage = {
        getItem: async () => null,
        setItem: async () => { },
    };
}

const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const [patient, setPatient] = useState({
        firstName: "patientFirstName",
        lastName: "patientLastName",
        email: "marie.dubois@email.com",
        phone: "+216 55 123 456",
        birthDate: "15/03/1985",
        bloodGroup: "O+",
        allergies: ["medPenicilline", "medArachides"],
        history: ["medAsthme", "medHypertension"],
        treatingDoctor: "drBernardLaurent",
        socialSecurity: "1 90 03 75 115 003 42",
        emergencyContact: {
            name: "Jean Dupont",
            phone: "06 XX XX XX XX",
            relation: "emergencyConjoint",
            email: "contact@email.com"
        },
        patientSince: "2020",
    });

    const getRelativeDate = (days) => {
        const d = new Date();
        d.setDate(d.getDate() + days);
        const day = d.getDate().toString();
        const monthNames = ["january", "february", "march", "april", "may", "june",
            "july", "august", "september", "october", "november", "december"];
        const month = monthNames[d.getMonth()];
        const fullDate = d.toLocaleDateString('fr-FR');
        return { day, month, fullDate };
    };

    const d1 = getRelativeDate(3);
    const d2 = getRelativeDate(10);
    const d3 = getRelativeDate(16);
    const past1 = getRelativeDate(-5);
    const past2 = getRelativeDate(-12);
    const past3 = getRelativeDate(-20);

    const [appointments, setAppointments] = useState([
        { id: 1, doctor: "drSophieMartin", specialty: "cardiology", date: d1.day, month: d1.month, time: "10:30", location: "buildingA", status: "confirmed" },
        { id: 2, doctor: "drJeanDubois", specialty: "dermatology", date: d2.day, month: d2.month, time: "14:15", location: "buildingB", status: "confirmed" },
        { id: 3, doctor: "drBernard", specialty: "ophthalmology", date: d3.day, month: d3.month, time: "09:00", location: "buildingC", status: "pending" },
    ]);
    const [requests, setRequests] = useState([]);

    const [documents, setDocuments] = useState([
        { id: 1, title: "pulmonaryXray", doctor: "drMartin", date: past1.fullDate, size: "2.4 MB", category: "radiologie" },
        { id: 2, title: "bloodTest", doctor: "laboCentral", date: past2.fullDate, size: "1.1 MB", category: "biologie" },
        { id: 3, title: "brainIrm", doctor: "drLeroy", date: past3.fullDate, size: "5.8 MB", category: "radiologie" },
    ]);

    const [prescriptions, setPrescriptions] = useState([
        {
            id: 1,
            doctor: "drRousseau",
            specialty: "cardiology",
            date: past1.fullDate,
            status: "active",
            medications: [
                { name: "medAmoxicilline", dosage: 500, dosageUnit: "unitMg", freqCount: 3, freqPeriod: "unitDay", duration: 7, durationUnit: "unitDays" },
                { name: "medParacetamol", dosage: 1000, dosageUnit: "unitMg", freqCount: 2, freqPeriod: "unitDay", duration: 5, durationUnit: "unitDays" },
            ]
        },
    ]);

    const [historicalPrescriptions] = useState([
        {
            id: 101,
            doctor: "drLefevre",
            date: past3.fullDate,
            medications: [
                { name: "medIbuprofene", dosage: 400, dosageUnit: "unitMg" },
            ]
        },
    ]);

    const [labResults] = useState([
        {
            id: 1,
            title: "fullBloodCount",
            date: past1.fullDate,
            lab: "laboCentralTunis",
            parameters: [
                { name: "Hémoglobine", value: "14.2 g/dL", reference: "12-17 g/dL", status: "normal" },
                { name: "Glycémie", value: "1.15 g/L", reference: "0.7-1.1 g/L", status: "attention" },
                { name: "Cholestérol", value: "1.85 g/L", reference: "< 2.0 g/L", status: "normal" },
            ],
            interpretation: { key: "labResultInterpretation", params: { normalCount: 2, attentionCount: 1 } }
        },
    ]);

    const [notifications, setNotifications] = useState([
        { id: 1, text: "notif_appointment", params: { doctor: "drSophieMartin", days: 3 }, time: "timeAgoHours", timeParams: { hours: 2 }, icon: "📅", link: "/appointments" },
        { id: 2, text: "notif_lab_results", time: "timeAgoHours", timeParams: { hours: 5 }, icon: "🧪", link: "/documents" },
        { id: 3, text: "notif_medication", time: "timeAgoHours", timeParams: { hours: 8 }, icon: "💊", link: "/prescription" },
    ]);

    useEffect(() => {
        setNotifications(prev => prev.map(n =>
            n.text === "notif_appointment" ? { ...n, params: { ...n.params, days: 3 } } : n
        ));
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setNotifications(prev => [
                { id: Date.now(), text: "notif_lab_results_ready", time: "justNow", timeParams: {}, icon: "🧪", isNew: true, link: "/documents" },
                ...prev
            ]);
        }, 5000);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const loadData = async () => {
            try {
                const savedPatient = await AsyncStorage.getItem('patient');
                if (savedPatient) setPatient(JSON.parse(savedPatient));
            } catch (e) {
                console.warn("Failed to load patient data", e);
            }
        };
        loadData();
    }, []);

    const savePatient = async (newData) => {
        try {
            setPatient(newData);
            await AsyncStorage.setItem('patient', JSON.stringify(newData));
        } catch (e) {
            console.warn("Failed to save patient data", e);
        }
    };

    return (
        <AppContext.Provider value={{
            patient, setPatient: savePatient,
            appointments, setAppointments,
            documents, setDocuments,
            prescriptions, setPrescriptions,
            historicalPrescriptions,
            requests, setRequests,
            labResults,
            notifications, setNotifications,
            services: defaultServices,
            equipments: defaultEquipments
        }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => useContext(AppContext);
export const useData = useApp;
