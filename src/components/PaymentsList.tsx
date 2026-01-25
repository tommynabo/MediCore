import React, { useEffect, useState } from 'react';
import { CreditCard, Download, Mail, QrCode, FileText as FileTextIcon } from 'lucide-react';
import { api } from '../services/api';

interface PaymentsListProps {
    patientId: string;
}

export const PaymentsList: React.FC<PaymentsListProps> = ({ patientId }) => {
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.payments.getByPatient(patientId)
            .then(setPayments)
            .catch(err => console.error("Error fetching payments:", err))
            .finally(() => setLoading(false));
    }, [patientId]);

    if (loading) return <div className="text-center p-4 text-xs text-slate-400">Cargando pagos...</div>;

    if (payments.length === 0) {
        return <p className="text-xs text-slate-500 font-bold opacity-50 p-4">No hay pagos registrados.</p>;
    }

    return (
        <div className="space-y-2">
            {payments.map(pay => (
                <div key={pay.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-xl">
                    <div>
                        <p className="text-sm font-black text-slate-900">
                            {pay.method === 'cash' ? 'Efectivo' : pay.method === 'card' ? 'Tarjeta' : 'Transferencia'}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400">
                            {new Date(pay.createdAt).toLocaleDateString()} - {pay.type === 'ADVANCE_PAYMENT' ? 'Anticipo' : 'Pago Factura'}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <p className={`text-sm font-black ${pay.type === 'ADVANCE_PAYMENT' ? 'text-emerald-600' : 'text-slate-900'}`}>
                            {pay.type === 'ADVANCE_PAYMENT' ? '+' : ''}{pay.amount}€
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
};
