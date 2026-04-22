import { Activity, Calendar, LogOut } from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import logo from '../../assets/logo sans bg.png';
import { t } from '../../lib/proWebI18n';
import { useProWebLang } from '../../lib/useProWebLang';
import { Button } from '../ui/button';

export default function SousAdminLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const lang = useProWebLang();

    const user = JSON.parse(sessionStorage.getItem('proUser') || '{}');
    const permissions = Array.isArray(user.permissions) ? user.permissions : [];
    const hasPatientsAccess = permissions.length === 0 || permissions.includes('gestion_patients');

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
        const activeClass = "text-indigo-800 bg-indigo-50 shadow-sm ring-1 ring-indigo-100/80";
        const inactiveClass = "text-slate-600 hover:text-indigo-900 hover:bg-white/90";

        return `${baseClass} ${isActive(path) ? activeClass : inactiveClass}`;
    };

    const L = (key) => t(key, lang);

    return (
        <div
            className="min-h-screen"
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
            style={{
                background: "linear-gradient(160deg, #fdfcfa 0%, #f0f9ff 40%, #faf5ff 100%)",
            }}
        >
            <header className="bg-white/90 backdrop-blur-md border-b border-indigo-100/80 sticky top-0 z-50 shadow-sm shadow-indigo-500/5">
                <div className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <img src={logo} alt="MediCare Logo" className="h-12 w-auto" />
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="font-bold text-xl text-indigo-950 leading-none">TuniSanté</h1>
                                <span className="px-2 py-0.5 bg-violet-100 text-violet-800 text-[10px] font-bold rounded-full uppercase tracking-wider ring-1 ring-violet-200/60">
                                    {L('subAdminBadge')}
                                </span>
                            </div>
                            <p className="text-sm text-indigo-900/50 mt-1">
                                {user.prenom || "Admin"} {user.nom || ""} • {user.specialite || "Service"}
                            </p>
                        </div>
                    </div>

                    <nav className="hidden lg:flex items-center gap-2 bg-indigo-50/60 p-1.5 rounded-xl border border-indigo-100/80">
                        {hasPatientsAccess && (
                            <>
                                <Link to="/sous-admin/dashboard" className={getLinkClass('/sous-admin/dashboard')}>
                                    <Activity className="w-4 h-4" />
                                    {L('navDashboard')}
                                </Link>
                                <Link to="/sous-admin/appointments" className={getLinkClass('/sous-admin/appointments')}>
                                    <Calendar className="w-4 h-4" />
                                    {L('navAppointments')}
                                </Link>
                            </>
                        )}
                    </nav>

                    <div className="flex items-center gap-2 sm:gap-3">
                        <Button
                            variant="ghost"
                            className="text-slate-500 hover:bg-red-50 hover:text-red-600 gap-2"
                            onClick={handleLogout}
                        >
                            <LogOut className="h-4 w-4" />
                            {L('logout')}
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
