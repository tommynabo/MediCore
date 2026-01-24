import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Activity } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { api } from '../services/api';

const Login: React.FC = () => {
    const { login, isAuthenticated } = useAppContext();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // If already authenticated, go to dashboard
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/dashboard');
        }
    }, [isAuthenticated, navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // Use centralized API method which uses robust API_URL
            const data = await api.login(email, password);

            // Login method in api.ts already throws if not ok
            login(data);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl overflow-hidden shadow-2xl flex max-w-4xl w-full">
                {/* Left Side - Brand */}
                <div className="w-1/2 bg-blue-600 p-12 flex flex-col justify-between hidden md:flex relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                        <Activity size={400} className="absolute -bottom-20 -right-20 text-white" />
                    </div>

                    <div className="relative z-10 text-white">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-6">
                            <Activity size={24} className="text-white" />
                        </div>
                        <h1 className="text-4xl font-black tracking-tighter mb-2">ControlMed</h1>
                        <p className="text-blue-100 font-medium">Sistema Integral de Gestión Clínica</p>
                    </div>

                    <div className="relative z-10 text-blue-100 text-sm space-y-2">
                        <p>✓ Gestión de Pacientes e Historia Clínica</p>
                        <p>✓ Agenda Inteligente y Facturación</p>
                        <p>✓ Asistente IA Cognitivo</p>
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="w-full md:w-1/2 p-12 flex flex-col justify-center">
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Bienvenido</h2>
                        <p className="text-slate-500">Inicia sesión para acceder a tu panel</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                            <Activity size={16} />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Profesional</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="doctor@clinic.com"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium text-slate-700"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Contraseña</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-12 pr-4 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium text-slate-700"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-sm tracking-wide hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                    Iniciando...
                                </>
                            ) : (
                                'Acceder al Sistema'
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-slate-100">
                        <p className="text-xs text-center text-slate-400">
                            ¿Problemas de acceso? Contacta con el administrador del sistema.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
