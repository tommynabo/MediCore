import React from 'react';
import { Package, Plus, Minus, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const Stock: React.FC = () => {
    const { stock, setStock } = useAppContext();

    return (
        <div className="p-10 h-full overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="max-w-6xl mx-auto space-y-12">
                <div className="flex justify-between items-end">
                    <div>
                        <h3 className="text-3xl font-bold text-slate-900 tracking-tight">Inventario</h3>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-2">Control de Stock en Tiempo Real</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {stock.map(item => (
                        <div key={item.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col group hover:border-blue-400 transition-all">
                            <div className="flex justify-between items-start mb-6">
                                <div className={`p-4 rounded-2xl ${item.quantity <= item.minStock ? 'bg-rose-50 text-rose-500' : 'bg-slate-50 text-slate-400'}`}>
                                    <Package size={24} />
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-slate-400 uppercase">{item.category}</p>
                                    <p className={`text-2xl font-black ${item.quantity <= item.minStock ? 'text-rose-600' : 'text-slate-900'}`}>{item.quantity} <span className="text-[10px] text-slate-400 font-bold">{item.unit}</span></p>
                                </div>
                            </div>
                            <p className="text-sm font-black text-slate-800 uppercase mb-8">{item.name}</p>
                            <div className="flex gap-2 mt-auto">
                                <button
                                    onClick={() => setStock(prev => prev.map(s => s.id === item.id ? { ...s, quantity: Math.max(0, s.quantity - 1) } : s))}
                                    className="flex-1 py-3 bg-slate-50 hover:bg-rose-50 rounded-xl flex justify-center text-slate-400 hover:text-rose-500 transition-colors"
                                >
                                    <Minus size={16} />
                                </button>
                                <button
                                    onClick={() => setStock(prev => prev.map(s => s.id === item.id ? { ...s, quantity: s.quantity + 1 } : s))}
                                    className="flex-1 py-3 bg-slate-50 hover:bg-emerald-50 rounded-xl flex justify-center text-slate-400 hover:text-emerald-500 transition-colors"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                            {item.quantity <= item.minStock && (
                                <div className="mt-4 flex items-center justify-center gap-2 text-[10px] font-bold text-rose-500 bg-rose-50 py-2 rounded-lg">
                                    <AlertTriangle size={12} /> Stock Crítico
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Stock;
