import React from 'react';
import { Star, TrendingUp, TrendingDown, Users, DollarSign, Activity, Calendar } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const Dashboard: React.FC = () => {
    const { patients, appointments, invoices } = useAppContext();

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
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">Buenos días, Dr. Martin</h2>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm h-64 flex items-center justify-center">
                        <p className="text-slate-300 font-black uppercase tracking-widest">Gráfico de Actividad (Próximamente)</p>
                    </div>
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm h-64 flex items-center justify-center">
                        <p className="text-slate-300 font-black uppercase tracking-widest">Próximas Citas (Próximamente)</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
