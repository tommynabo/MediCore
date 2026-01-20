import React, { useState, useEffect } from 'react';
import {
    Plus, Download, FileText, QrCode, TrendingDown, TrendingUp, BarChart3, DollarSign,
    CreditCard
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Invoice, Expense } from '../../types';

const Billing: React.FC = () => {
    const {
        invoices, setInvoices, patients, expenses, setExpenses, currentUserRole, api
    } = useAppContext();

    const [billingTab, setBillingTab] = useState<'overview' | 'invoices' | 'expenses'>('overview');
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [exportDate, setExportDate] = useState('');

    // Mock Data for Revenue History (Should be dynamic or from context)
    const REVENUE_HISTORY = [
        { day: 'Lun', amount: 1240 }, { day: 'Mar', amount: 1890 }, { day: 'Mie', amount: 1450 },
        { day: 'Jue', amount: 2420 }, { day: 'Vie', amount: 2110 }, { day: 'Sab', amount: 790 }, { day: 'Dom', amount: 0 }
    ];

    // Computed Stats
    const stats = React.useMemo(() => {
        const total = invoices.reduce((acc, curr) => acc + curr.amount, 0);
        const byCard = invoices.filter(i => i.paymentMethod === 'card').reduce((acc, curr) => acc + curr.amount, 0);
        const byCash = invoices.filter(i => i.paymentMethod === 'cash').reduce((acc, curr) => acc + curr.amount, 0);
        return { total, byCard, byCash, count: invoices.length };
    }, [invoices]);

    const handleDownloadZip = async (date: string) => {
        // Logic from App.tsx
        const dailyInvoices = invoices.filter(inv => inv.date === date);
        if (dailyInvoices.length === 0) {
            alert(`No hay facturas emitidas el día ${date}.`);
            return;
        }
        try {
            if (api.downloadBatchZip) {
                await api.downloadBatchZip(dailyInvoices, date);
                localStorage.setItem('lastBatchDownloadDate', date);
                alert(`✅ Descarga iniciada: ${dailyInvoices.length} facturas incluidas.`);
            } else {
                alert("Función de descarga no disponible.");
            }
        } catch (e) {
            alert("Error al descargar el archivo ZIP.");
            console.error(e);
        }
    };

    return (
        <div className="p-10 h-full overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="max-w-6xl mx-auto space-y-12">
                <div className="flex justify-between items-end">
                    <div>
                        <h3 className="text-3xl font-black text-slate-900 tracking-tight">Caja & Facturación</h3>
                        <p className="text-xs text-slate-500 font-black uppercase tracking-widest mt-2">Finanzas Veri*Factu AEAT Ready</p>
                    </div>
                    <button onClick={() => setIsInvoiceModalOpen(true)} className="bg-slate-900 text-white px-8 py-4 rounded-xl text-[11px] font-bold uppercase tracking-widest shadow-xl hover:bg-black transition-colors">
                        + Emitir Nueva Factura
                    </button>
                </div>

                <div className="flex gap-8 border-b border-slate-100 mb-8">
                    {(['overview', 'invoices', 'expenses'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setBillingTab(tab)}
                            className={`pb-4 text-[10px] font-black uppercase tracking-widest transition-colors ${billingTab === tab ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-300'}`}
                        >
                            {tab === 'overview' ? 'Vista General' : tab === 'invoices' ? 'Facturación' : 'Gastos'}
                        </button>
                    ))}
                </div>

                {billingTab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="col-span-2 bg-white p-10 rounded-2xl border border-slate-200 shadow-sm relative">
                            <div className="flex justify-between items-center mb-10">
                                <h4 className="text-sm font-bold uppercase tracking-widest text-slate-900 flex items-center gap-3"><BarChart3 className="text-blue-500" /> Ingresos Semanales</h4>
                            </div>
                            <div className="flex items-end justify-between gap-4 min-h-[160px]">
                                {REVENUE_HISTORY.map(data => (
                                    <div key={data.day} className="flex-1 flex flex-col items-center gap-3 group relative cursor-pointer">
                                        <div className="w-full bg-slate-100 rounded-xl relative overflow-hidden flex flex-col justify-end" style={{ height: '140px' }}>
                                            <div className="bg-blue-600 rounded-t-xl group-hover:bg-blue-700 transition-all duration-500" style={{ height: `${(data.amount / 2400) * 100}%` }}></div>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">{data.day}</span>
                                        <div className="absolute -top-12 opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[10px] font-bold px-4 py-2 rounded-xl transition-all shadow-xl pointer-events-none">
                                            {data.amount.toFixed(2)}€
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-slate-900 p-10 rounded-2xl text-white shadow-2xl flex flex-col justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Recaudación Real Hoy</p>
                                <p className="text-4xl font-bold text-blue-400">{stats.total.toFixed(2)}€</p>
                            </div>
                            <div className="space-y-4 pt-10 border-t border-white/10">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div><span className="text-xs font-bold text-slate-400">Efectivo</span></div>
                                    <span className="text-sm font-bold text-white">{stats.byCash.toFixed(2)}€</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div><span className="text-xs font-bold text-slate-400">Tarjeta</span></div>
                                    <span className="text-sm font-bold text-white">{stats.byCard.toFixed(2)}€</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {billingTab === 'invoices' && (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Fecha:</span>
                                <input
                                    type="date"
                                    value={exportDate}
                                    onChange={e => setExportDate(e.target.value)}
                                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100"
                                />
                            </div>
                            <button
                                onClick={() => handleDownloadZip(exportDate)}
                                disabled={!exportDate}
                                className="bg-blue-50 text-blue-600 px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                <Download size={16} /> Descargar ZIP Gestoría
                            </button>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-400 tracking-widest border-b border-slate-100">
                                    <tr><th className="p-6">Factura</th><th className="p-6">Paciente</th><th className="p-6">Importe</th><th className="p-6">Método</th><th className="p-6">Estado</th><th className="p-6">Veri*Factu</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {invoices.map(inv => (
                                        <tr key={inv.id} className="text-xs font-bold text-slate-600 hover:bg-slate-50">
                                            <td className="p-6">{inv.invoiceNumber}</td>
                                            <td className="p-6">{patients.find(p => p.id === inv.patientId)?.name || 'Anónimo'}</td>
                                            <td className="p-6 text-slate-900">{inv.amount.toFixed(2)}€</td>
                                            <td className="p-6 uppercase">{inv.paymentMethod}</td>
                                            <td className="p-6"><span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-[9px] font-bold uppercase">Emitida</span></td>
                                            <td className="p-6 flex gap-2">
                                                {inv.url && (
                                                    <button onClick={() => window.open(inv.url, '_blank')} className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-[10px] font-bold uppercase transition-colors">
                                                        <FileText size={16} /> PDF
                                                    </button>
                                                )}
                                                {inv.qrUrl && (
                                                    <button onClick={() => window.open(inv.qrUrl, '_blank')} className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-[10px] font-bold uppercase transition-colors">
                                                        <QrCode size={16} /> Certificado
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {billingTab === 'expenses' && (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="bg-white p-10 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                            <div className="flex justify-between items-center mb-8">
                                <h4 className="text-sm font-bold uppercase tracking-widest text-slate-900 flex items-center gap-3"><TrendingDown className="text-rose-500" /> Gastos Registrados</h4>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Total Gastos</p>
                                    <p className="text-3xl font-bold text-rose-500">{expenses.reduce((a, b) => a + b.amount, 0).toFixed(2)}€</p>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="text-[10px] font-bold uppercase text-slate-500 tracking-widest border-b border-slate-50">
                                        <tr><th className="pb-4 pl-4">Descripción</th><th className="pb-4">Categoría</th><th className="pb-4">Fecha</th><th className="pb-4 text-right pr-4">Importe</th><th className="pb-4 text-right">Doc</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {expenses.length === 0 ? (
                                            <tr><td colSpan={5} className="p-8 text-center text-slate-400 font-bold text-xs uppercase opacity-50">No hay gastos registrados</td></tr>
                                        ) : (
                                            expenses.map(exp => (
                                                <tr key={exp.id} className="text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                                                    <td className="p-4 pl-4 text-slate-900">{exp.description} <span className="block text-[9px] text-slate-400 font-normal">{exp.receiver}</span></td>
                                                    <td className="p-4"><span className="bg-slate-100 px-3 py-1 rounded-lg text-[9px] font-bold uppercase">{exp.category}</span></td>
                                                    <td className="p-4">{exp.date}</td>
                                                    <td className="p-4 pr-4 text-right font-bold text-rose-600">-{exp.amount.toFixed(2)}€</td>
                                                    <td className="p-4 text-right">
                                                        {exp.url && (
                                                            <button onClick={() => window.open(exp.url, '_blank')} className="text-slate-400 hover:text-blue-600 transition-colors" title="Descargar Factura">
                                                                <Download size={16} />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* INVOICE MODAL WOULD GO HERE (Can be extracted to a component) */}
            {isInvoiceModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                    <div className="bg-white p-8 rounded-2xl max-w-lg w-full">
                        <h3 className="text-xl font-bold mb-4">Nueva Factura</h3>
                        <p className="text-sm mb-6 text-gray-500">Funcionalidad en desarrollo para modularidad.</p>
                        <button onClick={() => setIsInvoiceModalOpen(false)} className="bg-slate-900 text-white px-4 py-2 rounded-lg">Cerrar</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Billing;
