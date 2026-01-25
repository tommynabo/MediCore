import React, { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { api } from '../services/api';

interface TreatmentsListProps {
    patientId: string;
    refreshTrigger?: number; // Prop to force refresh if needed
}

export const TreatmentsList: React.FC<TreatmentsListProps> = ({ patientId, refreshTrigger }) => {
    const [treatments, setTreatments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTreatments = () => {
        setLoading(true);
        api.treatments.getByPatient(patientId)
            .then(setTreatments)
            .catch(err => console.error("Error fetching treatments:", err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchTreatments();
    }, [patientId, refreshTrigger]);

    const handleDelete = async (ids: string[]) => {
        if (confirm("¿Seguro que quieres borrar estos tratamientos?")) {
            for (const id of ids) {
                await api.treatments.delete(id);
            }
            setTreatments(prev => prev.filter(t => !ids.includes(t.id)));
        }
    };

    if (loading) return <div className="text-center p-10 text-slate-400 text-xs">Cargando...</div>;

    if (treatments.length === 0) {
        return <div className="p-4 text-center text-slate-400 text-xs text-center mt-4">No hay tratamientos activos.</div>;
    }

    // Grouping Logic
    const grouped = Object.values(treatments.reduce((acc: any, t: any) => {
        const key = `${t.serviceName}-${t.status}-${t.price}`;
        if (!acc[key]) {
            acc[key] = { ...t, teeth: [t.toothId], count: 1, totalId: [t.id] };
        } else {
            acc[key].teeth.push(t.toothId);
            acc[key].count += 1;
            acc[key].totalId.push(t.id);
        }
        return acc;
    }, {}));

    return (
        <div className="space-y-2 mt-4">
            {grouped.map((group: any) => (
                <div key={group.id} className="grid grid-cols-12 gap-4 items-center p-3 bg-slate-50 rounded-xl text-[10px] font-black uppercase text-slate-600 border border-slate-100 hover:bg-blue-50 transition-colors cursor-pointer text-left group relative">

                    {/* Teeth Column with Click Interaction */}
                    <div className="col-span-1 border-r border-slate-200 pr-2 text-center text-slate-400 relative">
                        {group.count > 1 ? (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const el = document.getElementById(`teeth-popover-${group.id}`);
                                    if (el) el.classList.remove('hidden'); else el?.classList.add('hidden'); // Fallback logic if toggling fails? No, toggle is better.
                                    // React way:
                                    // specific check
                                    const el2 = document.getElementById(`teeth-popover-${group.id}`);
                                    if (el2) el2.style.display = el2.style.display === 'block' ? 'none' : 'block';
                                }}
                                className="cursor-pointer bg-blue-50 text-blue-600 px-2 py-1 rounded-md text-[9px] font-bold hover:bg-blue-100 transition-colors"
                            >
                                x{group.count}
                            </button>
                        ) : (
                            group.teeth[0] || '-'
                        )}

                        {/* Click-toggled Pop-up for Teeth */}
                        {group.count > 1 && (
                            <div
                                id={`teeth-popover-${group.id}`}
                                style={{ display: 'none' }}
                                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-800 text-white text-[10px] p-3 rounded-xl shadow-xl w-max z-50 animate-in zoom-in-95"
                            >
                                <p className="font-bold mb-1 opacity-50 uppercase tracking-wider text-[8px]">Piezas Afectadas</p>
                                <div className="font-mono text-xs text-nowrap">{group.teeth.join(', ')}</div>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                            </div>
                        )}
                    </div>

                    <div className="col-span-4 text-slate-900 line-clamp-1 flex flex-col" title={group.serviceName}>
                        <span>{group.serviceName}</span>
                        {group.notes && <span className="text-[9px] text-slate-400 normal-case">{group.notes}</span>}
                    </div>

                    <div className={`col-span-3 font-bold ${group.status === 'COMPLETED' ? 'text-emerald-600' : 'text-amber-500'}`}>
                        {group.status}
                    </div>

                    <div className="col-span-3 text-slate-900">
                        {group.price * group.count}€ {group.count > 1 && <span className="text-slate-400 text-[9px]">({group.price}€/u)</span>}
                    </div>

                    <div className="col-span-1 text-right">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(group.totalId);
                            }}
                            className="text-slate-400 hover:text-red-500 transition-colors"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};
