import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User, CreditCard, FileText } from 'lucide-react';
import { Appointment, Patient, Budget, Payment } from '../../types';
import { SimplifiedOdontogram } from '../components/SimplifiedOdontogram';
import { PaymentModal } from '../components/PaymentModal';
import { useAppContext } from '../context/AppContext';

export const AppointmentDetails: React.FC = () => {
    const { appointmentId } = useParams<{ appointmentId: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const { patients, api } = useAppContext();

    const [appointment, setAppointment] = useState<Appointment | null>(null);
    const [patient, setPatient] = useState<Patient | null>(null);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [activeTab, setActiveTab] = useState('odontogram');
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    // Cargar datos desde location.state o API
    useEffect(() => {
        if (location.state?.appointment && location.state?.patient) {
            setAppointment(location.state.appointment);
            setPatient(location.state.patient);
        } else if (appointmentId) {
            // Cargar desde API
            loadAppointmentData(appointmentId);
        }
    }, [appointmentId, location.state]);

    // Cargar presupuestos del paciente
    useEffect(() => {
        if (patient) {
            api.budget.getByPatient(patient.id)
                .then(setBudgets)
                .catch(err => console.error('Error loading budgets:', err));
        }
    }, [patient]);

    const loadAppointmentData = async (id: string) => {
        try {
            // TODO: Implementar API para cargar cita por ID
            const appointmentData = await api.appointments.getById(id);
            setAppointment(appointmentData);

            const patientData = patients.find(p => p.id === appointmentData.patientId);
            setPatient(patientData || null);
        } catch (error) {
            console.error('Error loading appointment:', error);
            alert('Error al cargar la cita');
            navigate('/agenda');
        }
    };

    const handlePaymentComplete = (payment: Payment, invoice: any) => {
        console.log('Payment completed:', payment);
        console.log('Invoice generated:', invoice);

        // Actualizar monedero del paciente si es pago a cuenta
        if (payment.type === 'ADVANCE_PAYMENT' && patient) {
            const updatedPatient = {
                ...patient,
                wallet: (patient.wallet || 0) + payment.amount
            };
            setPatient(updatedPatient);
        }

        // Recargar presupuestos si es necesario
        if (patient) {
            api.budget.getByPatient(patient.id).then(setBudgets);
        }
    };

    if (!appointment || !patient) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/agenda')}
                            className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                                Gestión de Cita
                            </h1>
                            <p className="text-sm text-slate-500 font-medium mt-1">
                                {new Date(appointment.date).toLocaleDateString('es-ES')} - {appointment.time}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsPaymentModalOpen(true)}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-4 rounded-2xl text-sm font-black uppercase shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                    >
                        <CreditCard size={20} />
                        Cobrar / Pagar
                    </button>
                </div>

                {/* Patient Info Card */}
                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm">
                    <div className="flex items-start gap-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-lg">
                            {patient.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                            <h2 className="text-2xl font-black text-slate-900">{patient.name}</h2>
                            <div className="grid grid-cols-3 gap-4 mt-4">
                                <div>
                                    <p className="text-xs font-black uppercase text-slate-400">DNI</p>
                                    <p className="text-sm font-bold text-slate-900 mt-1">{patient.dni}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase text-slate-400">Email</p>
                                    <p className="text-sm font-bold text-slate-900 mt-1">{patient.email}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-black uppercase text-slate-400">Monedero</p>
                                    <p className="text-sm font-black text-green-600 mt-1">{patient.wallet || 0}€</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                    <div className="flex border-b border-slate-200 p-2 bg-slate-50">
                        {['odontogram', 'treatments', 'documents'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === tab
                                    ? 'bg-slate-900 text-white shadow-lg'
                                    : 'text-slate-400 hover:bg-white hover:text-slate-900'
                                    }`}
                            >
                                {tab === 'odontogram' ? '🦷 Odontograma' :
                                    tab === 'treatments' ? '📋 Tratamientos' :
                                        '📄 Documentos'}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="p-8 min-h-[600px]">
                        {activeTab === 'odontogram' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4">
                                <SimplifiedOdontogram
                                    patientId={patient.id}
                                    isEditable={true}
                                    onTreatmentsChange={(treatments) => {
                                        console.log('Treatments updated:', treatments);
                                    }}
                                />
                            </div>
                        )}

                        {activeTab === 'treatments' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4">
                                <h3 className="text-2xl font-black text-slate-900 mb-6">Plan de Tratamiento</h3>
                                <div className="bg-slate-50 rounded-2xl p-6 text-center text-slate-400">
                                    <FileText size={48} className="mx-auto mb-4 opacity-50" />
                                    <p className="font-bold">Los tratamientos se gestionan desde el Odontograma</p>
                                    <p className="text-sm mt-2">Ve a la pestaña de Odontograma para añadir tratamientos</p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'documents' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4">
                                <h3 className="text-2xl font-black text-slate-900 mb-6">Documentos</h3>
                                <div className="bg-slate-50 rounded-2xl p-6 text-center text-slate-400">
                                    <FileText size={48} className="mx-auto mb-4 opacity-50" />
                                    <p className="font-bold">Próximamente: Consentimientos, recetas, etc.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                patient={patient}
                budgets={budgets}
                onPaymentComplete={handlePaymentComplete}
            />
        </div>
    );
};

export default AppointmentDetails;
