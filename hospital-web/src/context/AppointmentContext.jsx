import { createContext, useContext, useState } from 'react';

const AppointmentContext = createContext();

export const AppointmentProvider = ({ children }) => {
    const [appointments, setAppointments] = useState([

    ]);

    const [history, setHistory] = useState([

    ]);

    const [requests, setRequests] = useState([

    ]);

    return (
        <AppointmentContext.Provider value={{
            appointments, setAppointments,
            history, setHistory,
            requests, setRequests
        }}>
            {children}
        </AppointmentContext.Provider>
    );
};

export const useAppointments = () => {
    const context = useContext(AppointmentContext);
    if (!context) {
        throw new Error('useAppointments must be used within an AppointmentProvider');
    }
    return context;
};
