import React, { useState, useEffect } from 'react';
import {
    Download, DollarSign, Calendar, User, FileText, Trash2,
    Plus, BarChart3, QrCode, TrendingDown, TrendingUp, CreditCard
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { api as apiService } from '../services/api'; // Direct import to avoid context issues
import { Invoice, Expense } from '../../types';

const Billing: React.FC = () => {
    const { patients, invoices, setInvoices, expenses, setExpenses, currentUserRole } = useAppContext();
    const api = apiService; // Use direct import

    const [billingTab, setBillingTab] = useState<'overview' | 'invoices' | 'expenses'>('overview');
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [exportDate, setExportDate] = useState('');

    // Invoice Creation State
    const [selectedPatientId, setSelectedPatientId] = useState('');
    const [invoiceItems, setInvoiceItems] = useState<{ name: string, price: number }[]>([{ name: 'Consulta General', price: 50.0 }]);
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash' | 'transfer'>('card');
    const [isEmitting, setIsEmitting] = useState(false);
    const [emitError, setEmitError] = useState<string | null>(null);

    const handleAddItem = () => {
        setInvoiceItems([...invoiceItems, { name: '', price: 0 }]);
    };

    const handleRemoveItem = (index: number) => {
        setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
    };

    const handleItemChange = (index: number, field: 'name' | 'price', value: string | number) => {
        const newItems = [...invoiceItems];
        if (field === 'price') newItems[index].price = parseFloat(value as string) || 0;
        else newItems[index].name = value as string;
        setInvoiceItems(newItems);
    };

    const handleEmitInvoice = async () => {
        if (!selectedPatientId) return setEmitError("Selecciona un paciente");
        if (invoiceItems.length === 0) return setEmitError("Añade al menos un concepto");

        setIsEmitting(true);
        setEmitError(null);

        try {
            const patient = patients.find(p => p.id === selectedPatientId);
            if (!patient) throw new Error("Paciente no encontrado");

            const payload = {
                patient: patient,
                items: invoiceItems,
                paymentMethod: 'card',
                type: 'invoice'
            };

            const data = await api.invoices.create(payload) as any;

            // Add invoice to local state
            const newInvoice: any = {
                id: data.invoiceNumber || data.invoice_number || `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                invoiceNumber: data.invoiceNumber || data.invoice_number,
                amount: invoiceItems.reduce((sum, i) => sum + i.price, 0),
                patientId: patient.id,
                date: new Date().toISOString(),
                status: 'issued',
                paymentMethod: 'card',
                url: data.url || data.pdf_url,
                qrUrl: data.qr_url || data.qrUrl
            };

            setInvoices(prev => [newInvoice, ...prev]);

            // Success
            alert(`✅ Factura ${data.invoiceNumber || data.invoice_number} emitida con éxito!`);

            // Open PDF only if URL exists
            if (data.url || data.pdf_url) {
                window.open(data.url || data.pdf_url, '_blank');
            }

            setIsInvoiceModalOpen(false);

            // Reset form
            setSelectedPatientId('');
            setInvoiceItems([{ name: 'Consulta General', price: 50.0 }]);

        } catch (e: any) {
            console.error("Emit Error", e);
            console.log("API State:", api);
            setEmitError(e.message);
        } finally {
            setIsEmitting(false);
        }
    };

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
                    <div className="space-y-8 animate-in fade-in duration-700">
                        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/20 shadow-2xl flex justify-between items-center relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="flex items-center gap-6">
                                <div className="bg-slate-100 p-4 rounded-2xl text-slate-500">
                                    <FileText size={24} />
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Periodo Fiscal</span>
                                    <input
                                        type="date"
                                        value={exportDate}
                                        onChange={e => setExportDate(e.target.value)}
                                        className="bg-transparent border-none text-xl font-bold text-slate-900 outline-none p-0 focus:ring-0"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={() => handleDownloadZip(exportDate)}
                                disabled={!exportDate}
                                className="bg-slate-900 text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-black hover:scale-105 transition-all flex items-center gap-3 disabled:opacity-50 shadow-xl disabled:shadow-none"
                            >
                                <Download size={18} /> Descargar ZIP Gestoría
                            </button>
                        </div>

                        <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-2xl">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                    <tr>
                                        <th className="p-8 pl-10">Factura</th>
                                        <th className="p-8">Paciente</th>
                                        <th className="p-8 text-right">Importe</th>
                                        <th className="p-8 text-center">Método</th>
                                        <th className="p-8 text-center">Estado</th>
                                        <th className="p-8 text-right pr-10">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {invoices.length === 0 ? (
                                        <tr><td colSpan={6} className="p-16 text-center text-slate-400 font-bold uppercase tracking-widest opacity-50">No hay facturas emitidas</td></tr>
                                    ) : (
                                        invoices.map((inv, idx) => (
                                            <tr key={inv.id} className="group hover:bg-blue-50/30 transition-colors duration-300">
                                                <td className="p-8 pl-10">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                                            #{idx + 1}
                                                        </div>
                                                        <span className="font-bold text-slate-900 text-sm tracking-tight">{inv.invoiceNumber}</span>
                                                    </div>
                                                </td>
                                                <td className="p-8">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-700 text-sm">{patients.find(p => p.id === inv.patientId)?.name || 'Anónimo'}</span>
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{patients.find(p => p.id === inv.patientId)?.dni || '---'}</span>
                                                    </div>
                                                </td>
                                                <td className="p-8 text-right">
                                                    <span className="font-black text-slate-900 text-lg">{inv.amount.toFixed(2)}€</span>
                                                </td>
                                                <td className="p-8 text-center">
                                                    <span className="bg-slate-100 px-4 py-2 rounded-xl text-[10px] font-black uppercase text-slate-500 tracking-wider">
                                                        {inv.paymentMethod}
                                                    </span>
                                                </td>
                                                <td className="p-8 text-center">
                                                    <div className="inline-flex items-center gap-2 bg-emerald-100/50 border border-emerald-100 px-4 py-2 rounded-xl">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                                        <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Emitida</span>
                                                    </div>
                                                </td>
                                                <td className="p-8 pr-10 text-right">
                                                    <div className="flex justify-end gap-3 opacity-60 group-hover:opacity-100 transition-opacity">
                                                        {inv.url && (
                                                            <button onClick={() => window.open(inv.url, '_blank')} className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:border-rose-200 transition-all shadow-sm hover:shadow-md">
                                                                <FileText size={18} />
                                                            </button>
                                                        )}
                                                        {inv.qrUrl && (
                                                            <button onClick={() => window.open(inv.qrUrl, '_blank')} className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm hover:shadow-md">
                                                                <QrCode size={18} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
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

            {/* INVOICE MODAL */}
            {isInvoiceModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in zoom-in-50 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Nueva Factura Oficial</h3>
                                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Veri*Factu / FacturaDirecta</p>
                            </div>
                            <button onClick={() => setIsInvoiceModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                ✕
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            {/* Patient Selection (Improved with Search) */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500 tracking-widest">Paciente</label>
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        placeholder="🔍 Buscar paciente por nombre o DNI..."
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                                        list="patient-list"
                                        onChange={(e) => {
                                            // Simple matcher: if input matches a name exactly, select ID
                                            // But real user wants to select from list. Datalist is good for this.
                                            const val = e.target.value;
                                            const found = patients.find(p => p.name === val || p.dni === val || `${p.name} - ${p.dni}` === val);
                                            if (found) setSelectedPatientId(found.id);
                                        }}
                                    />
                                    <datalist id="patient-list">
                                        {(patients || []).map(p => (
                                            <option key={p.id} value={`${p.name} - ${p.dni}`} />
                                        ))}
                                    </datalist>
                                    {/* Fallback/Explicit select to confirm selection if input is ambiguous */}
                                    <select
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-600 outline-none"
                                        value={selectedPatientId}
                                        onChange={(e) => setSelectedPatientId(e.target.value)}
                                    >
                                        <option value="">-- Confirmar Paciente --</option>
                                        {(patients || []).map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Payment Method Selector */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500 tracking-widest">Método de Pago</label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                                >
                                    <option value="card">Tarjeta de Crédito/Débito</option>
                                    <option value="cash">Efectivo</option>
                                    <option value="transfer">Transferencia Bancaria</option>
                                </select>
                            </div>

                            {/* Items */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold uppercase text-slate-500 tracking-widest">Conceptos</label>
                                    <button onClick={handleAddItem} className="text-[10px] font-bold uppercase text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-1 rounded-lg">
                                        + Añadir Línea
                                    </button>
                                </div>
                                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                    {invoiceItems.map((item, idx) => (
                                        <div key={idx} className="flex gap-2 items-center">
                                            <input
                                                type="text"
                                                placeholder="Descripción del servicio"
                                                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-blue-300 transition-all"
                                                value={item.name}
                                                onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                                            />
                                            <input
                                                type="number"
                                                placeholder="€"
                                                className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none focus:border-blue-300 transition-all text-right"
                                                value={item.price}
                                                onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                                            />
                                            <button onClick={() => handleRemoveItem(idx)} className="text-slate-300 hover:text-rose-500 transition-colors p-2">
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className="text-right border-t border-slate-100 pt-4">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-4">Total Factura</span>
                                    <span className="text-2xl font-black text-slate-900">{invoiceItems.reduce((sum, i) => sum + i.price, 0).toFixed(2)}€</span>
                                </div>
                            </div>

                            {/* Error Message */}
                            {emitError && (
                                <div className="bg-rose-50 text-rose-600 p-4 rounded-xl text-xs font-bold flex items-center gap-2">
                                    ⚠️ {emitError}
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button
                                onClick={() => setIsInvoiceModalOpen(false)}
                                className="px-6 py-3 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-200 transition-colors uppercase tracking-widest"
                                disabled={isEmitting}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleEmitInvoice}
                                disabled={isEmitting}
                                className="bg-slate-900 text-white px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isEmitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Conectando Hacienda...
                                    </>
                                ) : (
                                    <>✅ Emitir Factura</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Billing;
