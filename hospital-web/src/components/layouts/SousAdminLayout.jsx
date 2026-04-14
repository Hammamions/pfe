import {
    Activity,
    Calendar,
    FileText,
    LogOut
} from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import logo from '../../assets/logo sans bg.png';
import { Button } from '../ui/button';

export default function SousAdminLayout() {
    const location = useLocation();
    const navigate = useNavigate();

    // Get user from current tab session storage
    const user = JSON.parse(sessionStorage.getItem('proUser') || '{}');

    const handleLogout = () => {
        sessionStorage.removeItem('proToken');
        sessionStorage.removeItem('proUser');
        navigate('/login-pro');
    };

    const isActive = (path) => {
        return location.pathname === path;
    };

    const getLinkClass = (path) => {
        const baseClass = "flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all";
        const activeClass = "text-blue-700 bg-blue-50 shadow-sm";
        const inactiveClass = "text-gray-600 hover:text-gray-900 hover:bg-white";

        return `${baseClass} ${isActive(path) ? activeClass : inactiveClass}`;
    };

    return (
        <div className="min-h-screen bg-gray-50/50">
            <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
                <div className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <img src={logo} alt="MediCare Logo" className="h-12 w-auto" />
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="font-bold text-xl text-gray-900 leading-none">TuniSanté</h1>
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full uppercase tracking-wider">Sous-Admin</span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">{user.prenom || 'Admin'} {user.nom || ''} • {user.specialite || 'Service'}</p>
                        </div>
                    </div>

                    <nav className="hidden lg:flex items-center gap-2 bg-gray-50/50 p-1.5 rounded-xl border border-gray-100">
                        <Link to="/sous-admin/dashboard" className={getLinkClass('/sous-admin/dashboard')}>
                            <Activity className="w-4 h-4" />
                            Tableau de bord
                        </Link>
                        <Link to="/sous-admin/appointments" className={getLinkClass('/sous-admin/appointments')}>
                            <Calendar className="w-4 h-4" />
                            Rendez-vous
                        </Link>
                        <Link to="/sous-admin/documents" className={getLinkClass('/sous-admin/documents')}>
                            <FileText className="w-4 h-4" />
                            Documents
                        </Link>
                    </nav>

                    <div className="flex items-center gap-3">
                        <Button variant="ghost" className="text-gray-500 hover:text-red-600 hover:bg-red-50 gap-2" onClick={handleLogout}>
                            <LogOut className="w-4 h-4" />
                            Déconnexion
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-[1600px] mx-auto px-6 py-8">
                <Outlet />
            </main>
        </div>
    );
}
