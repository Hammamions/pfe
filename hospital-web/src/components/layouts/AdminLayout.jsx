import { Activity, LayoutDashboard, LogOut } from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';

import logo from '../../assets/logo.png';

export default function AdminLayout() {
    const location = useLocation();
    const navigate = useNavigate();

    const isDashboardRoute =
        location.pathname.includes('/admin/dashboard') || location.pathname.replace(/\/$/, '') === '/admin';
    const isSystemRoute = location.pathname.includes('/admin/system');
    const navInactive = 'text-slate-600 hover:text-indigo-800 hover:bg-indigo-50/80';
    const navActive = 'bg-indigo-100 text-indigo-800';

    return (
        <div
            className="min-h-screen flex flex-col"
            style={{
                background: "linear-gradient(160deg, #fdfcfa 0%, #f0f9ff 40%, #faf5ff 100%)",
            }}
        >

            <header className="bg-white/90 backdrop-blur-md border-b border-indigo-100/80 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm shadow-indigo-500/5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 flex items-center justify-center">
                        <img src={logo} alt="TuniSanté" className="w-full h-full object-contain" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-indigo-950 leading-none">TuniSanté</h1>
                        <p className="text-xs text-indigo-900/50 mt-1">Gestion de la plateforme</p>
                    </div>
                </div>

                <nav className="flex items-center gap-2">
                    <Link to="/admin/dashboard">
                        <Button variant="ghost" className={`gap-2 ${isDashboardRoute ? navActive : navInactive}`}>
                            <LayoutDashboard className="w-4 h-4" />
                            Tableau de bord
                        </Button>
                    </Link>
                    <Link to="/admin/system">
                        <Button variant="ghost" className={`gap-2 ${isSystemRoute ? navActive : navInactive}`}>
                            <Activity className="w-4 h-4" />
                            Système
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
