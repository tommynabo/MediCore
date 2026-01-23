import React, { useState, useEffect } from 'react';
import { Check, AlertCircle, Plus, DollarSign, FileText, Trash2 } from 'lucide-react';
import { PatientTreatment } from '../../types';

interface OdontogramAdvancedProps {
    patientId: string;
    isEditable: boolean;
    onTreatmentsChange?: (treatments: PatientTreatment[]) => void;
}

// SVG PATHS (Simplified Realistic Shapes)
const PATHS = {
    incisor: "M10,5 L20,5 L22,30 L15,45 L8,30 Z",
    canine: "M15,2 L25,10 L22,35 L15,50 L8,35 L5,10 Z",
    premolar: "M5,5 L25,5 L28,25 L15,40 L2,25 Z",
    molar: "M2,5 L10,2 L20,2 L28,5 L30,20 L25,35 L15,40 L5,35 L0,20 Z"
};

// Mapping ISO 3950 to Shapes
const getToothShape = (id: number): string => {
    const lastDigit = id % 10;
    if (lastDigit >= 1 && lastDigit <= 2) return PATHS.incisor;
    if (lastDigit === 3) return PATHS.canine;
    if (lastDigit === 4 || lastDigit === 5) return PATHS.premolar;
    return PATHS.molar;
};

const getToothLabel = (id: number): string => {
    return id.toString();
};

// Servicios dentales disponibles (se deberían cargar desde constants o API)
const DENTAL_SERVICES = [
    { id: '1', name: 'Endodoncia', price: 350 },
    { id: '2', name: 'Corona', price: 450 },
    { id: '3', name: 'Extracción', price: 150 },
    { id: '4', name: 'Empaste', price: 80 },
    { id: '5', name: 'Limpieza', price: 60 },
    { id: '6', name: 'Implante', price: 1200 },
    { id: '7', name: 'Blanqueamiento', price: 200 },
];

export const OdontogramAdvanced: React.FC<OdontogramAdvancedProps> = ({
    patientId,
    isEditable,
    onTreatmentsChange
}) => {
    // Estados
    const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
    const [treatments, setTreatments] = useState<PatientTreatment[]>([]);
    const [showSidePanel, setShowSidePanel] = useState(false);
    const [selectedServiceId, setSelectedServiceId] = useState('');
    const [selectedTreatmentsForBudget, setSelectedTreatmentsForBudget] = useState<string[]>([]);

    // Cargar tratamientos del paciente (simulado - debería venir de API)
    useEffect(() => {
        // TODO: Fetch patient treatments from API
        // fetch(`/api/patients/${patientId}/treatments`).then(...)
    }, [patientId]);

    // Manejo de clic en diente
    const handleToothClick = (toothId: number, event: React.MouseEvent) => {
        if (!isEditable) return;

        if (event.ctrlKey || event.metaKey) {
            // Selección múltiple (Ctrl/Cmd + Clic)
            setSelectedTeeth(prev =>
                prev.includes(toothId)
                    ? prev.filter(id => id !== toothId)
                    : [...prev, toothId]
            );
        } else {
            // Selección simple
            setSelectedTeeth([toothId]);
        }
        setShowSidePanel(true);
    };

    // Asignar tratamiento a dientes seleccionados
    const handleAssignTreatment = () => {
        if (!selectedServiceId || selectedTeeth.length === 0) {
            alert('Selecciona un servicio y al menos un diente');
            return;
        }

        const service = DENTAL_SERVICES.find(s => s.id === selectedServiceId);
        if (!service) return;

        // Crear un tratamiento por cada diente seleccionado
        const newTreatments: PatientTreatment[] = selectedTeeth.map(toothId => ({
            id: `temp-${Date.now()}-${toothId}`,
            patientId,
            serviceId: selectedServiceId,
            serviceName: service.name,
            toothId,
            price: service.price,
            status: 'PENDIENTE',
            createdAt: new Date().toISOString()
        }));

        const updatedTreatments = [...treatments, ...newTreatments];
        setTreatments(updatedTreatments);
        onTreatmentsChange?.(updatedTreatments);

        // Reset
        setSelectedTeeth([]);
        setSelectedServiceId('');
        setShowSidePanel(false);

        // TODO: Guardar en backend
        // await api.treatments.createBatch(newTreatments);
    };

    // Eliminar tratamiento
    const handleDeleteTreatment = async (treatmentId: string) => {
        if (!confirm('¿Eliminar este tratamiento?')) return;
        const updated = treatments.filter(t => t.id !== treatmentId);
        setTreatments(updated);
        onTreatmentsChange?.(updated);
        // TODO: await api.treatments.delete(treatmentId);
    };

    // Generar presupuesto desde tratamientos seleccionados
    const handleCreateBudget = () => {
        if (selectedTreatmentsForBudget.length === 0) {
            alert('Selecciona al menos un tratamiento');
            return;
        }

        const selectedItems = treatments.filter(t =>
            selectedTreatmentsForBudget.includes(t.id)
        );

        // TODO: Llamar a API para crear presupuesto
        console.log('Crear presupuesto con:', selectedItems);
        alert(`✅ Presupuesto creado con ${selectedItems.length} tratamientos`);
        // Navegar a pestaña de presupuestos
    };

    // Obtener color según tratamientos del diente
    const getToothColor = (toothId: number): string => {
        const toothTreatments = treatments.filter(t => t.toothId === toothId);
        if (toothTreatments.length === 0) return '#e2e8f0'; // slate-200

        const hasCompleted = toothTreatments.some(t => t.status === 'COMPLETADO');
        const hasPending = toothTreatments.some(t => t.status === 'PENDIENTE');

        if (hasCompleted) return '#10b981'; // green
        if (hasPending) return '#f59e0b'; // amber
        return '#3b82f6'; // blue
    };

    // Dientes superiores e inferiores (ISO 3950)
    const upperTeeth = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
    const lowerTeeth = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

    return (
        <div className="w-full flex gap-6">
            {/* Odontograma Visual */}
            <div className="flex-1 bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm">
                <h3 className="text-xl font-black text-slate-900 mb-6">Odontograma</h3>

                {/* Upper Teeth */}
                <div className="flex justify-center gap-1 mb-8">
                    {upperTeeth.map(toothId => (
                        <Tooth
                            key={toothId}
                            id={toothId}
                            color={getToothColor(toothId)}
                            isSelected={selectedTeeth.includes(toothId)}
                            onClick={(e) => handleToothClick(toothId, e)}
                        />
                    ))}
                </div>

                {/* Divider */}
                <div className="border-t-2 border-slate-300 my-6"></div>

                {/* Lower Teeth */}
                <div className="flex justify-center gap-1">
                    {lowerTeeth.map(toothId => (
                        <Tooth
                            key={toothId}
                            id={toothId}
                            color={getToothColor(toothId)}
                            isSelected={selectedTeeth.includes(toothId)}
                            onClick={(e) => handleToothClick(toothId, e)}
                        />
                    ))}
                </div>

                {/* Instructions */}
                <div className="mt-6 p-4 bg-blue-50 rounded-xl text-xs text-blue-700 font-bold">
                    💡 <strong>Clic simple</strong>: Seleccionar diente | <strong>Ctrl/Cmd + Clic</strong>: Selección múltiple
                </div>
            </div>

            {/* Side Panel - Asignar Tratamiento */}
            {showSidePanel && (
                <div className="w-80 bg-white rounded-[2rem] p-6 border border-slate-200 shadow-lg animate-in slide-in-from-right">
                    <h4 className="text-lg font-black text-slate-900 mb-4">
                        Asignar Tratamiento
                    </h4>
                    <p className="text-xs text-slate-500 mb-4">
                        Dientes seleccionados: <strong>{selectedTeeth.join(', ')}</strong>
                    </p>

                    <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">
                        Seleccionar Servicio
                    </label>
                    <select
                        value={selectedServiceId}
                        onChange={(e) => setSelectedServiceId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold mb-4"
                    >
                        <option value="">-- Seleccionar --</option>
                        {DENTAL_SERVICES.map(service => (
                            <option key={service.id} value={service.id}>
                                {service.name} - {service.price}€
                            </option>
                        ))}
                    </select>

                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                setShowSidePanel(false);
                                setSelectedTeeth([]);
                            }}
                            className="flex-1 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleAssignTreatment}
                            className="flex-1 bg-slate-900 text-white py-2 rounded-xl text-xs font-bold hover:bg-slate-800"
                        >
                            Asignar
                        </button>
                    </div>
                </div>
            )}

            {/* Tabla de Movimientos (Treatments List) */}
            <div className="w-full mt-8">
                <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h4 className="text-lg font-black text-slate-900">Tabla de Movimientos</h4>
                        <button
                            onClick={handleCreateBudget}
                            disabled={selectedTreatmentsForBudget.length === 0}
                            className="bg-purple-600 text-white px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <FileText size={16} />
                            Presupuestar Seleccionados ({selectedTreatmentsForBudget.length})
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
                                className="w-4 h-4 rounded"
                            />
                        </div>
                        <div className="col-span-1">Diente</div>
                        <div className="col-span-4">Tratamiento</div>
                        <div className="col-span-2">Precio</div>
                        <div className="col-span-2">Estado</div>
                        <div className="col-span-2 text-right">Acciones</div>
                    </div>

                    {/* Rows */}
                    <div className="space-y-2 mt-4">
                        {treatments.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 text-xs font-bold">
                                No hay tratamientos registrados
                            </div>
                        ) : (
                            treatments.map((treatment) => (
                                <div
                                    key={treatment.id}
                                    className="grid grid-cols-12 gap-4 items-center p-3 bg-slate-50 rounded-xl text-sm border border-slate-100 hover:border-blue-200 transition-colors"
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
                                            className="w-4 h-4 rounded"
                                        />
                                    </div>
                                    <div className="col-span-1 font-bold text-slate-600 text-center">
                                        {treatment.toothId || '-'}
                                    </div>
                                    <div className="col-span-4 font-black text-slate-900">
                                        {treatment.serviceName}
                                    </div>
                                    <div className="col-span-2 font-bold text-slate-600">
                                        {treatment.price}€
                                    </div>
                                    <div className="col-span-2">
                                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${treatment.status === 'COMPLETADO' ? 'bg-green-100 text-green-600' :
                                                treatment.status === 'EN_PROCESO' ? 'bg-blue-100 text-blue-600' :
                                                    'bg-amber-100 text-amber-600'
                                            }`}>
                                            {treatment.status}
                                        </span>
                                    </div>
                                    <div className="col-span-2 flex justify-end gap-2">
                                        <button
                                            onClick={() => handleDeleteTreatment(treatment.id)}
                                            className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Tooth Component
const Tooth: React.FC<{
    id: number;
    color: string;
    isSelected: boolean;
    onClick: (e: React.MouseEvent) => void;
}> = ({ id, color, isSelected, onClick }) => {
    const shape = getToothShape(id);

    return (
        <div className="relative group cursor-pointer" onClick={onClick}>
            <svg
                width="35"
                height="55"
                viewBox="0 0 30 50"
                className="transition-all duration-200"
            >
                <path
                    d={shape}
                    fill={color}
                    stroke={isSelected ? '#3b82f6' : '#cbd5e1'}
                    strokeWidth={isSelected ? 3 : 1}
                    className="transition-all hover:stroke-blue-500"
                />
            </svg>
            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-[10px] font-black text-slate-600">
                {getToothLabel(id)}
            </div>
        </div>
    );
};

export default OdontogramAdvanced;
