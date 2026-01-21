import React, { useState } from 'react';
import { ToothState } from '../../types';
import { Check, AlertCircle, Plus, DollarSign, FileText } from 'lucide-react';

interface OdontogramProps {
    patientId: string;
    isEditable: boolean;
    initialState: Record<number, ToothState>;
    onAddTreatment?: (toothId: number) => void;
    onAddToBudget?: (toothId: number, status: string) => void;
}

// SVG PATHS (Simplified Realistic Shapes)
const PATHS = {
    incisor: "M10,5 L20,5 L22,30 L15,45 L8,30 Z",
    canine: "M15,2 L25,10 L22,35 L15,50 L8,35 L5,10 Z",
    premolar: "M5,5 L25,5 L28,25 L15,40 L2,25 Z",
    molar: "M2,5 L10,2 L20,2 L28,5 L30,20 L25,35 L15,40 L5,35 L0,20 Z"
};

// Mapping ISO 3950 to Shapes
const getToothShape = (id: number) => {
    const n = id % 10;
    if (n >= 1 && n <= 2) return PATHS.incisor; // Central/Lateral Incisor
    if (n === 3) return PATHS.canine; // Canine
    if (n >= 4 && n <= 5) return PATHS.premolar; // Premolars
    return PATHS.molar; // Molars (6,7,8)
};

const getToothLabel = (id: number) => {
    const n = id % 10;
    const names = ["", "Incisivo Central", "Incisivo Lateral", "Canino", "Premolar 1", "Premolar 2", "Molar 1", "Molar 2", "Molar 3"];
    return `${id} - ${names[n] || 'Diente'}`;
};

export const Odontogram: React.FC<OdontogramProps> = ({ patientId, isEditable, initialState, onAddTreatment, onAddToBudget }) => {
    const [teeth, setTeeth] = useState<Record<number, ToothState>>(initialState);
    const [selectedTooth, setSelectedTooth] = useState<number | null>(null);

    // Quadrants (FDI Notation)
    const q1 = [18, 17, 16, 15, 14, 13, 12, 11]; // Upper Right
    const q2 = [21, 22, 23, 24, 25, 26, 27, 28]; // Upper Left
    const q3 = [38, 37, 36, 35, 34, 33, 32, 31]; // Lower Left (Standard view is inverted L/R usually, let's stick to chart)
    const q4 = [41, 42, 43, 44, 45, 46, 47, 48]; // Lower Right

    // Correct visual order: Right side of mouth is Left on screen usually for doctors viewing patient
    // Screen Left: Q1 (18-11), Q4 (48-41)
    // Screen Right: Q2 (21-28), Q3 (31-38)

    // Status Colors
    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'CARIES': return 'fill-red-400 stroke-red-600';
            case 'FILLED': return 'fill-blue-400 stroke-blue-600';
            case 'MISSING': return 'fill-slate-200 stroke-slate-300 opacity-50';
            case 'CROWN': return 'fill-yellow-400 stroke-yellow-600';
            case 'ENDODONTICS': return 'fill-purple-400 stroke-purple-600';
            default: return 'fill-white stroke-slate-400 hover:fill-slate-50';
        }
    };

    const handleToothClick = (id: number) => {
        if (!isEditable) return;
        setSelectedTooth(id);
    };

    const updateStatus = (id: number, status: ToothState['status']) => {
        setTeeth(prev => ({ ...prev, [id]: { id, status } }));
        setSelectedTooth(null);
    };

    return (
        <div className="relative p-6 bg-slate-50 rounded-[2rem] border border-slate-200 shadow-inner max-w-5xl mx-auto">

            {/* Upper Jaw */}
            <div className="flex justify-center gap-12 mb-8">
                {/* Q1 (Right Patient -> Left Screen) */}
                <div className="flex gap-1">
                    {q1.map(id => (
                        <Tooth key={id} id={id} status={teeth[id]?.status} onClick={() => handleToothClick(id)} />
                    ))}
                </div>
                {/* Q2 (Left Patient -> Right Screen) */}
                <div className="flex gap-1">
                    {q2.map(id => (
                        <Tooth key={id} id={id} status={teeth[id]?.status} onClick={() => handleToothClick(id)} />
                    ))}
                </div>
            </div>

            {/* Lower Jaw */}
            <div className="flex justify-center gap-12">
                {/* Q4 (Right Patient -> Left Screen) */}
                <div className="flex gap-1">
                    {q4.reverse().map(id => (
                        <Tooth key={id} id={id} status={teeth[id]?.status} onClick={() => handleToothClick(id)} />
                    ))}
                </div>
                {/* Q3 (Left Patient -> Right Screen) */}
                <div className="flex gap-1">
                    {q3.map(id => (
                        <Tooth key={id} id={id} status={teeth[id]?.status} onClick={() => handleToothClick(id)} />
                    ))}
                </div>
            </div>

            {/* POPUP MENU */}
            {selectedTooth && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-2xl shadow-2xl border border-slate-100 z-50 w-80 animate-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-black text-slate-900 text-lg">{getToothLabel(selectedTooth)}</h4>
                        <button onClick={() => setSelectedTooth(null)} className="text-slate-400 hover:text-slate-900 font-bold">✕</button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-4">
                        {[
                            { l: 'Sano', s: 'HEALTHY', c: 'bg-slate-100 text-slate-600' },
                            { l: 'Caries', s: 'CARIES', c: 'bg-red-100 text-red-700' },
                            { l: 'Empaste', s: 'FILLED', c: 'bg-blue-100 text-blue-700' },
                            { l: 'Corona', s: 'CROWN', c: 'bg-yellow-100 text-yellow-700' },
                            { l: 'Endodoncia', s: 'ENDODONTICS', c: 'bg-purple-100 text-purple-700' },
                            { l: 'Ausente', s: 'MISSING', c: 'bg-slate-200 text-slate-500 line-through' },
                        ].map((opt) => (
                            <button
                                key={opt.s}
                                onClick={() => updateStatus(selectedTooth, opt.s as any)}
                                className={`px-3 py-2 rounded-xl text-xs font-bold ${opt.c} hover:brightness-95 transition-all`}
                            >
                                {opt.l}
                            </button>
                        ))}
                    </div>

                    <div className="space-y-2 pt-4 border-t border-slate-100">
                        {onAddTreatment && (
                            <button
                                onClick={() => { onAddTreatment(selectedTooth); setSelectedTooth(null); }}
                                className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase flex items-center justify-center gap-2 hover:bg-slate-800"
                            >
                                <FileText size={14} /> Añadir Tratamiento
                            </button>
                        )}
                        {onAddToBudget && (
                            <button
                                onClick={() => { onAddToBudget(selectedTooth, teeth[selectedTooth]?.status || 'General'); setSelectedTooth(null); }}
                                className="w-full py-3 bg-white border-2 border-slate-900 text-slate-900 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 hover:bg-slate-50"
                            >
                                <DollarSign size={14} /> Añadir a Presupuesto
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* DIMMED OVERLAY */}
            {selectedTooth && <div className="absolute inset-0 bg-slate-900/10 rounded-[2rem] z-40" onClick={() => setSelectedTooth(null)} />}
        </div>
    );
};

const Tooth: React.FC<{ id: number; status?: string; onClick: () => void }> = ({ id, status, onClick }) => {
    const shape = getToothShape(id);
    const colorClass = (status === 'CARIES') ? 'fill-red-400 stroke-red-600' :
        (status === 'FILLED') ? 'fill-blue-400 stroke-blue-600' :
            (status === 'CROWN') ? 'fill-yellow-400 stroke-yellow-600' :
                (status === 'ENDODONTICS') ? 'fill-purple-300 stroke-purple-500' :
                    (status === 'MISSING') ? 'opacity-0' :
                        'fill-white stroke-slate-300 hover:fill-blue-50 hover:stroke-blue-400';

    return (
        <div className="flex flex-col items-center gap-1 cursor-pointer group" onClick={onClick}>
            <span className="text-[9px] font-bold text-slate-400 group-hover:text-blue-500">{id}</span>
            <svg width="35" height="55" viewBox="0 0 35 55" className={`transition-all duration-300 drop-shadow-sm group-hover:drop-shadow-md group-hover:-translate-y-1`}>
                <path d={shape} className={`${colorClass} stroke-[2px]`} />
                {/* Root hint */}
                <path d="M15,40 L15,50" className="stroke-slate-200 stroke-1" />
            </svg>
        </div>
    );
};
