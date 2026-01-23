import React, { useState, useEffect } from 'react';
import { Search, Trash2, FileText, Plus, X } from 'lucide-react';
import { PatientTreatment } from '../../types';

interface SimplifiedOdontogramProps {
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
    const lastDigit = id % 10;
    if (lastDigit >= 1 && lastDigit <= 2) return PATHS.incisor;
    if (lastDigit === 3) return PATHS.canine;
    if (lastDigit === 4 || lastDigit === 5) return PATHS.premolar;
    return PATHS.molar;
};

// Servicios dentales - ESTOS DEBERÍAN CARGARSE DESDE LA BASE DE DATOS
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

export const SimplifiedOdontogram: React.FC<SimplifiedOdontogramProps> = ({
    patientId,
    isEditable,
    onTreatmentsChange
}) => {
    // Estados
    const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
    const [treatments, setTreatments] = useState<PatientTreatment[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTreatmentsForBudget, setSelectedTreatmentsForBudget] = useState<string[]>([]);

    // Dientes (ISO 3950)
    const upperTeeth = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
    const lowerTeeth = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

    // Cargar tratamientos del paciente desde API
    useEffect(() => {
        if (patientId) {
            // TODO: Cargar desde API
            // fetch(`/api/patients/${patientId}/treatments`)
            //   .then(res => res.json())
            //   .then(setTreatments);
        }
    }, [patientId]);

    // Filtrar servicios según búsqueda
    const filteredServices = ALL_SERVICES.filter(service =>
        service.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Manejo de clic en diente
    const handleToothClick = (toothId: number, event: React.MouseEvent) => {
        if (!isEditable) return;

        if (event.ctrlKey || event.metaKey) {
            // Selección múltiple con Ctrl/Cmd
            setSelectedTeeth(prev =>
                prev.includes(toothId)
                    ? prev.filter(id => id !== toothId)
                    : [...prev, toothId]
            );
        } else {
            // Selección simple
            setSelectedTeeth([toothId]);
        }
    };

    // Añadir tratamiento a dientes seleccionados
    const handleAddTreatment = (service: typeof ALL_SERVICES[0]) => {
        if (selectedTeeth.length === 0) {
            alert('Selecciona al menos un diente');
            return;
        }

        // Crear un tratamiento POR CADA diente seleccionado
        const newTreatments: PatientTreatment[] = selectedTeeth.map(toothId => ({
            id: `temp-${Date.now()}-${Math.random()}`,
            patientId,
            serviceId: service.id,
            serviceName: service.name,
            toothId,
            price: service.price,
            status: 'PENDIENTE',
            createdAt: new Date().toISOString()
        }));

        // Añadir a la lista EXISTENTE (acumulación)
        const updatedTreatments = [...treatments, ...newTreatments];
        setTreatments(updatedTreatments);
        onTreatmentsChange?.(updatedTreatments);

        // Limpiar selección de dientes y búsqueda
        setSelectedTeeth([]);
        setSearchTerm('');

        // TODO: Guardar en backend
        // await api.treatments.createBatch(patientId, newTreatments);
    };

    // Eliminar tratamiento
    const handleDeleteTreatment = (treatmentId: string) => {
        if (!confirm('¿Eliminar este tratamiento?')) return;

        const updated = treatments.filter(t => t.id !== treatmentId);
        setTreatments(updated);
        onTreatmentsChange?.(updated);

        // TODO: Eliminar del backend
        // await api.treatments.delete(treatmentId);
    };

    // Generar presupuesto
    const handleCreateBudget = async () => {
        if (selectedTreatmentsForBudget.length === 0) {
            alert('Selecciona al menos un tratamiento para presupuestar');
            return;
        }

        const selectedItems = treatments.filter(t =>
            selectedTreatmentsForBudget.includes(t.id)
        );

        const total = selectedItems.reduce((sum, item) => sum + item.price, 0);

        console.log('Crear presupuesto:', {
            patientId,
            items: selectedItems.map(t => ({
                name: `${t.serviceName} - Diente ${t.toothId}`,
                price: t.price
            })),
            total
        });

        // TODO: Llamar a API para crear presupuesto
        // const budget = await api.budgets.create(patientId, {
        //   items: selectedItems.map(...)
        // });

        alert(`✅ Presupuesto creado: ${total}€ (${selectedItems.length} tratamientos)`);

        // Limpiar selección
        setSelectedTreatmentsForBudget([]);
    };

    // Obtener color del diente según tratamientos
    const getToothColor = (toothId: number): string => {
        const toothTreatments = treatments.filter(t => t.toothId === toothId);
        if (toothTreatments.length === 0) return '#e2e8f0'; // slate-200 (sano)

        const hasCompleted = toothTreatments.some(t => t.status === 'COMPLETADO');
        const hasPending = toothTreatments.some(t => t.status === 'PENDIENTE');

        if (hasCompleted) return '#10b981'; // green (completado)
        if (hasPending) return '#f59e0b'; // amber (pendiente)
        return '#3b82f6'; // blue (en proceso)
    };

    return (
        <div className="w-full space-y-6">
            {/* Odontograma Visual */}
            <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm">

                {/* Instrucciones */}
                <div className="mb-6 p-4 bg-blue-50 rounded-xl text-xs text-blue-700 font-bold flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">💡</div>
                    <div>
                        <p className="font-black mb-1">CÓMO USAR:</p>
                        <p><strong>1.</strong> Haz clic en un diente (o Ctrl/Cmd + clic para seleccionar varios)</p>
                        <p><strong>2.</strong> Busca el tratamiento en la barra inferior</p>
                        <p><strong>3.</strong> Haz clic en el tratamiento para asignarlo</p>
                        <p><strong>4.</strong> Puedes añadir varios tratamientos al mismo diente</p>
                    </div>
                </div>

                {/* Dientes Superiores */}
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

                {/* Dientes Inferiores */}
                <div className="flex justify-center gap-1 mb-8">
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

                {/* Dientes Seleccionados */}
                {selectedTeeth.length > 0 && (
                    <div className="mt-6 p-4 bg-purple-50 rounded-xl border-2 border-purple-200">
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
                            👇 Busca y selecciona un tratamiento abajo para asignarlo a estos dientes
                        </p>
                    </div>
                )}

                {/* Barra de Búsqueda de Tratamientos */}
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

                    {/* Lista de Tratamientos Disponibles */}
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

            {/* Tabla de Tratamientos Asignados */}
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
                    stroke={isSelected ? '#8b5cf6' : '#cbd5e1'}
                    strokeWidth={isSelected ? 3 : 1}
                    className="transition-all group-hover:stroke-purple-500"
                />
            </svg>
            <div className={`absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-[10px] font-black ${isSelected ? 'text-purple-600' : 'text-slate-600'
                }`}>
                {id}
            </div>
        </div>
    );
};

export default SimplifiedOdontogram;
