import React, { useState, useEffect } from 'react';
import { Search, Trash2, FileText, Plus, X, Save } from 'lucide-react';
import { PatientTreatment } from '../../types';
import { useAppContext } from '../context/AppContext';

interface OdontogramProps {
    patientId: string;
    isEditable: boolean;
    onTreatmentsChange?: (treatments: PatientTreatment[]) => void;
}

// SVG PATHS para dientes
const PATHS = {
    incisor: "M10,5 L20,5 L22,30 L15,45 L8,30 Z",
    canine: "M15,2 L25,10 L22,35 L15,50 L8,35 L5,10 Z",
    premolar: "M5,5 L25,5 L28,25 L15,40 L2,25 Z",
    molar: "M2,5 L10,2 L20,2 L28,5 L30,20 L25,35 L15,40 L5,35 L0,20 Z"
};

const getToothShape = (id: number): string => {
    // Para dientes temporales (51-85), los molares (4 y 5) tienen forma de molar
    if (id >= 51) {
        const lastDigit = id % 10;
        if (lastDigit >= 1 && lastDigit <= 3) return PATHS.incisor; // Simplifcamos visualmente incisivos/caninos
        if (lastDigit >= 4) return PATHS.molar;
        return PATHS.molar;
    }

    // Para definitivos
    const lastDigit = id % 10;
    if (lastDigit >= 1 && lastDigit <= 2) return PATHS.incisor;
    if (lastDigit === 3) return PATHS.canine;
    if (lastDigit === 4 || lastDigit === 5) return PATHS.premolar;
    return PATHS.molar;
};

// Servicios dentales
const ALL_SERVICES = [
    { id: 'srv-1', name: 'Limpieza Dental', price: 60 },
    { id: 'srv-2', name: 'Extracción', price: 150 },
    { id: 'srv-3', name: 'Empaste', price: 80 },
    { id: 'srv-4', name: 'Endodoncia', price: 350 },
    { id: 'srv-5', name: 'Corona', price: 450 },
    { id: 'srv-6', name: 'Implante', price: 1200 },
    { id: 'srv-7', name: 'Blanqueamiento', price: 200 },
    { id: 'srv-8', name: 'Ortodoncia (mensual)', price: 180 },
    { id: 'srv-9', name: 'Carilla', price: 300 },
    { id: 'srv-10', name: 'Puente', price: 800 },
];

// Definition of Quadrants
const QUADRANTS = {
    Q1: [18, 17, 16, 15, 14, 13, 12, 11],
    Q2: [21, 22, 23, 24, 25, 26, 27, 28],
    Q3: [31, 32, 33, 34, 35, 36, 37, 38], // Rendered reversed to match visual flow? Standard is Left->Right Q4-Q3 or Q3-Q4.
    // Standard visualization (Patient facing us):
    // Right (Screen Left): 18-11 ... 48-41
    // Left (Screen Right): 21-28 ... 31-38
    // So Q3 (31-38) matches Q2 (21-28) direction.
    // But Q4 (48-41) matches Q1 (18-11) direction.
    Q4: [48, 47, 46, 45, 44, 43, 42, 41],

    // Deciduous
    Q5: [55, 54, 53, 52, 51],
    Q6: [61, 62, 63, 64, 65],
    Q7: [71, 72, 73, 74, 75],
    Q8: [85, 84, 83, 82, 81]
};

export const Odontogram: React.FC<OdontogramProps> = ({
    patientId,
    isEditable,
    onTreatmentsChange
}) => {
    const { api } = useAppContext();

    // Estados
    const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
    const [treatments, setTreatments] = useState<PatientTreatment[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTreatmentsForBudget, setSelectedTreatmentsForBudget] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Cargar tratamientos del paciente desde API
    useEffect(() => {
        if (patientId && api?.treatments?.getByPatient) {
            api.treatments.getByPatient(patientId)
                .then((data: PatientTreatment[]) => {
                    const visible = (data || []).filter(t => t.status !== 'PRESUPUESTADO');
                    setTreatments(visible);
                    onTreatmentsChange?.(visible);
                })
                .catch(err => console.error("Error cargando tratamientos:", err));
        }
    }, [patientId, api]);

    // Helper para filtrar tratamientos por diente
    const getToothTreatments = (toothId: number) => treatments.filter(t => t.toothId === toothId);

    // Filtrar servicios según búsqueda
    const filteredServices = ALL_SERVICES.filter(service =>
        service.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Manejo de clic en diente
    const handleToothClick = (toothId: number, event: React.MouseEvent) => {
        if (!isEditable) return;

        if (event.ctrlKey || event.metaKey) {
            setSelectedTeeth(prev =>
                prev.includes(toothId)
                    ? prev.filter(id => id !== toothId)
                    : [...prev, toothId]
            );
        } else {
            setSelectedTeeth([toothId]);
        }
    };

    // Añadir tratamiento a dientes seleccionados
    const handleAddTreatment = (service: typeof ALL_SERVICES[0]) => {
        if (selectedTeeth.length === 0) {
            alert('Selecciona al menos un diente');
            return;
        }

        const newTreatments: PatientTreatment[] = selectedTeeth.map(toothId => ({
            id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            patientId,
            serviceId: service.id,
            serviceName: service.name,
            toothId,
            price: service.price,
            status: 'PENDIENTE',
            createdAt: new Date().toISOString()
        }));

        const updatedTreatments = [...treatments, ...newTreatments];
        setTreatments(updatedTreatments);
        onTreatmentsChange?.(updatedTreatments);

        setSelectedTeeth([]);
        setSearchTerm('');
    };

    // Eliminar tratamiento
    const handleDeleteTreatment = async (treatmentId: string) => {
        if (!confirm('¿Eliminar este tratamiento?')) return;

        if (treatmentId.startsWith('temp-')) {
            const updated = treatments.filter(t => t.id !== treatmentId);
            setTreatments(updated);
            onTreatmentsChange?.(updated);
            return;
        }

        try {
            await api.treatments.delete(treatmentId);
            const updated = treatments.filter(t => t.id !== treatmentId);
            setTreatments(updated);
            onTreatmentsChange?.(updated);
        } catch (error) {
            console.error(error);
            alert("Error al eliminar el tratamiento del servidor.");
        }
    };

    // Guardar Tratamientos
    const handleSaveTreatments = async () => {
        setIsSaving(true);
        try {
            const newTreatments = treatments.filter(t => t.id.startsWith('temp-'));

            if (newTreatments.length === 0) {
                alert("No hay tratamientos nuevos para guardar.");
                setIsSaving(false);
                return;
            }

            const treatmentsPayload = newTreatments.map(({ id, ...rest }) => rest);

            await api.treatments.createBatch(patientId, treatmentsPayload);

            const reloaded = await api.treatments.getByPatient(patientId);
            setTreatments(reloaded);
            onTreatmentsChange?.(reloaded);

            alert("✅ Tratamientos guardados correctamente.");
        } catch (error) {
            console.error(error);
            alert("Error al guardar tratamientos.");
        } finally {
            setIsSaving(false);
        }
    };

    // Generar presupuesto
    const handleCreateBudget = async () => {
        let itemsToBudget = [];
        if (selectedTreatmentsForBudget.length > 0) {
            itemsToBudget = treatments.filter(t => selectedTreatmentsForBudget.includes(t.id));
        } else {
            const pending = treatments.filter(t => t.status === 'PENDIENTE');
            if (pending.length > 0) itemsToBudget = pending;
            else if (treatments.length > 0) itemsToBudget = treatments;
        }

        if (itemsToBudget.length === 0) {
            alert('No hay tratamientos disponibles para presupuestar.');
            return;
        }

        if (confirm(`¿Crear presupuesto con ${itemsToBudget.length} tratamientos?`)) {
            try {
                const tempItems = itemsToBudget.filter(t => t.id.startsWith('temp-'));
                let finalItemsToBudget = itemsToBudget;

                if (tempItems.length > 0) {
                    setIsSaving(true);
                    const treatmentsPayload = tempItems.map(({ id, ...rest }) => rest);
                    await api.treatments.createBatch(patientId, treatmentsPayload);

                    const reloaded = await api.treatments.getByPatient(patientId);
                    setTreatments(reloaded);
                    onTreatmentsChange?.(reloaded);

                    finalItemsToBudget = reloaded.filter(t => t.status === 'PENDIENTE');
                    setIsSaving(false);
                }

                if (finalItemsToBudget.length === 0) {
                    alert("No se pudieron recuperar los tratamientos guardados para presupuestar.");
                    return;
                }

                const budgetItems = finalItemsToBudget.map(t => ({
                    id: crypto.randomUUID(),
                    name: `${t.serviceName} - Diente ${t.toothId || 'General'}`,
                    price: t.price,
                    serviceId: t.serviceId,
                    treatmentId: t.id
                }));

                await api.budget.create(patientId, budgetItems);

                alert(`✅ Tratamientos guardados y Presupuesto creado correctamente.`);
                setSelectedTreatmentsForBudget([]);

            } catch (error) {
                console.error(error);
                alert("Error al procesar: " + (error.message || error));
                setIsSaving(false);
            }
        }
    };

    // Render helper for rows of teeth
    const renderToothRow = (teethIds: number[], label?: string) => (
        <div className="flex justify-center gap-1 flex-wrap">
            {teethIds.map(toothId => (
                <Tooth
                    key={toothId}
                    id={toothId}
                    treatments={getToothTreatments(toothId)}
                    isSelected={selectedTeeth.includes(toothId)}
                    onClick={(e) => handleToothClick(toothId, e)}
                />
            ))}
        </div>
    );

    return (
        <div className="w-full space-y-6">
            <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm relative">

                {/* Botón Guardar */}
                <div className="absolute top-8 right-8 z-10">
                    <button
                        onClick={handleSaveTreatments}
                        disabled={isSaving || !treatments.some(t => t.id.startsWith('temp-'))}
                        className="bg-slate-900 text-white px-6 py-3 rounded-xl text-sm font-black uppercase flex items-center gap-2 shadow-lg hover:bg-black hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save size={18} />
                        {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>

                {/* Instructions Alert */}
                <div className="mb-8 p-4 bg-blue-50 rounded-xl text-xs text-blue-700 font-bold flex items-start gap-3 max-w-xl">
                    <div className="flex-shrink-0 mt-0.5">💡</div>
                    <div>
                        <p className="font-black mb-1">CÓMO USAR:</p>
                        <p>1. Clic en dientes (Ctrl+Clic para varios)</p>
                        <p>2. Busca tratamiento abajo</p>
                        <p>3. Añadir y Guardar</p>
                    </div>
                </div>

                {/* ODONTOGRAM GRID LAYOUT */}
                <div className="flex flex-col gap-8 items-center">

                    {/* TOP ROW: Q1 | Q2 */}
                    <div className="flex gap-8 md:gap-16">
                        <div className="flex flex-col items-end">
                            {/* <span className="text-[10px] uppercase font-black text-slate-400 mb-2">Q1: Superior Dcho</span> */}
                            {renderToothRow(QUADRANTS.Q1)}
                        </div>
                        <div className="flex flex-col items-start">
                            {/* <span className="text-[10px] uppercase font-black text-slate-400 mb-2">Q2: Superior Izq</span> */}
                            {renderToothRow(QUADRANTS.Q2)}
                        </div>
                    </div>

                    {/* MIDDLE ROW: DECIDUOUS (TEMPORALES) */}
                    <div className="flex gap-8 md:gap-16 py-2 bg-slate-50/50 rounded-3xl px-8 border border-slate-100/50">
                        <div className="flex flex-col gap-2">
                            {/* Q5 under Q1 */}
                            <div className="flex flex-col items-end">
                                {renderToothRow(QUADRANTS.Q5)}
                            </div>
                            {/* Q8 under Q5 */}
                            <div className="flex flex-col items-end">
                                {renderToothRow(QUADRANTS.Q8)}
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            {/* Q6 under Q2 */}
                            <div className="flex flex-col items-start">
                                {renderToothRow(QUADRANTS.Q6)}
                            </div>
                            {/* Q7 under Q6 */}
                            <div className="flex flex-col items-start">
                                {renderToothRow(QUADRANTS.Q7)}
                            </div>
                        </div>
                    </div>

                    {/* BOTTOM ROW: Q4 | Q3 */}
                    <div className="flex gap-8 md:gap-16">
                        <div className="flex flex-col items-end">
                            {renderToothRow(QUADRANTS.Q4)}
                            {/* <span className="text-[10px] uppercase font-black text-slate-400 mt-2">Q4: Inferior Dcho</span> */}
                        </div>
                        <div className="flex flex-col items-start">
                            {renderToothRow(QUADRANTS.Q3)}
                            {/* <span className="text-[10px] uppercase font-black text-slate-400 mt-2">Q3: Inferior Izq</span> */}
                        </div>
                    </div>

                </div>

                {/* Dientes Seleccionados */}
                {selectedTeeth.length > 0 && (
                    <div className="mt-8 mx-auto max-w-2xl p-4 bg-purple-50 rounded-xl border-2 border-purple-200">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-black text-purple-900">
                                Dientes seleccionados: <span className="text-purple-600">{selectedTeeth.join(', ')}</span>
                            </p>
                            <button
                                onClick={() => setSelectedTeeth([])}
                                className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1"
                            >
                                <X size={14} /> Limpiar
                            </button>
                        </div>
                        <p className="text-xs text-purple-700">
                            👇 Busca y selecciona un tratamiento abajo para asignarlo
                        </p>
                    </div>
                )}

                {/* Barra de Búsqueda */}
                <div className="mt-8 pt-6 border-t border-slate-200">
                    <label className="text-xs font-black uppercase text-slate-400 mb-3 block">
                        🔍 Buscar Tratamiento
                    </label>

                    <div className="relative mb-4">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Ej: Limpieza, Extracción, Endodoncia..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                    {/* Lista de Tratamientos */}
                    {searchTerm.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {filteredServices.length === 0 ? (
                                <div className="col-span-full text-center p-6 text-slate-400 text-sm">
                                    No se encontraron tratamientos
                                </div>
                            ) : (
                                filteredServices.map(service => (
                                    <button
                                        key={service.id}
                                        onClick={() => handleAddTreatment(service)}
                                        disabled={selectedTeeth.length === 0}
                                        className="group p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl hover:from-blue-100 hover:to-indigo-100 hover:border-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
                                    >
                                        <p className="text-sm font-black text-slate-900 mb-1">{service.name}</p>
                                        <p className="text-xs font-bold text-blue-600">{service.price}€</p>
                                        <div className="mt-2 flex items-center gap-1 text-xs text-slate-500 group-hover:text-blue-600">
                                            <Plus size={12} />
                                            <span>Añadir</span>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Tabla de Tratamientos */}
            <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h4 className="text-lg font-black text-slate-900">
                        📋 Tratamientos Planificados ({treatments.length})
                    </h4>
                    <button
                        onClick={handleCreateBudget}
                        disabled={selectedTreatmentsForBudget.length === 0}
                        className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-xl text-xs font-black flex items-center gap-2 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FileText size={16} />
                        Presupuestar ({selectedTreatmentsForBudget.length})
                    </button>
                </div>

                {/* Header */}
                <div className="grid grid-cols-12 gap-4 pb-3 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400">
                    <div className="col-span-1">
                        <input
                            type="checkbox"
                            checked={selectedTreatmentsForBudget.length === treatments.length && treatments.length > 0}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    setSelectedTreatmentsForBudget(treatments.map(t => t.id));
                                } else {
                                    setSelectedTreatmentsForBudget([]);
                                }
                            }}
                            className="w-4 h-4 rounded cursor-pointer"
                        />
                    </div>
                    <div className="col-span-1">Diente</div>
                    <div className="col-span-5">Tratamiento</div>
                    <div className="col-span-2">Precio</div>
                    <div className="col-span-2">Estado</div>
                    <div className="col-span-1 text-right">-</div>
                </div>

                {/* Rows */}
                <div className="space-y-2 mt-4">
                    {treatments.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <p className="text-sm font-bold mb-2">No hay tratamientos planificados</p>
                            <p className="text-xs">Selecciona dientes y busca tratamientos arriba para empezar</p>
                        </div>
                    ) : (
                        treatments.map((treatment) => (
                            <div
                                key={treatment.id}
                                className="grid grid-cols-12 gap-4 items-center p-4 bg-slate-50 rounded-xl text-sm border border-slate-100 hover:border-blue-200 transition-colors"
                            >
                                <div className="col-span-1">
                                    <input
                                        type="checkbox"
                                        checked={selectedTreatmentsForBudget.includes(treatment.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedTreatmentsForBudget(prev => [...prev, treatment.id]);
                                            } else {
                                                setSelectedTreatmentsForBudget(prev => prev.filter(id => id !== treatment.id));
                                            }
                                        }}
                                        className="w-4 h-4 rounded cursor-pointer"
                                    />
                                </div>
                                <div className="col-span-1 font-black text-purple-600 text-center text-lg">
                                    {treatment.toothId}
                                </div>
                                <div className="col-span-5 font-bold text-slate-900">
                                    {treatment.serviceName}
                                </div>
                                <div className="col-span-2 font-black text-slate-900">
                                    {treatment.price}€
                                </div>
                                <div className="col-span-2">
                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${treatment.status === 'COMPLETADO' ? 'bg-green-100 text-green-600' :
                                        treatment.status === 'EN_PROCESO' ? 'bg-blue-100 text-blue-600' :
                                            'bg-amber-100 text-amber-600'
                                        }`}>
                                        {treatment.status}
                                    </span>
                                </div>
                                <div className="col-span-1 flex justify-end">
                                    <button
                                        onClick={() => handleDeleteTreatment(treatment.id)}
                                        className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Total */}
                {treatments.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-slate-200 flex justify-between items-center">
                        <p className="text-sm font-bold text-slate-600">
                            Total de todos los tratamientos:
                        </p>
                        <p className="text-2xl font-black text-slate-900">
                            {treatments.reduce((sum, t) => sum + t.price, 0)}€
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Tooth Component
const Tooth: React.FC<{
    id: number;
    treatments: PatientTreatment[];
    isSelected: boolean;
    onClick: (e: React.MouseEvent) => void;
}> = ({ id, treatments, isSelected, onClick }) => {
    const shape = getToothShape(id);
    const color = '#ffffff';

    return (
        <div className="flex flex-col items-center group cursor-pointer w-[40px] md:w-[60px]" onClick={onClick}>
            {/* Diente SVG */}
            <div className={`relative mb-2 transition-transform hover:-translate-y-1 ${isSelected ? '-translate-y-2' : ''}`}>
                <svg
                    width="40" // Mobile responsive width could be handled via className but viewBox handles aspect
                    height="60"
                    viewBox="0 0 30 50"
                    className="overflow-visible w-full h-auto max-w-[30px] md:max-w-none"
                // Fixed size for consistency or responsive? Kept original width attr but added classes for basic responsiveness
                >
                    <path
                        d={shape}
                        fill={color}
                        stroke={isSelected ? '#7c3aed' : '#94a3b8'}
                        strokeWidth={isSelected ? 3 : 1}
                        className="transition-all duration-300"
                    />
                </svg>
                <div className={`absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-[10px] font-black ${isSelected ? 'text-violet-700' : 'text-slate-500'
                    }`}>
                    {id}
                </div>
            </div>

            {/* Estado Simplificado */}
            {treatments.length > 0 && (
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 min-w-[max-content] z-20">
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase shadow-sm border ${treatments[0].status === 'COMPLETADO' ? 'bg-green-100 text-green-700 border-green-200' :
                        treatments[0].status === 'EN_PROCESO' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                            'bg-amber-100 text-amber-700 border-amber-200'
                        }`}>
                        {treatments[0].status.slice(0, 3)}
                    </span>
                </div>
            )}
        </div>
    );
};

export default Odontogram;
