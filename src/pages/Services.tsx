import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit3, Trash2, X, Check, Package, Filter } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface Service {
    id: string;
    external_id?: string;
    name: string;
    specialty_id?: string;
    specialty_name: string;
    specialty_color: string;
    duration_min: number;
    base_price: number;
    discount_percent: number;
    tax_percent: number;
    final_price: number;
    is_active: boolean;
    created_at?: string;
}

const Services: React.FC = () => {
    const { api } = useAppContext();

    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        specialty_name: '',
        specialty_color: '#3b638e',
        duration_min: 30,
        final_price: 0,
        base_price: 0
    });

    // Fetch services
    useEffect(() => {
        loadServices();
    }, [api]);

    const loadServices = async () => {
        setLoading(true);
        try {
            const data = await api.services.getAll();
            setServices(data || []);
        } catch (error) {
            console.error('Error loading services:', error);
        } finally {
            setLoading(false);
        }
    };

    // Get unique specialties
    const specialties = [...new Set(services.map(s => s.specialty_name).filter(Boolean))].sort();

    // Filter services
    const filteredServices = services.filter(service => {
        const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSpecialty = !selectedSpecialty || service.specialty_name === selectedSpecialty;
        return matchesSearch && matchesSpecialty;
    });

    // Group by specialty
    const groupedServices = filteredServices.reduce((acc, service) => {
        const specialty = service.specialty_name || 'Otros';
        if (!acc[specialty]) acc[specialty] = [];
        acc[specialty].push(service);
        return acc;
    }, {} as Record<string, Service[]>);

    const handleEdit = (service: Service) => {
        setEditingService(service);
        setFormData({
            name: service.name,
            specialty_name: service.specialty_name,
            specialty_color: service.specialty_color,
            duration_min: service.duration_min,
            final_price: service.final_price,
            base_price: service.base_price
        });
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setEditingService(null);
        setFormData({
            name: '',
            specialty_name: specialties[0] || 'Odontología',
            specialty_color: '#3b638e',
            duration_min: 30,
            final_price: 0,
            base_price: 0
        });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        try {
            if (editingService) {
                await api.services.update(editingService.id, {
                    ...formData,
                    base_price: formData.final_price
                });
            } else {
                await api.services.create({
                    ...formData,
                    base_price: formData.final_price,
                    is_active: true
                });
            }
            setIsModalOpen(false);
            loadServices();
        } catch (error) {
            console.error('Error saving service:', error);
            alert('Error al guardar el servicio');
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`¿Eliminar el servicio "${name}"?`)) return;
        try {
            await api.services.delete(id);
            loadServices();
        } catch (error) {
            console.error('Error deleting service:', error);
            alert('Error al eliminar el servicio');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-violet-50 p-8">
            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 mb-1">🦷 Servicios</h1>
                        <p className="text-sm text-slate-500 font-medium">{services.length} servicios en el catálogo</p>
                    </div>
                    <button
                        onClick={handleAdd}
                        className="bg-gradient-to-r from-violet-600 to-purple-600 text-white px-6 py-3 rounded-2xl text-sm font-black uppercase flex items-center gap-2 shadow-xl shadow-violet-200 hover:shadow-2xl hover:scale-[1.02] transition-all"
                    >
                        <Plus size={18} />
                        Añadir Servicio
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-[2rem] p-6 mb-6 border border-slate-200 shadow-lg">
                    <div className="flex flex-wrap gap-4">
                        {/* Search */}
                        <div className="flex-1 min-w-[250px] relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar servicios..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 transition-all"
                            />
                        </div>

                        {/* Specialty Filter */}
                        <div className="relative min-w-[200px]">
                            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <select
                                value={selectedSpecialty}
                                onChange={(e) => setSelectedSpecialty(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 transition-all appearance-none cursor-pointer"
                            >
                                <option value="">Todas las especialidades</option>
                                {specialties.map(spec => (
                                    <option key={spec} value={spec}>{spec}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Services Grid by Specialty */}
                {loading ? (
                    <div className="bg-white rounded-[2rem] p-12 border border-slate-200 shadow-lg text-center">
                        <div className="animate-spin w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full mx-auto mb-4"></div>
                        <p className="text-slate-500 font-bold">Cargando servicios...</p>
                    </div>
                ) : filteredServices.length === 0 ? (
                    <div className="bg-white rounded-[2rem] p-12 border border-slate-200 shadow-lg text-center">
                        <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500 font-bold">No se encontraron servicios</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {Object.entries(groupedServices).sort().map(([specialty, items]) => (
                            <div key={specialty}>
                                <div className="flex items-center gap-3 mb-4">
                                    <div
                                        className="w-4 h-4 rounded-full"
                                        style={{ backgroundColor: items[0]?.specialty_color || '#3b638e' }}
                                    />
                                    <h2 className="text-lg font-black text-slate-900">{specialty}</h2>
                                    <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{items.length}</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {items.map(service => (
                                        <div
                                            key={service.id}
                                            className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-violet-300 hover:shadow-lg transition-all group"
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <h3 className="text-sm font-black text-slate-900 leading-tight pr-2">{service.name}</h3>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleEdit(service)}
                                                        className="p-2 hover:bg-violet-50 rounded-lg text-slate-400 hover:text-violet-600 transition-colors"
                                                    >
                                                        <Edit3 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(service.id, service.name)}
                                                        className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <p className="text-xl font-black text-violet-600">{service.final_price.toFixed(2)}€</p>
                                                <span className="text-xs font-bold text-slate-400">{service.duration_min} min</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
                    <div className="bg-white rounded-[2rem] p-8 w-full max-w-lg shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-slate-900">
                                {editingService ? '✏️ Editar Servicio' : '➕ Nuevo Servicio'}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-black uppercase text-slate-400 mb-2 block">Nombre del servicio</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-200"
                                    placeholder="Ej: Limpieza Dental"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-black uppercase text-slate-400 mb-2 block">Especialidad</label>
                                    <select
                                        value={formData.specialty_name}
                                        onChange={(e) => setFormData({ ...formData, specialty_name: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-200"
                                    >
                                        {specialties.map(spec => (
                                            <option key={spec} value={spec}>{spec}</option>
                                        ))}
                                        <option value="">Otra...</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-black uppercase text-slate-400 mb-2 block">Color</label>
                                    <input
                                        type="color"
                                        value={formData.specialty_color}
                                        onChange={(e) => setFormData({ ...formData, specialty_color: e.target.value })}
                                        className="w-full h-12 rounded-xl cursor-pointer border border-slate-200"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-black uppercase text-slate-400 mb-2 block">Precio (€)</label>
                                    <input
                                        type="number"
                                        value={formData.final_price}
                                        onChange={(e) => setFormData({ ...formData, final_price: parseFloat(e.target.value) || 0 })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-200"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black uppercase text-slate-400 mb-2 block">Duración (min)</label>
                                    <input
                                        type="number"
                                        value={formData.duration_min}
                                        onChange={(e) => setFormData({ ...formData, duration_min: parseInt(e.target.value) || 30 })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-violet-200"
                                        min="5"
                                        step="5"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 mt-8">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!formData.name || !formData.final_price}
                                className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 text-white py-3 rounded-xl font-bold uppercase flex items-center justify-center gap-2 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Check size={18} />
                                {editingService ? 'Guardar' : 'Crear'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Services;
