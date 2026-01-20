import React, { useState } from 'react';
import { ToothState } from '../../types';

interface OdontogramProps {
    patientId: string;
    isEditable: boolean;
    initialState: Record<number, ToothState>;
}

export const Odontogram: React.FC<OdontogramProps> = ({ patientId, isEditable, initialState }) => {
    const [teeth, setTeeth] = useState<Record<number, ToothState>>(initialState);

    // Mock 32 teeth
    const teethIds = Array.from({ length: 32 }, (_, i) => i + 1); // 1-32 universal system mock

    const toggleToothStatus = (id: number) => {
        if (!isEditable) return;
        setTeeth(prev => {
            const current = prev[id]?.status || 'HEALTHY';
            let next: ToothState['status'] = 'HEALTHY';
            if (current === 'HEALTHY') next = 'CARIES';
            else if (current === 'CARIES') next = 'FILLING';
            else if (current === 'FILLING') next = 'EXTRACTED';
            else if (current === 'EXTRACTED') next = 'IMPLANT';
            else if (current === 'IMPLANT') next = 'CROWN';
            else next = 'HEALTHY';

            return {
                ...prev,
                [id]: { id, status: next }
            };
        });
    };

    return (
        <div className="flex flex-wrap gap-2 justify-center max-w-3xl p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
            {teethIds.map(id => {
                const status = teeth[id]?.status || 'HEALTHY';
                let bgClass = 'bg-white';
                if (status === 'CARIES') bgClass = 'bg-red-100 border-red-400';
                else if (status === 'FILLING') bgClass = 'bg-blue-100 border-blue-400';
                else if (status === 'EXTRACTED') bgClass = 'bg-slate-800 border-slate-900 opacity-50';
                else if (status === 'IMPLANT') bgClass = 'bg-purple-100 border-purple-400';
                else if (status === 'CROWN') bgClass = 'bg-amber-100 border-amber-400';

                return (
                    <div
                        key={id}
                        onClick={() => toggleToothStatus(id)}
                        className={`w-10 h-14 rounded-lg border-2 ${bgClass} flex items-center justify-center cursor-pointer transition-all hover:scale-110 relative`}
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
    );
};
