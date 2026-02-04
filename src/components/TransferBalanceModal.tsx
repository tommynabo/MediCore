import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, Wallet, User, FileText, X, Check, AlertCircle } from 'lucide-react';
import { Patient, Doctor, PatientTreatment } from '../../types';
import { api } from '../services/api';

interface AdvancePayment {
    id: string;
    amount: number;
    date: string;
    invoiceId?: string;
    notes?: string;
}

interface AdvanceBalanceData {
    patientId: string;
    totalAdvanced: number;
    totalTransferred: number;
    availableBalance: number;
    advances: AdvancePayment[];
}

interface TransferBalanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    patient: Patient;
    treatments: PatientTreatment[];
    doctors: Doctor[];
    onTransferComplete: () => void;
}

export const TransferBalanceModal: React.FC<TransferBalanceModalProps> = ({
    isOpen,
    onClose,
    patient,
    treatments,
    doctors,
    onTransferComplete
}) => {
    const [advanceData, setAdvanceData] = useState<AdvanceBalanceData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    // Form State
    const [selectedAdvanceId, setSelectedAdvanceId] = useState('');
    const [transferAmount, setTransferAmount] = useState('');
    const [selectedTreatment, setSelectedTreatment] = useState<PatientTreatment | null>(null);
    const [selectedDoctorId, setSelectedDoctorId] = useState('');
    const [customConcept, setCustomConcept] = useState('');
    const [notes, setNotes] = useState('');

    // Load advance balance data
    useEffect(() => {
        if (isOpen && patient.id) {
            setLoading(true);
            api.payments.getAdvanceBalance(patient.id)
                .then(data => {
                    setAdvanceData(data);
                    // Auto-select first advance if exists
                    if (data.advances?.length > 0) {
                        setSelectedAdvanceId(data.advances[0].id);
                    }
                })
                .catch(err => console.error("Error loading advance balance:", err))
                .finally(() => setLoading(false));
        }
    }, [isOpen, patient.id]);

    // Reset form when modal closes
    useEffect(() => {
        if (!isOpen) {
            setSelectedAdvanceId('');
            setTransferAmount('');
            setSelectedTreatment(null);
            setSelectedDoctorId('');
            setCustomConcept('');
            setNotes('');
        }
    }, [isOpen]);

    // Handle treatment selection
    const handleTreatmentSelect = (treatment: PatientTreatment) => {
        setSelectedTreatment(treatment);
        setTransferAmount(String(treatment.price || 0));
        setCustomConcept(treatment.serviceName);
    };

    const handleSubmit = async () => {
        if (!selectedAdvanceId || !transferAmount || !selectedDoctorId) {
            alert('Por favor, completa todos los campos requeridos');
            return;
        }

        const amount = parseFloat(transferAmount);
        if (amount <= 0 || amount > (advanceData?.availableBalance || 0)) {
            alert(`Importe inválido. Saldo disponible: ${advanceData?.availableBalance}€`);
            return;
        }

        setIsProcessing(true);

        try {
            await api.payments.transfer({
                patientId: patient.id,
                sourcePaymentId: selectedAdvanceId,
                amount,
                treatmentId: selectedTreatment?.id,
                treatmentName: customConcept || selectedTreatment?.serviceName,
                doctorId: selectedDoctorId,
                notes
            });

            alert('✅ Saldo transferido correctamente.\n\nNo se ha generado nueva factura (ya se emitió con el anticipo original).');
            onTransferComplete();
            onClose();
        } catch (error: any) {
            console.error("Transfer error:", error);
            alert('❌ Error: ' + (error.message || 'Error al transferir saldo'));
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    const pendingTreatments = treatments.filter(t =>
        t.status === 'PRESUPUESTADO' || t.status === 'PENDIENTE' || t.status === 'EN_PROCESO'
    );

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-white max-w-3xl w-full rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500 max-h-[90vh] flex flex-col">

                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-8 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                            <ArrowRightLeft /> Transferir Saldo a Tratamiento
                        </h2>
                        <p className="text-sm text-emerald-100 mt-1">
                            Paciente: <strong>{patient.name}</strong>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-xl transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 space-y-6 overflow-y-auto flex-1">

                    {loading ? (
                        <div className="text-center py-12 text-slate-400">
                            <div className="animate-spin inline-block w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full mb-4"></div>
                            <p>Cargando saldo...</p>
                        </div>
                    ) : (
                        <>
                            {/* Info Banner */}
                            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-xs text-emerald-800 flex gap-3 items-start">
                                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                                <div>
                                    <strong>Transferencia sin nueva factura:</strong> Al transferir saldo "a cuenta" a un tratamiento,
                                    NO se genera una nueva factura (evita duplicados con Hacienda).
                                    El dinero se asigna al doctor seleccionado para su comisión.
                                </div>
                            </div>

                            {/* Available Balance */}
                            <div className="bg-slate-900 text-white p-6 rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="bg-emerald-500 p-3 rounded-xl">
                                        <Wallet size={28} />
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase text-slate-400 font-bold">Saldo Disponible (A Cuenta)</p>
                                        <p className="text-3xl font-black">{advanceData?.availableBalance?.toFixed(2) || '0.00'}€</p>
                                    </div>
                                </div>
                                <div className="text-right text-sm text-slate-400">
                                    <p>Total depositado: {advanceData?.totalAdvanced?.toFixed(2)}€</p>
                                    <p>Ya asignado: {advanceData?.totalTransferred?.toFixed(2)}€</p>
                                </div>
                            </div>

                            {advanceData?.availableBalance === 0 ? (
                                <div className="text-center py-8 text-slate-400">
                                    <Wallet size={48} className="mx-auto mb-4 opacity-30" />
                                    <p className="font-bold">No hay saldo disponible para transferir</p>
                                    <p className="text-sm mt-2">El paciente debe realizar un pago a cuenta primero.</p>
                                </div>
                            ) : (
                                <>
                                    {/* Select Treatment (Optional) */}
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 mb-3 block">
                                            Tratamiento a Asignar (Opcional)
                                        </label>
                                        {pendingTreatments.length > 0 ? (
                                            <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto">
                                                {pendingTreatments.map(t => (
                                                    <button
                                                        key={t.id}
                                                        onClick={() => handleTreatmentSelect(t)}
                                                        className={`p-3 rounded-xl text-left border-2 transition-all text-sm ${selectedTreatment?.id === t.id
                                                            ? 'bg-emerald-50 border-emerald-400 text-emerald-900'
                                                            : 'bg-white border-slate-200 hover:border-slate-300'
                                                            }`}
                                                    >
                                                        <p className="font-bold truncate">{t.serviceName}</p>
                                                        <p className="text-xs text-slate-500">{t.price}€ · Diente {t.toothId || '-'}</p>
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-400 italic">No hay tratamientos pendientes de pago</p>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        {/* Transfer Amount */}
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">
                                                Importe a Transferir (€) *
                                            </label>
                                            <input
                                                type="number"
                                                value={transferAmount}
                                                onChange={(e) => setTransferAmount(e.target.value)}
                                                placeholder="0.00"
                                                max={advanceData?.availableBalance}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xl font-bold outline-none focus:ring-2 focus:ring-emerald-100"
                                            />
                                        </div>

                                        {/* Doctor Selection */}
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">
                                                Asignar a Doctor (Comisión) *
                                            </label>
                                            <select
                                                value={selectedDoctorId}
                                                onChange={(e) => setSelectedDoctorId(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-100"
                                            >
                                                <option value="">-- Seleccionar Doctor --</option>
                                                {doctors.map(d => (
                                                    <option key={d.id} value={d.id}>{d.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Custom Concept */}
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">
                                            Concepto
                                        </label>
                                        <input
                                            type="text"
                                            value={customConcept}
                                            onChange={(e) => setCustomConcept(e.target.value)}
                                            placeholder="Ej. Endodoncia, Limpieza..."
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none"
                                        />
                                    </div>

                                    {/* Notes */}
                                    <div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">
                                            Notas Internas (Opcional)
                                        </label>
                                        <input
                                            type="text"
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Notas adicionales..."
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none"
                                        />
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 pt-0 flex gap-4 shrink-0">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isProcessing || !transferAmount || !selectedDoctorId || (advanceData?.availableBalance === 0)}
                        className="flex-1 bg-emerald-600 text-white py-4 rounded-xl text-sm font-black uppercase shadow-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isProcessing ? (
                            <>⏳ Procesando...</>
                        ) : (
                            <>
                                <Check size={20} />
                                Transferir Saldo
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TransferBalanceModal;
