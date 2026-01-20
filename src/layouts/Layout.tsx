import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
    Users, Activity, Calendar, Settings,
    PieChart, Brain, Package, LogOut, Search, Bell, Menu
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const Layout: React.FC = () => {
    const { currentUser, role, logout } = useAppContext();
    const location = useLocation();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: PieChart, path: '/' },
        { id: 'patients', label: 'Pacientes', icon: Users, path: '/pacientes' },
        { id: 'agenda', label: 'Agenda', icon: Calendar, path: '/agenda' },
        { id: 'billing', label: 'Facturación', icon: Activity, path: '/billing' }, // Using Activity for now
        { id: 'stock', label: 'Inventario', icon: Package, path: '/inventory' },
        { id: 'ai', label: 'Asistente IA', icon: Brain, path: '/ai' },
        { id: 'payroll', label: 'Nóminas', icon: Users, path: '/payroll' }, // Using Users for payroll
        { id: 'settings', label: 'Configuración', icon: Settings, path: '/settings' },
    ];

    return (
        <div className="flex h-screen bg-slate-50">
            {/* Sidebar */}
            <aside
                className={`${isSidebarOpen ? 'w-64' : 'w-20'} 
        bg-slate-900 text-slate-300 transition-all duration-300 ease-in-out relative z-20 flex flex-col`}
            >
                <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 bg-blue-600 rounded-xl flex-shrink-0 flex items-center justify-center text-white">
                            <Activity size={18} />
                        </div>
                        {isSidebarOpen && (
                            <h1 className="text-lg font-black tracking-tighter text-white">ControlMed</h1>
                        )}
                    </div>
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-slate-500 hover:text-white">
                        <Menu size={18} />
                    </button>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4">
                    {navItems.map((item) => {
                        // Basic Role Based Access Control (RBAC) Filtering
                        if (role === 'RECEPTION' && ['payroll', 'ai'].includes(item.id)) return null;
                        if (role === 'DOCTOR' && ['payroll', 'stock'].includes(item.id)) return null;

                        return (
                            <NavLink
                                key={item.id}
                                to={item.path}
                                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                  ${isActive
                                        ? 'bg-blue-600/10 text-blue-500 shadow-lg shadow-blue-500/20'
                                        : 'hover:bg-slate-800 hover:text-white'
                                    }
                `}
                            >
                                <item.icon size={20} className="group-hover:scale-110 transition-transform" />
                                {isSidebarOpen && <span className="text-xs font-bold uppercase tracking-wide">{item.label}</span>}
                            </NavLink>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <button
                        onClick={handleLogout}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-all w-full ${!isSidebarOpen && 'justify-center'}`}
                    >
                        <LogOut size={20} />
                        {isSidebarOpen && <span className="text-xs font-bold uppercase tracking-wide">Cerrar Sesión</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 relative">
                {/* Top Header */}
                <header className="h-16 bg-white/50 backdrop-blur-xl border-b border-slate-200/50 flex items-center justify-between px-8 z-10 sticky top-0">
                    <h2 className="text-base font-black text-slate-900 tracking-tight uppercase">
                        {navItems.find(n => n.path === location.pathname)?.label || 'Panel'}
                    </h2>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-slate-100 shadow-sm">
                            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs ring-2 ring-white shadow-lg">
                                {currentUser?.name?.[0] || 'U'}
                            </div>
                            <div className="text-right hidden sm:block">
                                <p className="text-xs font-bold text-slate-900">{currentUser?.name || 'Usuario'}</p>
                                <p className="text-[10px] text-slate-400 font-semibold">{role}</p>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-auto p-8 relative scrollbar-hide">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
