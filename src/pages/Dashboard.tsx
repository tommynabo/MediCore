import React from 'react';
import { Star, TrendingUp, TrendingDown, Users, DollarSign, Activity, Calendar } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const Dashboard: React.FC = () => {
    const { patients, appointments, invoices, currentUserRole, currentUser } = useAppContext();

    // RECEPTION VIEW - "Global Center"
    if (currentUserRole === 'RECEPTION') {
        return (
            <div className="h-full flex flex-col items-center justify-center bg-slate-50 animate-in fade-in zoom-in duration-500">
                <div className="bg-white p-12 rounded-[3rem] shadow-2xl border border-slate-100 text-center max-w-2xl w-full">
                    <div className="w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-blue-600/30 mx-auto mb-8">
                        <Activity size={48} strokeWidth={3} />
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">ControlMed</h1>
                    <p className="text-blue-600 font-bold uppercase tracking-widest text-sm mb-8">Global Center</p>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                            <p className="text-3xl font-black text-slate-900">{patients.length}</p>
                            <p className="text-xs font-bold text-slate-400 uppercase">Pacientes Activos</p>
                        </div>
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                            <p className="text-3xl font-black text-slate-900">{appointments.filter(a => a.date === new Date().toISOString().split('T')[0]).length}</p>
                            <p className="text-xs font-bold text-slate-400 uppercase">Citas Hoy</p>
                        </div>
                    </div>

                    <div className="mt-8 p-4 bg-blue-50 text-blue-800 rounded-xl text-sm font-medium">
                        👋 Hola, {currentUser?.name || "Recepción"}. Panel listo para gestión.
                    </div>
                </div>
            </div>
        );
    }

    // DOCTOR / ADMIN VIEW
    // Mock Stats for the dashboard
    const stats = [
        { label: 'Pacientes Totales', value: patients.length, change: '+12%', icon: Users, color: 'bg-blue-500' },
        { label: 'Ingresos Hoy', value: `${invoices.filter(i => i.date === new Date().toISOString().split('T')[0]).reduce((acc, curr) => acc + curr.amount, 0)}€`, change: '+8%', icon: DollarSign, color: 'bg-emerald-500' },
        { label: 'Citas Hoy', value: appointments.filter(a => a.date === new Date().toISOString().split('T')[0]).length, change: '-2%', icon: Calendar, color: 'bg-purple-500' },
    ];

    return (
        <div className="p-10 h-full overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="max-w-6xl mx-auto space-y-12">
                <div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">Buenos días, {currentUser?.name || "Doctor"}</h2>
                    <p className="text-slate-500 font-medium">Aquí tienes el resumen de tu clínica hoy.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {stats.map((stat, idx) => (
                        <div key={idx} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-4 rounded-2xl ${stat.color} text-white shadow-lg shadow-${stat.color.replace('bg-', '')}/30`}>
                                    <stat.icon size={24} />
                                </div>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${stat.change.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                    {stat.change}
                                </span>
                            </div>
                            <p className="text-4xl font-black text-slate-900 mb-1">{stat.value}</p>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* Example Chart or Activity Feed could go here */}
                {/* REAL CHARTS & ACTIVITY */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* ACTIVITY CHART (CSS BARS) */}
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm min-h-[300px] flex flex-col">
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-6 flex items-center gap-2">
                            <Activity size={18} className="text-blue-500" /> Actividad Semanal
                        </h3>
                        <div className="flex-1 flex items-end justify-between gap-2 mt-4">
                            {Array.from({ length: 7 }).map((_, i) => {
                                const d = new Date();
                                d.setDate(d.getDate() - (6 - i));
                                const dateStr = d.toISOString().split('T')[0];
                                const count = appointments.filter(a => a.date === dateStr).length;
                                const max = 15; // Scale factor
                                const height = Math.min(100, Math.max(10, (count / max) * 100));

                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                                        <div className="w-full bg-slate-50 rounded-t-xl relative overflow-hidden h-32 flex items-end">
                                            <div
                                                className="w-full bg-blue-500 group-hover:bg-blue-600 transition-all duration-500 rounded-t-xl"
                                                style={{ height: `${height}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">{d.toLocaleDateString('es-ES', { weekday: 'short' })}</span>
                                        <div className="opacity-0 group-hover:opacity-100 absolute mb-10 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-lg transition-opacity">
                                            {count} Citas
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* UPCOMING APPOINTMENTS */}
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm min-h-[300px] overflow-hidden flex flex-col">
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-6 flex items-center gap-2">
                            <Calendar size={18} className="text-purple-500" /> Próximas Citas
                        </h3>
                        <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2 flex-1">
                            {appointments
                                .filter(a => new Date(a.date) >= new Date())
                                .sort((a, b) => new Date(a.date + 'T' + a.time).getTime() - new Date(b.date + 'T' + b.time).getTime())
                                .slice(0, 5)
                                .map(appt => {
                                    const patient = patients.find(p => p.id === appt.patientId);
                                    return (
                                        <div key={appt.id} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-white border border-transparent hover:border-slate-100 transition-all hover:shadow-md group">
                                            <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex flex-col items-center justify-center font-bold text-xs uppercase">
                                                <span>{new Date(appt.date).getDate()}</span>
                                                <span className="text-[8px]">{new Date(appt.date).toLocaleDateString('es-ES', { month: 'short' })}</span>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs font-black text-slate-900">{patient?.name || 'Paciente Desconocido'}</p>
                                                <p className="text-[10px] font-medium text-slate-500">{appt.treatment}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-black text-slate-900">{appt.time}</p>
                                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-500 font-bold uppercase">{appt.status}</span>
                                            </div>
                                        </div>
                                    );
                                })}

                            {appointments.filter(a => new Date(a.date) >= new Date()).length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                    <p className="text-xs font-bold uppercase">No hay citas próximas</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
