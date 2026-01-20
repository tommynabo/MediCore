import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas'; // Make sure this is installed or mocked if needed
import { ToothState } from '../types';

interface OdontogramProps {
    initialState?: Record<string, ToothState>;
    onSave: (state: Record<string, ToothState>, imageInternalUrl: string) => void;
    onConditionAdd?: (tooth: number, status: string) => void; // New Prop
    readOnly?: boolean;
}

// ... (code omitted)

// Tooth Status Helper for Local Component Logic
type ToothStatus = ToothState['status'];

const TOOTH_NUMBERS = [
    [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28], // Upper
    [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]  // Lower
];

// Colors for conditions
const COLORS: Record<ToothStatus, string> = {
    HEALTHY: 'white',
    CARIES: '#ef4444', // Red
    CROWN: '#eab308', // Gold
    EXTRACTED: '#333333', // Dark Grey (X)
    FILLING: '#3b82f6', // Blue
    ENDODONTICS: '#a855f7', // Purple
    IMPLANT: '#22c55e', // Green
    BRIDGE: '#06b6d4', // Cyan
};

const LEGEND = [
    { label: 'Sano', color: COLORS.HEALTHY, status: 'HEALTHY' },
    { label: 'Caries', color: COLORS.CARIES, status: 'CARIES' },
    { label: 'Empaste', color: COLORS.FILLING, status: 'FILLING' },
    { label: 'Corona', color: COLORS.CROWN, status: 'CROWN' },
    { label: 'Extracción', color: COLORS.EXTRACTED, status: 'EXTRACTED' },
    { label: 'Endodoncia', color: COLORS.ENDODONTICS, status: 'ENDODONTICS' },
    { label: 'Implante Sano', color: COLORS.IMPLANT, status: 'IMPLANT' },
    { label: 'Puente', color: COLORS.BRIDGE, status: 'BRIDGE' },
];

export const Odontogram: React.FC<OdontogramProps> = ({ initialState = {}, onSave, onConditionAdd, readOnly = false }) => {
    const [state, setState] = useState<Record<string, ToothState>>(initialState);
    const [selectedTool, setSelectedTool] = useState<ToothStatus>('CARIES');
    const containerRef = useRef<HTMLDivElement>(null);

    // Sync prop changes
    useEffect(() => {
        if (initialState) setState(initialState);
    }, [initialState]);

    const handleToothClick = (number: number, part: string = 'whole') => {
        if (readOnly) return;

        // Requirement: Trigger the callback for budgets
        if (onConditionAdd && selectedTool !== 'HEALTHY') {
            onConditionAdd(number, selectedTool);
        }

        setState(prev => {
            const current = prev[number] || { id: number, status: 'HEALTHY', surfaces: [] };

            // If tool is whole-tooth action (Extract, Implant, Crown)
            if (['EXTRACTED', 'IMPLANT', 'CROWN', 'ENDODONTICS'].includes(selectedTool)) {
                return {
                    ...prev,
                    [number]: { ...current, status: selectedTool }
                };
            }

            // Surface specific (Caries, Filling)
            // Toggle surface
            let newSurfaces = [...(current.surfaces || [])];
            if (newSurfaces.includes(part)) {
                newSurfaces = newSurfaces.filter(s => s !== part);
            } else {
                newSurfaces.push(part);
            }

            return {
                ...prev,
                [number]: { ...current, status: selectedTool }
            };
        });
    };

    const handleSave = async () => {
        if (!containerRef.current) return;
        try {
            const canvas = await html2canvas(containerRef.current, { backgroundColor: '#ffffff', scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            onSave(state, imgData);
        } catch (e) {
            console.error("Snapshot failed", e);
            alert("Error generando imagen");
        }
    };

    return (
        <div className="flex flex-col gap-6">
            {/* TOOLBAR */}
            {!readOnly && (
                <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    {LEGEND.map(item => (
                        <button
                            key={item.status}
                            onClick={() => setSelectedTool(item.status as ToothStatus)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${selectedTool === item.status ? 'bg-white border-blue-500 shadow-md ring-2 ring-blue-500/20' : 'bg-transparent border-transparent hover:bg-slate-200'}`}
                        >
                            <div className="w-4 h-4 rounded-full border border-slate-300" style={{ backgroundColor: item.color }}></div>
                            <span className="text-xs font-bold text-slate-700">{item.label}</span>
                        </button>
                    ))}
                    <div className="flex-1"></div>
                    <button onClick={handleSave} className="bg-slate-900 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-transform">
                        Guardar Cambios
                    </button>
                </div>
            )}

            {/* CANVAS AREA */}
            <div ref={containerRef} className="p-8 bg-white border border-slate-200 rounded-[2rem] shadow-sm flex flex-col gap-8 items-center justify-center min-h-[400px]">
                {/* UPPER JAW */}
                <div className="flex gap-1">
                    {TOOTH_NUMBERS[0].map(id => (
                        <Tooth key={id} id={id} data={state[id]} onClick={() => handleToothClick(id)} />
                    ))}
                </div>

                {/* LOWER JAW */}
                <div className="flex gap-1">
                    {TOOTH_NUMBERS[1].map(id => (
                        <Tooth key={id} id={id} data={state[id]} onClick={() => handleToothClick(id)} />
                    ))}
                </div>

                <div className="absolute bottom-4 right-8 opacity-20 pointer-events-none">
                    <h1 className="text-4xl font-black text-slate-900">MEDI<span className="text-blue-600">CORE</span></h1>
                    <p className="text-xs font-bold text-right pt-1">{new Date().toLocaleDateString()}</p>
                </div>
            </div>
        </div>
    );
};

// SVG TOOTH COMPONENT (Schematic)
const Tooth: React.FC<{ id: number, data?: ToothState, onClick: () => void }> = ({ id, data, onClick }) => {
    const status = data?.status || 'HEALTHY';
    const color = COLORS[status];

    // Specific rendering for Extracted (X)
    if (status === 'EXTRACTED') {
        return (
            <div onClick={onClick} className="w-10 h-14 relative cursor-pointer opacity-50 hover:opacity-100 transition-opacity">
                <span className="absolute -top-6 w-full text-center text-[10px] font-bold text-slate-400">{id}</span>
                <svg viewBox="0 0 100 140" className="w-full h-full drop-shadow-sm">
                    {/* Outline Ghost */}
                    <path d="M20,20 Q50,0 80,20 L90,80 Q50,140 10,80 L20,20 Z" fill="none" stroke="#ddd" strokeWidth="2" />
                    {/* Big Red X */}
                    <line x1="20" y1="20" x2="80" y2="120" stroke="red" strokeWidth="8" />
                    <line x1="80" y1="20" x2="20" y2="120" stroke="red" strokeWidth="8" />
                </svg>
            </div>
        )
    }

    // Implant (Screw shape)
    if (status === 'IMPLANT') {
        return (
            <div onClick={onClick} className="w-10 h-14 relative cursor-pointer hover:scale-110 transition-transform">
                <span className="absolute -top-6 w-full text-center text-[10px] font-bold text-slate-400">{id}</span>
                <svg viewBox="0 0 100 140" className="w-full h-full drop-shadow-sm">
                    {/* Screw */}
                    <rect x="35" y="40" width="30" height="80" fill={color} rx="5" />
                    <line x1="35" y1="50" x2="65" y2="50" stroke="white" strokeWidth="2" />
                    <line x1="35" y1="70" x2="65" y2="70" stroke="white" strokeWidth="2" />
                    <line x1="35" y1="90" x2="65" y2="90" stroke="white" strokeWidth="2" />
                    {/* Crown on top */}
                    <path d="M20,20 Q50,0 80,20 L90,40 L10,40 L20,20 Z" fill="white" stroke="#333" strokeWidth="2" />
                </svg>
            </div>
        )
    }

    // Normal Tooth (5 Faces)
    return (
        <div onClick={onClick} className="w-10 h-14 relative cursor-pointer hover:translate-y-[-4px] transition-transform group">
            <span className="absolute -top-6 w-full text-center text-[10px] font-bold text-slate-400 group-hover:text-blue-500">{id}</span>
            <svg viewBox="0 0 100 140" className="w-full h-full drop-shadow-sm">
                {/* Base Shape */}
                <path d="M20,20 Q50,0 80,20 L90,100 Q50,140 10,100 L20,20 Z" fill="white" stroke="#333" strokeWidth="2" />

                {/* Fill if configured */}
                <path d="M25,25 Q50,10 75,25 L85,95 Q50,130 15,95 L25,25 Z" fill={color} stroke="none" className="transition-colors duration-300" />

                {/* Gloss/Highlight */}
                <ellipse cx="65" cy="40" rx="10" ry="15" fill="white" fillOpacity="0.3" />
            </svg>
        </div>
    );
};
