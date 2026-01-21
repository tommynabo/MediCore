import React, { useState, useRef } from 'react';
import { Search, UserPlus, Download, Plus, Minus, Package, AlertTriangle, CheckCircle2, FileText as FileTextIcon } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { DocumentTemplate } from '../../types';

const Settings: React.FC = () => {
    const { stock, setStock, currentUserRole } = useAppContext();
    const [settingsTab, setSettingsTab] = useState<'templates' | 'stock'>('templates');
    const [templateSearch, setTemplateSearch] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

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
            </div>

            {/* SETTINGS CONTENT */}
            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
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

                        <div className="space-y-6 animate-in fade-in">
                            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl">
                                <h3 className="text-xl font-black text-slate-900 mb-2">Plantillas y Documentos</h3>
                                <p className="text-sm text-slate-500 mb-8">Gestione los documentos legales y consentimientos de la clínica.</p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* MOCK PDF LIST - Since upload script is blocked, we show what would be there */}
                                    {[
                                        { title: "Consentimiento Informado General", lang: "Español", file: "consent_general_es.pdf" },
                                        { title: "Consentimiento Endodoncia", lang: "Catalán", file: "consent_endo_ca.pdf" },
                                        { title: "Protección de Datos (RGPD)", lang: "Español", file: "rgpd_es.pdf" },
                                        { title: "Instrucciones Post-Operatorias", lang: "Español", file: "postop_es.pdf" },
                                        { title: "Hoja de Primera Visita", lang: "Français", file: "first_visit_fr.pdf" },
                                    ].map((doc, idx) => (
                                        <div key={idx} className="group p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-lg hover:border-slate-200 transition-all cursor-pointer flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-500">
                                                    <FileTextIcon size={24} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-900 text-sm">{doc.title}</h4>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="bg-slate-200 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase text-slate-500">{doc.lang}</span>
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase">PDF • A4</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                                                <Download size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
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
        </div>
    );
};

export default Settings;
