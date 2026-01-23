import React, { useState, useEffect } from 'react';
import { CreditCard, DollarSign, Wallet, X, Check } from 'lucide-react';
import { Payment, Patient, Budget } from '../../types';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    patient: Patient;
    budgets: Budget[];
    onPaymentComplete: (payment: Payment, invoice: any) => void;
}

type PaymentTab = 'DIRECT_CHARGE' | 'ADVANCE_PAYMENT';

export const PaymentModal: React.FC<PaymentModalProps> = ({
    isOpen,
    onClose,
    patient,
    budgets,
    onPaymentComplete
}) => {
    const [activeTab, setActiveTab] = useState<PaymentTab>('DIRECT_CHARGE');
    const [selectedBudgetId, setSelectedBudgetId] = useState('');
    const [advanceAmount, setAdvanceAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'wallet'>('cash');
    const [notes, setNotes] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const selectedBudget = budgets.find(b => b.id === selectedBudgetId);
    const availableWallet = patient.wallet || 0;

    // Calcular total a pagar
    const totalToPay = activeTab === 'DIRECT_CHARGE'
        ? (selectedBudget?.total || 0)
        : parseFloat(advanceAmount) || 0;

    // Validar si se puede usar wallet
    const canUseWallet = availableWallet > 0 && activeTab === 'DIRECT_CHARGE';

    useEffect(() => {
        if (!isOpen) {
            // Reset form when modal closes
            setSelectedBudgetId('');
            setAdvanceAmount('');
            setPaymentMethod('cash');
            setNotes('');
        }
    }, [isOpen]);

    const handleSubmit = async () => {
        // Validaciones
        if (activeTab === 'DIRECT_CHARGE' && !selectedBudgetId) {
            alert('Selecciona un presupuesto');
            return;
        }

        if (activeTab === 'ADVANCE_PAYMENT' && (!advanceAmount || parseFloat(advanceAmount) <= 0)) {
            alert('Introduce un importe válido');
            return;
        }

        // Validar wallet
        if (paymentMethod === 'wallet' && totalToPay > availableWallet) {
            alert(`Saldo insuficiente. Disponible: ${availableWallet}€`);
            return;
        }

        setIsProcessing(true);

        try {
            // Preparar datos de pago
            const paymentData: Partial<Payment> = {
                patientId: patient.id,
                amount: totalToPay,
                method: paymentMethod,
                type: activeTab,
                budgetId: activeTab === 'DIRECT_CHARGE' ? selectedBudgetId : undefined,
                notes: notes || undefined,
                createdAt: new Date().toISOString()
            };

            // TODO: Llamar a API para crear pago + factura automática
            console.log('Creating payment:', paymentData);

            // Simulación de respuesta
            const response = await fetch('/api/payments/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(paymentData)
            });

            if (!response.ok) throw new Error('Error al procesar el pago');

            const result = await response.json();

            // La API debe devolver: { payment: Payment, invoice: Invoice }
            const { payment, invoice } = result;

            // Notificar al componente padre
            onPaymentComplete(payment, invoice);

            // Mostrar factura generada
            alert(`✅ Pago registrado correctamente.\n\n📄 Factura: ${invoice.invoiceNumber}\n\n${invoice.url ? '↓ Descargando PDF...' : ''}`);

            if (invoice.url) {
                window.open(invoice.url, '_blank');
            }

            onClose();
        } catch (error) {
            console.error('Error al procesar pago:', error);
            alert('❌ Error al procesar el pago. Inténtalo de nuevo.');
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-white max-w-2xl w-full rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500">

                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-700 p-8 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight">Nueva Venta</h2>
                        <p className="text-sm text-slate-300 mt-1">
                            Paciente: <strong>{patient.name}</strong> | Monedero: <strong>{availableWallet}€</strong>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-xl transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 bg-slate-50">
                    <button
                        onClick={() => setActiveTab('DIRECT_CHARGE')}
                        className={`flex-1 py-4 text-sm font-black uppercase tracking-wider transition-all ${activeTab === 'DIRECT_CHARGE'
                                ? 'bg-white text-slate-900 border-b-2 border-slate-900'
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        <CreditCard className="inline mr-2" size={18} />
                        Cobro Directo
                    </button>
                    <button
                        onClick={() => setActiveTab('ADVANCE_PAYMENT')}
                        className={`flex-1 py-4 text-sm font-black uppercase tracking-wider transition-all ${activeTab === 'ADVANCE_PAYMENT'
                                ? 'bg-white text-slate-900 border-b-2 border-slate-900'
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        <Wallet className="inline mr-2" size={18} />
                        Pago a Cuenta
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 space-y-6">

                    {/* Cobro Directo/Presupuesto */}
                    {activeTab === 'DIRECT_CHARGE' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">
                                    Seleccionar Presupuesto
                                </label>
                                <select
                                    value={selectedBudgetId}
                                    onChange={(e) => setSelectedBudgetId(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100"
                                >
                                    <option value="">-- Seleccionar Presupuesto --</option>
                                    {budgets.map(budget => (
                                        <option key={budget.id} value={budget.id}>
                                            Presupuesto #{budget.id.substring(0, 6)} - {budget.total}€ ({budget.status})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Desglose del presupuesto */}
                            {selectedBudget && (
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                    <h4 className="text-xs font-black uppercase text-slate-400 mb-3">Desglose</h4>
                                    <div className="space-y-2">
                                        {selectedBudget.items.map((item, idx) => (
                                            <div key={idx} className="flex justify-between text-sm">
                                                <span className="font-medium text-slate-600">{item.name}</span>
                                                <span className="font-black text-slate-900">{item.price}€</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="border-t border-slate-300 mt-3 pt-3 flex justify-between">
                                        <span className="text-sm font-black uppercase text-slate-900">Total</span>
                                        <span className="text-xl font-black text-slate-900">{selectedBudget.total}€</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Pago a Cuenta */}
                    {activeTab === 'ADVANCE_PAYMENT' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                            <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-700 font-bold flex gap-2 items-start">
                                <DollarSign size={20} className="flex-shrink-0 mt-0.5" />
                                <div>
                                    <strong>Pago Adelantado:</strong> El importe se añadirá al monedero virtual del paciente
                                    y podrá usarse como forma de pago en futuras transacciones.
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">
                                    Importe a Pagar
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={advanceAmount}
                                        onChange={(e) => setAdvanceAmount(e.target.value)}
                                        placeholder="Ej: 5000"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-lg font-bold outline-none focus:ring-2 focus:ring-blue-100 pr-12"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">€</span>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">
                                    Notas (Opcional)
                                </label>
                                <input
                                    type="text"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Ej: Anticipo para ortodoncia"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100"
                                />
                            </div>
                        </div>
                    )}

                    {/* Método de Pago */}
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 mb-3 block">
                            Método de Pago
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                onClick={() => setPaymentMethod('cash')}
                                className={`p-4 rounded-xl border-2 text-sm font-black uppercase transition-all ${paymentMethod === 'cash'
                                        ? 'bg-slate-900 text-white border-slate-900'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                                    }`}
                            >
                                <DollarSign className="inline mb-1" size={20} />
                                <br />Efectivo
                            </button>
                            <button
                                onClick={() => setPaymentMethod('card')}
                                className={`p-4 rounded-xl border-2 text-sm font-black uppercase transition-all ${paymentMethod === 'card'
                                        ? 'bg-slate-900 text-white border-slate-900'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                                    }`}
                            >
                                <CreditCard className="inline mb-1" size={20} />
                                <br />Tarjeta
                            </button>
                            <button
                                onClick={() => setPaymentMethod('wallet')}
                                disabled={!canUseWallet}
                                className={`p-4 rounded-xl border-2 text-sm font-black uppercase transition-all ${paymentMethod === 'wallet'
                                        ? 'bg-purple-600 text-white border-purple-600'
                                        : canUseWallet
                                            ? 'bg-white text-slate-600 border-slate-200 hover:border-purple-400'
                                            : 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed'
                                    }`}
                            >
                                <Wallet className="inline mb-1" size={20} />
                                <br />Monedero
                                <div className="text-[10px] mt-1">{availableWallet}€</div>
                            </button>
                        </div>
                    </div>

                    {/* Resumen */}
                    <div className="bg-gradient-to-r from-slate-900 to-slate-700 rounded-2xl p-6 text-white">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-bold uppercase tracking-wider">Total a Pagar</span>
                            <span className="text-3xl font-black">{totalToPay.toFixed(2)}€</span>
                        </div>
                        {paymentMethod === 'wallet' && (
                            <div className="text-xs text-white/70 mt-2">
                                Saldo restante: {(availableWallet - totalToPay).toFixed(2)}€
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 pt-0 flex gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 py-4 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isProcessing || (activeTab === 'DIRECT_CHARGE' && !selectedBudgetId) || (activeTab === 'ADVANCE_PAYMENT' && !advanceAmount)}
                        className="flex-1 bg-slate-900 text-white py-4 rounded-xl text-sm font-black uppercase shadow-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isProcessing ? (
                            <>⏳ Procesando...</>
                        ) : (
                            <>
                                <Check size={20} />
                                {activeTab === 'ADVANCE_PAYMENT' ? 'Registrar Pago a Cuenta' : 'Pagar y Facturar'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;
