import React, { useState } from 'react';
import { ToothState } from '../../types';

interface OdontogramProps {
    patientId: string;
    isEditable: boolean;
    initialState: Record<number, ToothState>;
    onAddTreatment?: (toothId: number) => void;
    onAddToBudget?: (toothId: number, status: string) => void;
}

export const Odontogram: React.FC<OdontogramProps> = ({ patientId, isEditable, initialState, onAddTreatment, onAddToBudget }) => {
    const [teeth, setTeeth] = useState<Record<number, ToothState>>(initialState);
    const [selectedTooth, setSelectedTooth] = useState<number | null>(null);

    // Mock 32 teeth
    const teethIds = Array.from({ length: 32 }, (_, i) => i + 1);

    const updateStatus = (id: number, status: ToothState['status']) => {
        setTeeth(prev => ({
            ...prev,
            [id]: { id, status }
        }));
        setSelectedTooth(null);
    };

    return (
        <div className="relative">
            <div className="flex flex-wrap gap-2 justify-center max-w-3xl p-4 bg-white rounded-2xl border border-slate-200 shadow-sm relative z-0">
                {teethIds.map(id => {
                    const status = teeth[id]?.status || 'HEALTHY';
                    let bgClass = 'bg-white';
                    if (status === 'CARIES') bgClass = 'bg-red-100 border-red-400';
                    else if (status === 'FILLING') bgClass = 'bg-blue-100 border-blue-400';
                    else if (status === 'EXTRACTED') bgClass = 'bg-slate-800 border-slate-900 opacity-50';
                    else if (status === 'IMPLANT') bgClass = 'bg-purple-100 border-purple-400';
                    else if (status === 'CROWN') bgClass = 'bg-amber-100 border-amber-400';
                    else if (status === 'ENDODONTICS') bgClass = 'bg-pink-100 border-pink-400';
                    else if (status === 'BRIDGE') bgClass = 'bg-orange-100 border-orange-400';

                    return (
                        <div
                            key={id}
                            onClick={() => isEditable && setSelectedTooth(id)}
                            className={`w-10 h-14 rounded-lg border-2 ${bgClass} flex items-center justify-center cursor-pointer transition-all hover:scale-110 relative ${selectedTooth === id ? 'ring-4 ring-blue-500/20 scale-110 z-10' : ''}`}
                            title={`Diente ${id}: ${status}`}
                        >
                            <span className="text-[10px] font-bold text-slate-500 absolute top-1">{id}</span>
                            {status !== 'HEALTHY' && (
                                <span className="text-[8px] font-black uppercase mt-4">{status.slice(0, 3)}</span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* TOOTH ACTION POPUP */}
            {selectedTooth && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-2xl shadow-2xl border border-slate-200 z-50 w-72 animate-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                        <h4 className="font-black text-slate-900">Diente {selectedTooth}</h4>
                        <button onClick={() => setSelectedTooth(null)} className="text-slate-400 hover:text-red-500">✕</button>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">Estado</p>
                            <div className="grid grid-cols-2 gap-2">
                                {['HEALTHY', 'CARIES', 'FILLING', 'EXTRACTED', 'IMPLANT', 'CROWN', 'ENDODONTICS', 'BRIDGE'].map(s => (
                                    <button
                                        key={s}
                                        onClick={() => updateStatus(selectedTooth, s as any)}
                                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${teeth[selectedTooth]?.status === s ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-white hover:border-blue-300'}`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                            <button
                                onClick={() => { onAddTreatment && onAddTreatment(selectedTooth); setSelectedTooth(null); }}
                                className="w-full bg-blue-50 text-blue-600 py-2 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors"
                            >
                                + Tratamiento
                            </button>
                            <button
                                onClick={() => { onAddToBudget && onAddToBudget(selectedTooth, teeth[selectedTooth]?.status || 'HEALTHY'); setSelectedTooth(null); }}
                                className="w-full bg-emerald-50 text-emerald-600 py-2 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors"
                            >
                                + Presupuesto
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {selectedTooth && <div className="fixed inset-0 bg-black/5 z-0" onClick={() => setSelectedTooth(null)} />}
        </div>
    );
};
