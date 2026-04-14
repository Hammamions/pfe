import {
    Activity,
    Brain,
    Calendar,
    LogOut,
    Menu,
    Pill,
    Users,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import logo from '../../assets/logo sans bg.png';
import { Button } from '../ui/button';

const navLinks = [
    { to: '/doctor/dashboard', icon: Activity, label: 'Tableau de bord' },
    { to: '/doctor/patients', icon: Users, label: 'Patients' },
    { to: '/doctor/agenda', icon: Calendar, label: 'Agenda' },
    { to: '/doctor/ai-assistant', icon: Brain, label: 'Assistant IA' },
    { to: '/doctor/prescriptions', icon: Pill, label: 'Ordonnances' },
];

export default function DoctorLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Read authenticated user from session (populated after login)
    const sessionUser = JSON.parse(sessionStorage.getItem('proUser') || '{}');
    const doctorPrenom = sessionUser.prenom || sessionUser.firstName || '';
    const doctorNom = sessionUser.nom || sessionUser.lastName || '';
    const doctorFullName = `Dr. ${doctorPrenom} ${doctorNom}`.trim().replace(/^Dr\.\s*$/, '');

    const isActive = (path) => location.pathname === path;

    const getLinkClass = (path) => {
        const base = "flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all";
        return `${base} ${isActive(path) ? 'text-green-700 bg-green-50 shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-white'}`;
    };

    const getMobileLinkClass = (path) => {
        const base = "flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all w-full";
        return `${base} ${isActive(path) ? 'text-green-700 bg-green-50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`;
    };

    const handleLogout = () => {
        sessionStorage.removeItem('proToken');
        sessionStorage.removeItem('proUser');
        navigate('/login-pro');
    };

    const handleMobileNav = (to) => {
        setMobileMenuOpen(false);
        navigate(to);
    };

    return (
        <div className="min-h-screen bg-gray-50/50">

            <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
                <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">

                    {/* Logo + Name */}
                    <div className="flex items-center gap-3">
                        <img src={logo} alt="MediCare Logo" className="h-9 sm:h-12 w-auto" />
                        <div>
                            <h1 className="font-bold text-lg sm:text-xl text-gray-900 leading-none">TuniSanté</h1>
                            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{doctorFullName}</p>
                        </div>
                    </div>

                    {/* Desktop Nav */}
                    <nav className="hidden lg:flex items-center gap-2 bg-gray-50/50 p-1.5 rounded-xl border border-gray-100">
                        {navLinks.map(({ to, icon: Icon, label }) => (
                            <Link key={to} to={to} className={getLinkClass(to)}>
                                <Icon className="w-4 h-4" />
                                {label}
                            </Link>
                        ))}
                    </nav>

                    {/* Desktop Logout */}
                    <Button
                        variant="ghost"
                        className="hidden lg:flex text-gray-500 hover:text-red-600 hover:bg-red-50 gap-2"
                        onClick={handleLogout}
                    >
                        <LogOut className="w-4 h-4" />
                        Déconnexion
                    </Button>

                    {/* Mobile: hamburger */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="lg:hidden text-gray-600"
                        onClick={() => setMobileMenuOpen(true)}
                        aria-label="Ouvrir le menu"
                    >
                        <Menu className="w-5 h-5" />
                    </Button>
                </div>
            </header>

            {/* Mobile Slide-in Menu Overlay */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 z-50 lg:hidden"
                    aria-modal="true"
                    role="dialog"
                >
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setMobileMenuOpen(false)}
                    />

                    {/* Drawer */}
                    <div className="absolute right-0 top-0 h-full w-72 bg-white shadow-2xl flex flex-col">
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <img src={logo} alt="Logo" className="h-9 w-auto" />
                                <div>
                                    <p className="font-bold text-gray-900 text-sm">TuniSanté</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{doctorFullName}</p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-gray-400 hover:text-gray-600"
                                onClick={() => setMobileMenuOpen(false)}
                                aria-label="Fermer le menu"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Nav Links */}
                        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                            {navLinks.map(({ to, icon: Icon, label }) => (
                                <button
                                    key={to}
                                    onClick={() => handleMobileNav(to)}
                                    className={getMobileLinkClass(to)}
                                >
                                    <Icon className="w-5 h-5 shrink-0" />
                                    {label}
                                </button>
                            ))}
                        </nav>

                        {/* Logout */}
                        <div className="px-3 py-4 border-t border-gray-100">
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm w-full text-red-600 hover:bg-red-50 transition-all"
                            >
                                <LogOut className="w-5 h-5 shrink-0" />
                                Déconnexion
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-20 lg:pb-8">
                <Outlet />
            </main>

            {/* Mobile Bottom Navigation Bar */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 flex items-center justify-around px-2 h-16 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
                {navLinks.map(({ to, icon: Icon, label }) => (
                    <Link
                        key={to}
                        to={to}
                        className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all ${
                            isActive(to)
                                ? 'text-green-700'
                                : 'text-gray-400 hover:text-gray-700'
                        }`}
                    >
                        <Icon className={`w-5 h-5 ${isActive(to) ? 'stroke-[2.5]' : ''}`} />
                        <span className="text-[10px] font-medium leading-tight line-clamp-1 max-w-[56px] text-center">
                            {label}
                        </span>
                    </Link>
                ))}
            </nav>
        </div>
    );
}
