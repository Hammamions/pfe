import { LayoutDashboard, LogOut } from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';

import logo from '../../assets/logo.png';

export default function AdminLayout() {
    const location = useLocation();
    const navigate = useNavigate();

    const isActive = (path) => {
        return location.pathname.includes(path) ? "bg-purple-100 text-purple-700" : "text-gray-600 hover:text-purple-600 hover:bg-purple-50";
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">

            <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 flex items-center justify-center">
                        <img src={logo} alt="TuniSanté" className="w-full h-full object-contain" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 leading-none">TuniSanté</h1>
                        <p className="text-xs text-gray-500 mt-1">Gestion de la plateforme</p>
                    </div>
                </div>

                <nav className="flex items-center gap-2">
                    <Link to="/admin/dashboard">
                        <Button variant="ghost" className={`gap-2 ${isActive('dashboard')}`}>
                            <LayoutDashboard className="w-4 h-4" />
                            Tableau de bord
                        </Button>
                    </Link>
                </nav>

                <Button variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700 gap-2" onClick={() => navigate('/login-pro')}>
                    <LogOut className="w-4 h-4" />
                    Déconnexion
                </Button>
            </header>


            <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
                <Outlet />
            </main>
        </div>
    );
}
