import React, { useState, useRef, useEffect } from 'react';
import { Search, UserPlus, Download, Plus, Minus, Package, AlertTriangle, CheckCircle2, FileText as FileTextIcon, MessageSquare, QrCode, History, Send, RefreshCw, Trash2, Smartphone, Stethoscope } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { DocumentTemplate } from '../../types';
import { api } from '../services/api';

const Settings: React.FC = () => {
    const { stock, setStock, currentUserRole } = useAppContext();
    const [settingsTab, setSettingsTab] = useState<'templates' | 'stock' | 'whatsapp' | 'services'>('templates');
    const [templateSearch, setTemplateSearch] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Services State
    const [services, setServices] = useState<any[]>([]);
    const [serviceSearch, setServiceSearch] = useState('');
    const [isLoadingServices, setIsLoadingServices] = useState(false);

    // WhatsApp State
    const [waStatus, setWaStatus] = useState<{ status: string; qrCode: string | null }>({ status: 'DISCONNECTED', qrCode: null });
    const [waTemplates, setWaTemplates] = useState<any[]>([]);
    const [waLogs, setWaLogs] = useState<any[]>([]);
    const [waActiveTab, setWaActiveTab] = useState<'dashboard' | 'connection' | 'templates'>('dashboard');
    const [newWaTemplate, setNewWaTemplate] = useState({ name: '', content: '', triggerType: 'APPOINTMENT_REMINDER', triggerOffsetValue: '12', triggerOffsetUnit: 'h', triggerOffsetDirection: 'before' });

    // TEMPLATES DATA - Restored complete list
    const [templates, setTemplates] = useState<DocumentTemplate[]>([
        { id: '32', title: 'CONSENTIMIENTO INFORMADO GENERAL.DOCX', category: 'General', date: '21/10/2025', size: '0.0086 MB', type: 'docx' },
        { id: '31', title: 'RGPD - PROTECCIÓN DE DATOS PACIENTE', category: 'Legal', date: '23/05/2025', size: '0.0084 MB', type: 'docx' },
        { id: '28', title: 'CONSENTIMIENTO IMPLANTES DENTALES', category: 'Cirugía', date: '13/05/2025', size: '0.21 MB', type: 'pdf' },
        { id: '7', title: 'CONSENTIMIENTO ENDODONCIA', category: 'General', date: '13/05/2025', size: '0.21 MB', type: 'pdf' },
        { id: '5', title: 'INSTRUCCIONES POST-OPERATORIAS', category: 'Cirugía', date: '10/05/2025', size: '0.15 MB', type: 'pdf' },
        { id: '4', title: 'FICHA DE PRIMERA VISITA', category: 'Administración', date: '01/05/2025', size: '0.05 MB', type: 'docx' },
        { id: '3', title: 'PRESUPUESTO GENERAL TIPO', category: 'Administración', date: '01/05/2025', size: '0.05 MB', type: 'docx' },
    ]);

    useEffect(() => {
        if (settingsTab === 'whatsapp') {
            refreshWhatsApp();
        } else if (settingsTab === 'services') {
            loadServices();
        }
    }, [settingsTab, waActiveTab]);

    const refreshWhatsApp = async () => {
        try {
            const status = await api.whatsapp.getStatus();
            setWaStatus(status);
            const tmpls = await api.whatsapp.getTemplates();
            setWaTemplates(tmpls);
            const logs = await api.whatsapp.getLogs();
            setWaLogs(logs);
        } catch (e) {
            console.error(e);
        }
    };

    const loadServices = async () => {
        setIsLoadingServices(true);
        try {
            const data = await api.services.getAll();
            setServices(data || []);
        } catch (e) {
            console.error("Error loading services:", e);
        } finally {
            setIsLoadingServices(false);
        }
    };

    const handleUploadTemplate = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const newDoc: DocumentTemplate = {
                id: crypto.randomUUID(),
                title: file.name,
                category: 'General',
                date: new Date().toLocaleDateString(),
                size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
                type: file.name.endsWith('pdf') ? 'pdf' : 'docx'
            };
            setTemplates(prev => [newDoc, ...prev]);
        }
    };

    const handleUpdateStock = (id: string, delta: number) => {
        setStock(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = Math.max(0, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const handleCreateWaTemplate = async () => {
        if (!newWaTemplate.name || !newWaTemplate.content) return;
        try {
            const offsetString = `${newWaTemplate.triggerOffsetValue}${newWaTemplate.triggerOffsetUnit}`;
            await api.whatsapp.createTemplate({
                ...newWaTemplate,
                triggerOffset: offsetString
            });
            setNewWaTemplate({ ...newWaTemplate, name: '', content: '' }); // Reset fields but keep settings
            refreshWhatsApp();
        } catch (e) { alert('Error creando plantilla'); }
    };

    const filteredServices = services.filter(s =>
        s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
        s.specialty_name?.toLowerCase().includes(serviceSearch.toLowerCase())
    );

    return (
        <div className="flex h-full overflow-hidden bg-slate-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* SETTINGS SIDEBAR */}
            <div className="w-64 bg-white border-r border-slate-200 p-6 flex flex-col gap-2 shrink-0">
                <h3 className="text-xl font-bold text-slate-900 mb-6 px-2">Configuración</h3>
                <button onClick={() => setSettingsTab('templates')} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${settingsTab === 'templates' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}>
                    Plantillas
                </button>
                <button onClick={() => setSettingsTab('stock')} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${settingsTab === 'stock' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}>
                    Inventario
                </button>
                <button onClick={() => setSettingsTab('services')} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${settingsTab === 'services' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-50'}`}>
                    Servicios / Tarifas
                </button>
                <button onClick={() => setSettingsTab('whatsapp')} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${settingsTab === 'whatsapp' ? 'bg-green-50 text-green-600' : 'text-slate-400 hover:bg-slate-50'}`}>
                    WhatsApp & CRM
                </button>
            </div>

            {/* SETTINGS CONTENT */}
            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                {settingsTab === 'whatsapp' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                        <div className="flex justify-between items-end mb-6">
                            <div>
                                <h3 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                                    <Smartphone className="text-green-500" size={32} />
                                    WhatsApp Manager
                                </h3>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-2">Automatización y Recordatorios</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setWaActiveTab('dashboard')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase ${waActiveTab === 'dashboard' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 border'}`}>Dashboard</button>
                                <button onClick={() => setWaActiveTab('connection')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase ${waActiveTab === 'connection' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 border'}`}>Conexión</button>
                                <button onClick={() => setWaActiveTab('templates')} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase ${waActiveTab === 'templates' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 border'}`}>Plantillas</button>
                            </div>
                        </div>

                        {waActiveTab === 'dashboard' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* CARD 1: Recordatorios (Reminders) */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                    <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <History size={18} className="text-blue-500" />
                                        Recordatorios (Últimos Enviados)
                                    </h4>
                                    <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                                        {waLogs.filter(l => l.type === 'APPOINTMENT_REMINDER').map(log => (
                                            <div key={log.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                <div className={`w-2 h-2 rounded-full mt-2 ${log.status === 'SENT' ? 'bg-green-500' : 'bg-red-500'}`} />
                                                <div className="flex-1">
                                                    <div className="flex justify-between">
                                                        <span className="text-xs font-bold text-slate-700">{log.patient?.name || 'Paciente'}</span>
                                                        <span className="text-[10px] text-slate-400">{new Date(log.sentAt).toLocaleString()}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{log.content}</p>
                                                    {log.error && <p className="text-[10px] text-red-500 mt-1">{log.error}</p>}
                                                </div>
                                            </div>
                                        ))}
                                        {waLogs.filter(l => l.type === 'APPOINTMENT_REMINDER').length === 0 && <p className="text-center text-xs text-slate-400 py-4">No hay recordatorios recientes.</p>}
                                    </div>
                                </div>

                                {/* CARD 2: Seguimientos (Follow ups) */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                    <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <RefreshCw size={18} className="text-purple-500" />
                                        Seguimientos (Follow-up)
                                    </h4>
                                    <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                                        {waLogs.filter(l => l.type === 'TREATMENT_FOLLOWUP').map(log => (
                                            <div key={log.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                <div className={`w-2 h-2 rounded-full mt-2 ${log.status === 'SENT' ? 'bg-green-500' : 'bg-red-500'}`} />
                                                <div className="flex-1">
                                                    <div className="flex justify-between">
                                                        <span className="text-xs font-bold text-slate-700">{log.patient?.name || 'Paciente'}</span>
                                                        <span className="text-[10px] text-slate-400">{new Date(log.sentAt).toLocaleString()}</span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{log.content}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {waLogs.filter(l => l.type === 'TREATMENT_FOLLOWUP').length === 0 && <p className="text-center text-xs text-slate-400 py-4">No hay seguimientos registrados.</p>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {waActiveTab === 'connection' && (
                            <div className="flex flex-col items-center justify-center bg-white p-12 rounded-2xl border border-slate-200 shadow-sm min-h-[400px]">
                                {waStatus.status === 'READY' || waStatus.status === 'AUTHENTICATED' ? (
                                    <div className="text-center animate-in zoom-in duration-300">
                                        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <CheckCircle2 size={48} className="text-green-600" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-slate-900">WhatsApp Conectado</h3>
                                        <p className="text-slate-500 mb-8">El servicio está activo y enviando mensajes.</p>
                                        <button onClick={() => api.whatsapp.logout().then(refreshWhatsApp)} className="px-6 py-3 bg-red-50 text-red-600 rounded-xl font-bold text-xs uppercase hover:bg-red-100 transition-colors">
                                            Desconectar Sesión
                                        </button>
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <h3 className="text-xl font-bold text-slate-900 mb-6">Escanea el código QR</h3>
                                        <div className="bg-white p-4 rounded-xl border-2 border-slate-900 inline-block mb-6 shadow-xl">
                                            {waStatus.qrCode ? (
                                                <img src={waStatus.qrCode} alt="WhatsApp QR" className="w-64 h-64 object-contain" />
                                            ) : (
                                                <div className="w-64 h-64 flex items-center justify-center bg-slate-50 text-slate-400">
                                                    {waStatus.status === 'DISCONNECTED' ? 'Iniciando cliente...' : 'Cargando QR...'}
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto">
                                            Abre WhatsApp en tu teléfono {'>'} Dispositivos Vinculados {'>'} Vincular un dispositivo
                                        </p>
                                        <button onClick={refreshWhatsApp} className="mt-8 text-blue-600 font-bold text-xs uppercase tracking-widest hover:underline">
                                            Actualizar Estado
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {waActiveTab === 'templates' && (
                            <div className="space-y-6">
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                    <h4 className="text-sm font-bold text-slate-900 uppercase mb-4">Nueva Plantilla</h4>
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <input
                                            placeholder="Nombre de la plantilla"
                                            value={newWaTemplate.name}
                                            onChange={e => setNewWaTemplate({ ...newWaTemplate, name: e.target.value })}
                                            className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100"
                                        />
                                        <div className="flex gap-2">
                                            <select
                                                value={newWaTemplate.triggerType}
                                                onChange={e => setNewWaTemplate({ ...newWaTemplate, triggerType: e.target.value })}
                                                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 flex-1"
                                            >
                                                <option value="APPOINTMENT_REMINDER">Recordatorio de Cita</option>
                                                <option value="TREATMENT_FOLLOWUP">Seguimiento Tratamiento</option>
                                            </select>

                                        </div>
                                    </div>
                                    {/* Structured Offset Input */}
                                    <div className="flex gap-2 mb-4 items-center">
                                        <div className="flex-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400">Cuándo enviar</label>
                                            <div className="flex bg-slate-50 border border-slate-200 rounded-xl overflow-hidden mt-1">
                                                <input
                                                    type="number"
                                                    value={newWaTemplate.triggerOffsetValue}
                                                    onChange={e => setNewWaTemplate({ ...newWaTemplate, triggerOffsetValue: e.target.value })}
                                                    className="w-16 px-3 py-2 text-sm font-bold bg-transparent outline-none text-center"
                                                />
                                                <div className="w-px bg-slate-200"></div>
                                                <select
                                                    value={newWaTemplate.triggerOffsetUnit}
                                                    onChange={e => setNewWaTemplate({ ...newWaTemplate, triggerOffsetUnit: e.target.value })}
                                                    className="flex-1 px-3 py-2 text-xs font-bold bg-transparent outline-none uppercase"
                                                >
                                                    <option value="h">Horas</option>
                                                    <option value="d">Días</option>
                                                    <option value="mo">Meses</option>
                                                </select>
                                                <div className="w-px bg-slate-200"></div>
                                                <select
                                                    value={newWaTemplate.triggerOffsetDirection}
                                                    onChange={e => setNewWaTemplate({ ...newWaTemplate, triggerOffsetDirection: e.target.value })}
                                                    className="flex-1 px-3 py-2 text-xs font-bold bg-transparent outline-none uppercase"
                                                >
                                                    <option value="before">Antes de la cita</option>
                                                    <option value="after">Después de la cita</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <textarea
                                        placeholder="Contenido del mensaje..."
                                        value={newWaTemplate.content}
                                        onChange={e => setNewWaTemplate({ ...newWaTemplate, content: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 min-h-[100px] mb-2"
                                    />
                                    <p className="text-[10px] text-slate-400 font-medium mb-4">
                                        Variables disponibles: <span className="font-bold text-slate-600">{"{{PACIENTE}}"}</span>, <span className="font-bold text-slate-600">{"{{CITA}}"}</span>, <span className="font-bold text-slate-600">{"{{DOCTOR}}"}</span>, <span className="font-bold text-slate-600">{"{{FECHA}}"}</span>, <span className="font-bold text-slate-600">{"{{HORA}}"}</span>, <span className="font-bold text-slate-600">{"{{TRATAMIENTO}}"}</span>
                                    </p>
                                    <div className="flex justify-end">
                                        <button onClick={handleCreateWaTemplate} className="bg-slate-900 text-white px-6 py-2 rounded-xl text-xs font-bold uppercase hover:bg-slate-800">
                                            Guardar Plantilla
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {waTemplates.map(t => (
                                        <div key={t.id} className="bg-white p-5 rounded-xl border border-slate-200 hover:shadow-md transition-shadow relative group">
                                            <button
                                                onClick={async () => { await api.whatsapp.deleteTemplate(t.id); refreshWhatsApp(); }}
                                                className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                            <div className="flex items-center gap-2 mb-3">
                                                <MessageSquare size={16} className="text-blue-500" />
                                                <h5 className="font-bold text-slate-900">{t.name}</h5>
                                            </div>
                                            <div className="flex gap-2 mb-3">
                                                <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-500 px-2 py-1 rounded">{t.triggerType}</span>
                                                <span className="text-[10px] font-bold uppercase bg-blue-50 text-blue-600 px-2 py-1 rounded">{t.triggerOffset}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                {t.content}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {settingsTab === 'services' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                        <div className="flex justify-between items-end">
                            <div>
                                <h3 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                                    <Stethoscope className="text-indigo-500" size={32} />
                                    Tarifas y Servicios
                                </h3>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-2">{filteredServices.length} Servicios Activos</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="relative">
                                    <Search size={16} className="absolute left-4 top-3.5 text-slate-400" />
                                    <input
                                        value={serviceSearch}
                                        onChange={(e) => setServiceSearch(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-xs font-bold outline-none focus:ring-4 focus:ring-slate-100 transition-all min-w-[250px]"
                                        placeholder="Buscar servicio..."
                                    />
                                </div>
                                <button className="bg-slate-900 text-white px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-transform flex items-center gap-2">
                                    <Plus size={16} /> Nuevo
                                </button>
                            </div>
                        </div>

                        {isLoadingServices ? (
                            <div className="text-center py-10 opacity-50">Cargando servicios...</div>
                        ) : (
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 tracking-widest border-b border-slate-100">
                                        <tr>
                                            <th className="p-6">Servicio</th>
                                            <th className="p-6">Especialidad</th>
                                            <th className="p-6 text-right">Precio</th>
                                            <th className="p-6 text-center">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredServices.map(service => (
                                            <tr key={service.id} className="text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                                                <td className="p-6 text-slate-900 font-bold">{service.name}</td>
                                                <td className="p-6">
                                                    <span className="px-3 py-1 rounded-full text-[10px] uppercase font-bold" style={{ backgroundColor: (service.specialty_color || '#e2e8f0') + '20', color: service.specialty_color || '#64748b' }}>
                                                        {service.specialty_name || 'General'}
                                                    </span>
                                                </td>
                                                <td className="p-6 text-right font-black text-slate-900">{service.final_price?.toFixed(2)}€</td>
                                                <td className="p-6 text-center">
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase flex items-center justify-center gap-1 mx-auto w-fit ${service.is_active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                                        {service.is_active ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {settingsTab === 'templates' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                        <div className="flex justify-between items-end">
                            <div>
                                <h3 className="text-3xl font-bold text-slate-900 tracking-tight">Gestor de Plantillas</h3>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-2">Documentos y Consentimientos</p>
                            </div>
                            {/* TEMPLATE SEARCH BAR */}
                            <div className="flex-1 max-w-sm mx-4">
                                <div className="relative">
                                    <Search size={16} className="absolute left-4 top-3.5 text-slate-400" />
                                    <input
                                        value={templateSearch}
                                        onChange={(e) => setTemplateSearch(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-3 text-xs font-bold outline-none focus:ring-4 focus:ring-slate-100 transition-all"
                                        placeholder="Buscar plantilla..."
                                    />
                                </div>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".pdf,.docx,.txt"
                                onChange={handleUploadTemplate}
                            />
                            <button onClick={() => fileInputRef.current?.click()} className="bg-slate-900 text-white px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-transform flex items-center gap-2">
                                <UserPlus size={16} /> Subir Plantilla
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {templates.map(doc => {
                                const isMatch = templateSearch ? doc.title.toLowerCase().includes(templateSearch.toLowerCase()) : true;
                                if (!isMatch) return null;
                                return (
                                    <div
                                        key={doc.id}
                                        id={`template-${doc.id}`}
                                        className="group bg-white p-6 rounded-xl border border-slate-200 hover:shadow-lg hover:border-slate-300 transition-all cursor-pointer relative"
                                    >
                                        <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="bg-slate-900 p-2 rounded-full shadow-md text-white"><Download size={14} /></div>
                                        </div>
                                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                                            {doc.type === 'pdf' ? <FileTextIcon size={24} className="text-rose-500" /> : <FileTextIcon size={24} className="text-blue-600" />}
                                        </div>
                                        <h4 className="text-xs font-bold text-slate-900 uppercase leading-snug mb-2 line-clamp-2 min-h-[2.5em]">{doc.title}</h4>
                                        <div className="flex justify-between items-center opacity-60">
                                            <span className="text-[9px] font-bold uppercase bg-slate-100 px-2 py-1 rounded text-slate-600">{doc.category}</span>
                                            <span className="text-[9px] font-bold text-slate-400">{doc.size}</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {settingsTab === 'stock' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                        <div className="flex justify-between items-end">
                            <div>
                                <h3 className="text-3xl font-bold text-slate-900 tracking-tight">Inventario Global</h3>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-2">Gestión de Stock y Mínimos</p>
                            </div>
                            <button className="bg-slate-900 text-white px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-transform flex items-center gap-2">
                                <Plus size={16} /> Añadir Producto
                            </button>
                        </div>


                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 tracking-widest border-b border-slate-100">
                                    <tr><th className="p-6">Producto</th><th className="p-6">Categoría</th><th className="p-6 text-right">Stock</th><th className="p-6 text-right">Mínimo</th><th className="p-6 text-center">Estado</th><th className="p-6"></th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {stock.map(item => (
                                        <tr key={item.id} className="text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                                            <td className="p-6 text-slate-900">{item.name}</td>
                                            <td className="p-6"><span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] uppercase font-bold">{item.category}</span></td>
                                            <td className="p-6 text-right font-bold">{item.quantity} <span className="text-[10px] font-bold text-slate-400 uppercase">{item.unit}</span></td>
                                            <td className="p-6 text-right text-slate-400">{item.minStock}</td>
                                            <td className="p-6 text-center">
                                                {item.quantity <= item.minStock ? (
                                                    <span className="bg-rose-100 text-rose-600 px-3 py-1 rounded-full text-[9px] font-black uppercase flex items-center justify-center gap-1 mx-auto w-fit"><AlertTriangle size={10} /> Bajo Stock</span>
                                                ) : (
                                                    <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-[9px] font-black uppercase flex items-center justify-center gap-1 mx-auto w-fit"><CheckCircle2 size={10} /> OK</span>
                                                )}
                                            </td>
                                            <td className="p-6 text-right">
                                                {currentUserRole === 'ADMIN' && (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={() => handleUpdateStock(item.id, -1)} className="p-1 hover:bg-slate-200 rounded"><Minus size={14} /></button>
                                                        <button onClick={() => handleUpdateStock(item.id, 1)} className="p-1 hover:bg-slate-200 rounded"><Plus size={14} /></button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};

export default Settings;
