import React, { useState, useMemo } from 'react';
import {
    Search, Plus, Filter, UserCheck, ShieldCheck, Mail, CheckCircle2, Edit, Check, Edit3, Trash2,
    ArrowUp, Activity, FileText, ClipboardCheck, Layers, DollarSign, PenTool, Smile, Calculator,
    Phone, Settings, Download, Zap, TrendingUp, CreditCard, FileText as FileTextIcon // Alias for conflict
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Patient, ClinicalRecord, Specialization, Doctor, Invoice, Appointment } from '../../types';
import { Odontogram } from '../components/Odontogram';
import { DOCTORS, DENTAL_SERVICES } from '../constants';

const Patients: React.FC = () => {
    const {
        patients, setPatients, searchQuery, setSearchQuery,
        selectedPatient, setSelectedPatient, clinicalRecords, setClinicalRecords,
        invoices, setInvoices, api
    } = useAppContext();

    // Navigation State
    const [patientTab, setPatientTab] = useState<string>('ficha');

    // Local State for Budgets
    const [budgets, setBudgets] = useState<any[]>([]);

    // Fetch budgets when patient is selected or tab changes
    React.useEffect(() => {
        if (selectedPatient && patientTab === 'budget') {
            api.budget.getByPatient(selectedPatient.id)
                .then(setBudgets)
                .catch(err => console.error("Failed to load budgets", err));
        }
    }, [selectedPatient, patientTab]);

    // Modal & Form States
    const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
    const [isEditingPatient, setIsEditingPatient] = useState(false);

    // History / Clinical Records
    const [isNewEntryModalOpen, setIsNewEntryModalOpen] = useState(false);
    const [isEditEntryModalOpen, setIsEditEntryModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<ClinicalRecord | null>(null);
    const [newEntryForm, setNewEntryForm] = useState({ treatment: '', observation: '', specialization: 'General' });

    // Treatments
    const [isNewTreatmentModalOpen, setIsNewTreatmentModalOpen] = useState(false);
    const [treatmentSearch, setTreatmentSearch] = useState('');
    const [treatmentForm, setTreatmentForm] = useState({ name: '', price: '', status: 'Pendiente' });
    const [isTreatmentSearchFocused, setIsTreatmentSearchFocused] = useState(false);

    // Prescriptions
    const [isPrescriptionOpen, setIsPrescriptionOpen] = useState(false);
    const [prescriptionText, setPrescriptionText] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    // Odontogram
    const [isOdontogramOpen, setIsOdontogramOpen] = useState(false);

    // Budget
    const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
    const [budgetForm, setBudgetForm] = useState({ title: '', items: [] as { name: string, price: number }[] });

    // New Patient Form State
    const [newPatient, setNewPatient] = useState({ name: '', dni: '', email: '', phone: '' });

    const handleCreatePatient = async () => {
        if (!newPatient.name || !newPatient.dni) {
            alert("Por favor rellene nombre y DNI.");
            return;
        }
        try {
            const created = await api.createPatient(newPatient);
            setPatients(prev => [...prev, created]);
            setIsNewPatientModalOpen(false);
            setNewPatient({ name: '', dni: '', email: '', phone: '' });
            alert("✅ Paciente creado correctamente");
        } catch (e) {
            console.error("Error creating patient:", e);
            alert("Error al crear paciente. Revise la consola.");
        }
    };

    // FORCE DATA LOAD if patients is empty (User Feedback Fix)
    React.useEffect(() => {
        if (patients.length === 0) {
            console.log("Patients list empty, forcing refresh...");
            api.getPatients()
                .then(pts => {
                    console.log(`Fetched ${pts.length} patients`);
                    setPatients(pts);
                })
                .catch(err => console.error("Error auto-fetching patients", err));
        }
    }, []); // Run once on mount

    // Computed
    const filteredPatients = useMemo(() => {
        return patients.filter(p =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.dni.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [patients, searchQuery]);

    // Handlers
    const handleDeleteRecord = async (id: string) => {
        if (confirm("¿Seguro que quieres borrar esta entrada?")) {
            try {
                await api.clinicalRecords.delete(id);
                setClinicalRecords(prev => prev.filter(r => r.id !== id));
            } catch (e) {
                alert("Error borrando el registro.");
                console.error(e);
            }
        }
    };

    const handleUpdateRecord = () => {
        if (!editingRecord) return;
        setClinicalRecords(prev => prev.map(r => r.id === editingRecord.id ? editingRecord : r));
        setIsEditEntryModalOpen(false);
        setEditingRecord(null);
    };

    const handleGenerateReceta = async (medication: string) => {
        if (!medication) return;
        setIsProcessing(true);
        try {
            const prompt = `Genera una receta médica formal válida en España para el paciente ${selectedPatient?.name} (DNI: ${selectedPatient?.dni}) para el medicamento: ${medication}. Incluye posología estándar, fechas y formato de firma.`;
            const response = await api.ai.query(prompt, selectedPatient?.id);
            setPrescriptionText(response.answer || response.message || response.content || "No se pudo generar la receta.");

            // Refresh Clinical Records to show the new prescription
            if (selectedPatient) {
                const records = await api.clinicalRecords.getByPatient(selectedPatient.id);
                setClinicalRecords(records);
            }
        } catch (e) {
            console.error(e);
            setPrescriptionText("Error generando receta con IA.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleOdontogramAddTreatment = (toothId: number) => {
        setTreatmentForm({ name: `Tratamiento Diente ${toothId}`, price: '50', status: 'Pendiente' });
        setIsNewTreatmentModalOpen(true);
    };

    const handleOdontogramAddBudget = (toothId: number, status: string) => {
        setBudgetForm({
            title: `Presupuesto Diente ${toothId}`,
            items: [{ name: `Tratamiento para ${status} en pieza ${toothId}`, price: 100 }]
        });
        setIsBudgetModalOpen(true);
    };

    return (
        <div className="flex h-full gap-8 max-w-[1920px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* LEFT COLUMN: PATIENT LIST */}
            <div className={`flex flex-col gap-6 transition-all duration-500 ease-in-out ${selectedPatient ? 'w-1/3 min-w-[320px] hidden xl:flex' : 'w-full max-w-5xl mx-auto'}`}>
                {/* Same list code as before... */}
                <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Pacientes</h2>
                    <div className="flex gap-2">
                        <button onClick={() => setIsNewPatientModalOpen(true)} className="bg-slate-900 text-white p-4 rounded-2xl hover:scale-105 transition-transform shadow-xl shadow-slate-900/20">
                            <Plus />
                        </button>
                    </div>
                </div>
                <div className="flex gap-4 mb-6">
                    <div className="relative group flex-1">
                        <Search className="absolute left-5 top-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar por nombre, DNI..."
                            className="w-full bg-white border border-slate-200 p-5 pl-14 rounded-2xl text-sm font-bold shadow-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                        />
                        <button className="absolute right-4 top-4 p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900"><Filter size={16} /></button>
                    </div>

                </div>
                <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                    {filteredPatients.map(patient => (
                        <div
                            key={patient.id}
                            onClick={() => { setSelectedPatient(patient); setPatientTab('ficha'); }}
                            className={`group p-5 rounded-[1.5rem] cursor-pointer border transition-all duration-300 relative overflow-hidden
                  ${selectedPatient?.id === patient.id
                                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xl scale-[1.02]'
                                    : 'bg-white text-slate-600 border-slate-100 hover:border-blue-300 hover:shadow-lg'
                                }
                `}
                        >
                            <div className="flex justify-between items-start relative z-10">
                                <div className="flex gap-4 items-center">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm transition-colors
                           ${selectedPatient?.id === patient.id ? 'bg-white text-slate-900' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600'}
                        `}>
                                        {patient.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className={`text-sm font-black ${selectedPatient?.id === patient.id ? 'text-white' : 'text-slate-900'}`}>{patient.name}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${selectedPatient?.id === patient.id ? 'text-slate-400' : 'text-slate-400'}`}>
                                                ID: {patient.id.slice(0, 6)}...
                                            </span>
                                            {patient.insurance === 'Privado' && <span className="w-2 h-2 rounded-full bg-amber-400"></span>}
                                            {(patient.insurance === 'Sanitas' || patient.insurance === 'Adeslas') && <span className="w-2 h-2 rounded-full bg-blue-400"></span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT COLUMN: DETAIL */}
            {selectedPatient && (
                <div className="flex-1 bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-right-8 duration-500 z-10 relative">

                    {/* HEADER SIDEBAR (Mobile/Desktop split logic from App.tsx simplified here) */}
                    <div className="px-8 pt-8 pb-4 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-xl sticky top-0 z-10">
                        <div className="flex gap-1 overflow-x-auto no-scrollbar">
                            {['ficha', 'history', 'odontogram', 'treatments', 'prescriptions', 'billing', 'docs', 'budget'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setPatientTab(tab)}
                                    className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap
                        ${patientTab === tab
                                            ? 'bg-slate-900 text-white shadow-lg'
                                            : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
                                        }
                      `}
                                >
                                    {tab === 'history' ? 'Historial' : tab === 'treatments' ? 'Tratamientos' : tab === 'prescriptions' ? 'Recetas' : tab === 'billing' ? 'Pagos' : tab === 'docs' ? 'Docs' : tab === 'budget' ? 'Pptos' : tab}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => setSelectedPatient(null)} className="p-3 hover:bg-slate-50 rounded-full text-slate-400 xl:hidden">
                            X
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-slate-50/50 relative">

                        {/* FICHA TAB */}
                        {patientTab === 'ficha' && (
                            <div className="max-w-4xl mx-auto space-y-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Ficha del Paciente</h2>
                                    <button
                                        onClick={() => setIsEditingPatient(!isEditingPatient)}
                                        className={`px-6 py-2 rounded-xl text-xs font-bold uppercase flex items-center gap-2 transition-all ${isEditingPatient ? 'bg-emerald-50 text-emerald-600' : 'bg-white border border-slate-200'}`}
                                    >
                                        {isEditingPatient ? <><Check size={16} /> Guardar</> : <><Edit size={16} /> Modificar</>}
                                    </button>
                                </div>

                                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm grid grid-cols-2 gap-8">
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Nombre</label>
                                        <input disabled={!isEditingPatient} value={selectedPatient.name} onChange={(e) => setSelectedPatient({ ...selectedPatient, name: e.target.value })} className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">DNI</label>
                                        <input disabled={!isEditingPatient} value={selectedPatient.dni} className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1 block">Email</label>
                                        <input disabled={!isEditingPatient} value={selectedPatient.email} className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-bold" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* HISTORY TAB */}
                        {patientTab === 'history' && (
                            <div className="space-y-6 animate-in fade-in max-w-4xl mx-auto">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">Evolución Clínica</h3>
                                    <button className="text-xs font-bold text-blue-600 flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-xl" onClick={() => setIsNewEntryModalOpen(true)}>
                                        <Plus size={16} /> Nueva Entrada
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    {clinicalRecords.filter(r => r.patientId === selectedPatient.id).length === 0 ? (
                                        <div className="text-center p-8 opacity-50"><p className="text-xs font-bold uppercase">No hay historial clínico registrado</p></div>
                                    ) : (
                                        clinicalRecords.filter(r => r.patientId === selectedPatient.id).map(r => (
                                            <div key={r.id} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                                                <div className="flex justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs">EV</div>
                                                        <div>
                                                            <p className="text-sm font-black text-slate-900">Dr. {DOCTORS.find(d => d.specialization === r.specialization)?.name || 'General'}</p>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase">{r.specialization}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <p className="text-[10px] font-bold text-slate-400">{new Date(r.date).toLocaleDateString()}</p>
                                                        <div className="flex gap-2">
                                                            <button onClick={() => { setEditingRecord(r); setIsEditEntryModalOpen(true); }} className="text-slate-400 hover:text-blue-500 transition-colors"><Edit3 size={16} /></button>
                                                            <button onClick={() => handleDeleteRecord(r.id)} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-sm font-medium text-slate-600 leading-relaxed">
                                                    <p className="text-xs font-black uppercase text-slate-800 mb-1">{r.clinicalData.treatment}</p>
                                                    {r.clinicalData.observation}
                                                </div>
                                            </div>
                                        )))}
                                </div>
                            </div>
                        )}

                        {/* TREATMENTS TAB */}
                        {patientTab === 'treatments' && (
                            <div className="space-y-6 animate-in fade-in max-w-4xl mx-auto">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-3xl font-bold text-slate-900 tracking-tight">Plan de Tratamiento</h3>
                                    <button onClick={() => setIsNewTreatmentModalOpen(true)} className="text-xs font-bold text-blue-600 flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-xl hover:bg-blue-100 transition-colors">
                                        <Plus size={16} /> Nuevo Tratamiento
                                    </button>
                                </div>
                                <div className="bg-white p-10 rounded-2xl border border-slate-200 shadow-sm text-center">
                                    <div className="grid grid-cols-12 gap-4 pb-4 border-b border-slate-100 text-slate-400 text-[10px] font-bold uppercase tracking-widest text-left">
                                        <div className="col-span-1">Pieza</div>
                                        <div className="col-span-4">Tratamiento</div>
                                        <div className="col-span-3">Estado</div>
                                        <div className="col-span-3">Precio</div>
                                        <div className="col-span-1 text-right">Acciones</div>
                                    </div>
                                    <div className="space-y-2 mt-4">
                                        {clinicalRecords.filter(r => r.patientId === selectedPatient?.id).length === 0 ? (
                                            <div className="p-4 text-center text-slate-400 text-xs">No hay tratamientos activos.</div>
                                        ) : (
                                            clinicalRecords.filter(r => r.patientId === selectedPatient?.id).map((record, idx) => (
                                                <div key={idx} className="grid grid-cols-12 gap-4 items-center p-3 bg-slate-50 rounded-xl text-[10px] font-black uppercase text-slate-600 border border-slate-100 hover:bg-blue-50 transition-colors cursor-pointer text-left">
                                                    <div className="col-span-1 border-r border-slate-200 pr-2 text-center text-slate-400">
                                                        {record.clinicalData.treatment.includes('Diente') ? record.clinicalData.treatment.split('Diente ')[1] : '-'}
                                                    </div>
                                                    <div className="col-span-4 text-slate-900 line-clamp-1" title={record.clinicalData.treatment}>
                                                        {record.clinicalData.treatment}
                                                    </div>
                                                    <div className="col-span-3 text-emerald-600">
                                                        Realizado
                                                    </div>
                                                    <div className="col-span-3 text-slate-900">
                                                        {record.clinicalData.price ? record.clinicalData.price + '€' : '-'}
                                                    </div>
                                                    <div className="col-span-1 text-right">
                                                        <button className="text-slate-400 hover:text-red-500"><Trash2 size={12} /></button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* PRESCRIPTIONS TAB */}
                        {patientTab === 'prescriptions' && (
                            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Recetas</h2>
                                    <button onClick={() => setIsPrescriptionOpen(true)} className="bg-emerald-500 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase flex items-center gap-2 hover:bg-emerald-600 transition-colors shadow-lg"><Plus size={16} /> Nueva Receta</button>
                                </div>
                                {isPrescriptionOpen && (
                                    <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200">
                                        <div className="flex gap-2 mb-4">
                                            <input className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none" placeholder="Medicamento..." onKeyDown={e => { if (e.key === 'Enter') handleGenerateReceta((e.target as HTMLInputElement).value); }} />
                                            <button className="bg-slate-900 text-white p-3 rounded-xl"><Zap size={16} /></button>
                                        </div>
                                        {isProcessing && <div className="text-center p-4 text-xs font-bold text-blue-500">Generando...</div>}
                                        {prescriptionText && (
                                            <div className="bg-white p-6 rounded-2xl text-xs font-mono mb-4 whitespace-pre-wrap">{prescriptionText}</div>
                                        )}
                                    </div>
                                )}
                                <div className="space-y-4">
                                    {(selectedPatient.prescriptions || []).map((receta, idx) => (
                                        <div key={idx} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex justify-between items-center">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center"><FileTextIcon size={24} /></div>
                                                <div><p className="font-bold text-slate-900 text-sm line-clamp-1">{receta}</p></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ODONTOGRAM TAB */}
                        {patientTab === 'odontogram' && (
                            <div className="h-full flex flex-col items-center">
                                <h3 className="text-2xl font-black mb-4">Odontograma</h3>
                                <Odontogram
                                    patientId={selectedPatient.id}
                                    isEditable={true}
                                    initialState={{}}
                                    onAddTreatment={handleOdontogramAddTreatment}
                                    onAddToBudget={handleOdontogramAddBudget}
                                />
                            </div>
                        )}

                        {/* BILLING TAB */}
                        {patientTab === 'billing' && (
                            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
                                <h3 className="text-3xl font-black text-slate-900 tracking-tight">Caja y Facturación</h3>
                                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                                    <h4 className="text-lg font-black text-slate-900 mb-6">Historial de Facturas</h4>
                                    <div className="space-y-2">
                                        {invoices.filter(i => i.patientId === selectedPatient.id).length === 0 ? (
                                            <p className="text-xs text-slate-500 font-bold opacity-50">No hay facturas emitidas.</p>
                                        ) : (
                                            invoices.filter(i => i.patientId === selectedPatient.id).map(inv => (
                                                <div key={inv.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl">
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900">{inv.invoiceNumber}</p>
                                                        <p className="text-[10px] font-bold text-slate-400">{new Date(inv.date).toLocaleDateString()}</p>
                                                    </div>
                                                    <p className="text-sm font-black text-slate-900">{inv.amount}€</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* PLACEHOLDER TABS */}
                        {(patientTab === 'docs') && (
                            <div className="p-10 text-center opacity-50 font-bold uppercase">
                                Sección {patientTab} en construcción
                            </div>
                        )}

                        {/* BUDGET TAB OVERRIDE if 'budget' */}
                        {patientTab === 'budget' && (
                            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Presupuestos</h2>
                                    <button onClick={() => setIsBudgetModalOpen(true)} className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-lg"><Plus size={16} /> Nuevo Presupuesto</button>
                                </div>
                                <div className="space-y-4">
                                    {budgets.length === 0 ? (
                                        <div className="p-10 text-center opacity-50 font-bold uppercase">No hay presupuestos registrados</div>
                                    ) : (
                                        budgets.map((budget: any) => (
                                            <div key={budget.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h4 className="text-xl font-black text-slate-900">{budget.title || `Presupuesto #${budget.id.substring(0, 6)}`}</h4>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(budget.createdAt).toLocaleDateString()}</p>
                                                    </div>
                                                    <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${budget.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                                        {budget.status || 'BORRADOR'}
                                                    </div>
                                                </div>
                                                <div className="space-y-2 mb-4">
                                                    {budget.items?.map((item: any, idx: number) => (
                                                        <div key={idx} className="flex justify-between text-xs font-bold text-slate-600 border-b border-slate-50 pb-1">
                                                            <span>{item.name}</span>
                                                            <span>{item.price}€</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => handleDeleteBudget(budget.id)} className="text-xs font-bold text-red-500 bg-red-50 px-3 py-2 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1"><Trash2 size={12} /> Borrar</button>
                                                    <button className="text-xs font-bold text-purple-600 bg-purple-50 px-3 py-2 rounded-lg hover:bg-purple-100 transition-colors">Convertir a Factura</button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* NEW PATIENT MODAL */}
            {isNewPatientModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
                    <div className="bg-white max-w-lg w-full rounded-[2rem] p-8 shadow-2xl">
                        <h3 className="text-2xl font-black text-slate-900 mb-6">Nuevo Paciente</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400">Nombre Completo</label>
                                <input
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold"
                                    placeholder="Ej. Juan Pérez"
                                    value={newPatient.name}
                                    onChange={e => setNewPatient({ ...newPatient, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400">DNI / NIE</label>
                                <input
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold"
                                    placeholder="12345678X"
                                    value={newPatient.dni}
                                    onChange={e => setNewPatient({ ...newPatient, dni: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400">Email</label>
                                <input
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold"
                                    placeholder="juan@email.com"
                                    value={newPatient.email}
                                    onChange={e => setNewPatient({ ...newPatient, email: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex gap-4 mt-6">
                            <button onClick={() => setIsNewPatientModalOpen(false)} className="flex-1 py-3 font-bold text-slate-500">Cancelar</button>
                            <button onClick={handleCreatePatient} className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold uppercase shadow-lg">Guardar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* NEW CLINICAL RECORD MODAL */}
            {isNewEntryModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
                    <div className="bg-white max-w-lg w-full rounded-[2rem] p-8 shadow-2xl">
                        <h3 className="text-2xl font-black text-slate-900 mb-6">Nueva Entrada Historial</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400">Tratamiento / Título</label>
                                <input
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold"
                                    placeholder="Ej. Revisión General"
                                    value={newEntryForm.treatment}
                                    onChange={e => setNewEntryForm({ ...newEntryForm, treatment: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-black uppercase text-slate-400 flex justify-between items-center mb-2">
                                    <span>Detalles</span>
                                    <button
                                        onClick={async () => {
                                            if (!newEntryForm.observation) return alert("Escribe algo primero...");
                                            console.log("AI Request:", newEntryForm.observation);
                                            setIsProcessing(true);
                                            try {
                                                const prompt = `Reescribe y estructura profesionalmente la siguiente nota clínica odontológica, organizándola por puntos clave (Motivo, Observación, Plan): "${newEntryForm.observation}"`;
                                                const res = await api.ai.query(prompt, selectedPatient?.id);
                                                console.log("AI Response:", res);
                                                if (res && (res.answer || res.message || res.content)) {
                                                    setNewEntryForm(prev => ({ ...prev, observation: res.answer || res.message || res.content }));
                                                } else {
                                                    alert("La IA no devolvió respuesta válida.");
                                                }
                                            } catch (e) { console.error(e); alert("Error conectando con IA: " + e.message); }
                                            setIsProcessing(false);
                                        }}
                                        className="text-xs bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-lg shadow-indigo-200"
                                    >
                                        ✨ Mejorar redacción (AI)
                                    </button>
                                </label>
                                <textarea
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold h-32"
                                    placeholder="Escribe las notas sin orden... la IA lo arreglará."
                                    value={newEntryForm.observation}
                                    onChange={e => setNewEntryForm({ ...newEntryForm, observation: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400">Especialidad</label>
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold"
                                    value={newEntryForm.specialization}
                                    onChange={e => setNewEntryForm({ ...newEntryForm, specialization: e.target.value })}
                                >
                                    <option value="General">General</option>
                                    <option value="Odontología">Odontología</option>
                                    <option value="Ortodoncia">Ortodoncia</option>
                                    <option value="Implantología">Implantología</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-4 mt-6">
                            <button onClick={() => setIsNewEntryModalOpen(false)} className="flex-1 py-3 font-bold text-slate-500">Cancelar</button>
                            <button
                                onClick={async () => {
                                    if (!newEntryForm.treatment) return alert("Rellene el tratamiento");
                                    if (!selectedPatient?.id) {
                                        console.error("❌ No matches for selectedPatient ID");
                                        return alert("Error: Paciente no seleccionado correctamente.");
                                    }
                                    try {
                                        const payload = { ...newEntryForm, patientId: selectedPatient.id };
                                        console.log("🚀 Sending Clinical Record Payload:", payload);
                                        const rec = await api.clinicalRecords.create(payload);
                                        console.log("✅ Server Response:", rec);
                                        setClinicalRecords(prev => [rec, ...prev]);
                                        setIsNewEntryModalOpen(false);
                                        setNewEntryForm({ treatment: '', observation: '', specialization: 'General' });
                                        alert("Historial actualizado correctamente");
                                    } catch (e) { alert("Error al guardar: " + e.message); }
                                }}
                                className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold uppercase shadow-lg"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* NEW TREATMENT MODAL */}
            {isNewTreatmentModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
                    <div className="bg-white max-w-lg w-full rounded-[2rem] p-8 shadow-2xl">
                        <h3 className="text-2xl font-black text-slate-900 mb-6">Nuevo Tratamiento</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400">Nombre del Tratamiento</label>
                                <input
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold"
                                    placeholder="Ej. Implante Muela"
                                    value={treatmentForm.name}
                                    onChange={e => setTreatmentForm({ ...treatmentForm, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400">Precio Estimado (€)</label>
                                <input
                                    type="number"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold"
                                    placeholder="0.00"
                                    value={treatmentForm.price}
                                    onChange={e => setTreatmentForm({ ...treatmentForm, price: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex gap-4 mt-6">
                            <button onClick={() => setIsNewTreatmentModalOpen(false)} className="flex-1 py-3 font-bold text-slate-500">Cancelar</button>
                            <button
                                onClick={async () => {
                                    if (!treatmentForm.name) return alert("Nombre requerido");
                                    try {
                                        // Save as Clinical Record primarily (as requested for history)
                                        const rec = await api.clinicalRecords.create({
                                            patientId: selectedPatient?.id,
                                            treatment: treatmentForm.name,
                                            observation: `Precio Estimado: ${treatmentForm.price}€`,
                                            specialization: 'Odontología',
                                            price: Number(treatmentForm.price)
                                        });
                                        setClinicalRecords(prev => [rec, ...prev]);
                                        setIsNewTreatmentModalOpen(false);
                                        setTreatmentForm({ name: '', price: '', status: 'Pendiente' });
                                        alert("Tratamiento guardado en historial");
                                    } catch (e) { alert("Error: " + e.message); }
                                }}
                                className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold uppercase shadow-lg"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )
            }

            {/* BUDGET MODAL */}
            {
                isBudgetModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6">
                        <div className="bg-white max-w-lg w-full rounded-[2rem] p-8 shadow-2xl">
                            <h3 className="text-2xl font-black text-slate-900 mb-6">Nuevo Presupuesto</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-slate-400">Título</label>
                                    <input
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold"
                                        placeholder="Ej. Implante completo"
                                        value={budgetForm.title}
                                        onChange={e => setBudgetForm({ ...budgetForm, title: e.target.value })}
                                    />
                                </div>
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 max-h-60 overflow-y-auto">
                                    <p className="text-xs font-bold text-slate-500 mb-2">Conceptos:</p>
                                    {budgetForm.items.map((item, idx) => (
                                        <div key={idx} className="flex gap-2 items-center mb-2">
                                            <input
                                                className="flex-1 bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold outline-none"
                                                value={item.name}
                                                onChange={(e) => {
                                                    const newItems = [...budgetForm.items];
                                                    newItems[idx].name = e.target.value;
                                                    setBudgetForm({ ...budgetForm, items: newItems });
                                                }}
                                                placeholder="Concepto"
                                            />
                                            <input
                                                type="number"
                                                className="w-20 bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold outline-none"
                                                value={item.price}
                                                onChange={(e) => {
                                                    const newItems = [...budgetForm.items];
                                                    newItems[idx].price = parseFloat(e.target.value) || 0;
                                                    setBudgetForm({ ...budgetForm, items: newItems });
                                                }}
                                                placeholder="€"
                                            />
                                            <button
                                                onClick={() => {
                                                    const newItems = budgetForm.items.filter((_, i) => i !== idx);
                                                    setBudgetForm({ ...budgetForm, items: newItems });
                                                }}
                                                className="p-2 text-red-400 hover:text-red-600"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => setBudgetForm({ ...budgetForm, items: [...budgetForm.items, { name: '', price: 0 }] })}
                                        className="w-full py-2 bg-white border border-dashed border-slate-300 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-600 hover:border-slate-400 transition-colors"
                                    >
                                        + Añadir Concepto
                                    </button>
                                    {budgetForm.items.length === 0 && <p className="text-center text-[10px] text-slate-400 mt-2">Añada conceptos al presupuesto</p>}
                                </div>
                            </div>

                            {/* Financing Info */}
                            <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                                <p className="text-[10px] font-black uppercase text-indigo-400 mb-1">Opciones de Pago</p>
                                <p className="text-xs text-indigo-900 font-bold">
                                    💡 Podrás definir los plazos (ej. 3 pagos en 6 meses) y generar un plan de financiación una vez creado el presupuesto base.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4 mt-6">
                            <button onClick={() => setIsBudgetModalOpen(false)} className="flex-1 py-3 font-bold text-slate-500">Cancelar</button>
                            <button
                                onClick={async () => {
                                    if (!budgetForm.title) return alert("Indique título");
                                    try {
                                        await api.budget.create(
                                            selectedPatient?.id,
                                            budgetForm.items
                                        );

                                        alert("Presupuesto Creado Correctamente");
                                        setIsBudgetModalOpen(false);
                                        // Refresh Budgets List
                                        const updatedBudgets = await api.budget.getByPatient(selectedPatient?.id);
                                        setBudgets(updatedBudgets);
                                        setPatientTab('budget'); // Switch to tab to view it
                                    } catch (e) { alert("Error al crear: " + e.message); }
                                }}
                                className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold uppercase shadow-lg"
                            >
                                Crear
                            </button>
                        </div>
                    </div>
    </div >
    )
}
        </div >
    );
};

export default Patients;
