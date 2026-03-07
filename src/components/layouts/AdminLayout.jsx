import { Outlet, Link, useLocation } from 'react-router-dom';
import { Shield, LayoutDashboard, Users, LogOut } from 'lucide-react';
import { Button } from '../ui/button';

export default function AdminLayout() {
    const location = useLocation();

    const isActive = (path) => {
        return location.pathname.includes(path) ? "bg-purple-100 text-purple-700" : "text-gray-600 hover:text-purple-600 hover:bg-purple-50";
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="bg-purple-600 p-2 rounded-lg">
                        <Shield className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 leading-none">Administration</h1>
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
                    <Link to="/admin/doctors">
                        <Button variant="ghost" className={`gap-2 ${isActive('doctors')}`}>
                            <Users className="w-4 h-4" />
                            Gestion Médecins
                        </Button>
                    </Link>
                </nav>

                <Button variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700 gap-2">
                    <LogOut className="w-4 h-4" />
                    Déconnexion
                </Button>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
                <Outlet />
            </main>
        </div>
    );
}
