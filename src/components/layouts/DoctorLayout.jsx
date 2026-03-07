import { Link, Outlet, useLocation } from 'react-router-dom';
import {
    Users,
    Calendar,
    Activity,
    Brain,
    Pill,
    LogOut,
} from 'lucide-react';
import { Button } from '../ui/button';
import { mockDoctor } from '../../data/doctorMockData';
import logo from '../../assets/logo sans bg.png';

export default function DoctorLayout() {
    const location = useLocation();

    const isActive = (path) => {
        return location.pathname === path;
    };

    const getLinkClass = (path) => {
        const baseClass = "flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all";
        const activeClass = "text-green-700 bg-green-50 shadow-sm";
        const inactiveClass = "text-gray-600 hover:text-gray-900 hover:bg-white";

        return `${baseClass} ${isActive(path) ? activeClass : inactiveClass}`;
    };

    return (
        <div className="min-h-screen bg-gray-50/50">
            {/* Header */}
            <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
                <div className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <img src={logo} alt="MediCare Logo" className="h-12 w-auto" />
                        <div>
                            <h1 className="font-bold text-xl text-gray-900 leading-none">Espace Médecin</h1>
                            <p className="text-sm text-gray-500 mt-1">Dr. {mockDoctor.prenom} {mockDoctor.nom}</p>
                        </div>
                    </div>

                    <nav className="hidden lg:flex items-center gap-2 bg-gray-50/50 p-1.5 rounded-xl border border-gray-100">
                        <Link to="/doctor/dashboard" className={getLinkClass('/doctor/dashboard')}>
                            <Activity className="w-4 h-4" />
                            Tableau de bord
                        </Link>
                        <Link to="/doctor/patients" className={getLinkClass('/doctor/patients')}>
                            <Users className="w-4 h-4" />
                            Patients
                        </Link>
                        <Link to="/doctor/agenda" className={getLinkClass('/doctor/agenda')}>
                            <Calendar className="w-4 h-4" />
                            Agenda
                        </Link>
                        <Link to="/doctor/ai-assistant" className={getLinkClass('/doctor/ai-assistant')}>
                            <Brain className="w-4 h-4" />
                            Assistant IA
                        </Link>
                        <Link to="/doctor/prescriptions" className={getLinkClass('/doctor/prescriptions')}>
                            <Pill className="w-4 h-4" />
                            Ordonnances
                        </Link>
                    </nav>

                    <Button variant="ghost" className="text-gray-500 hover:text-red-600 hover:bg-red-50 gap-2">
                        <LogOut className="w-4 h-4" />
                        Déconnexion
                    </Button>
                </div>
            </header>

            <main className="max-w-[1600px] mx-auto px-6 py-8">
                <Outlet />
            </main>
        </div>
    );
}
