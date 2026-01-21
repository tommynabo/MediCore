import React, { useState, useMemo } from 'react';
import {
    ChevronLeft, ChevronRight, Search, Plus, Calendar, User, Clock, CheckCircle2
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { DENTAL_SERVICES } from '../constants';
import { Appointment, Doctor } from '../../types';

// Temporary constant move (should be in a constants file)
const TIME_SLOTS = ["09:00", "10:00", "11:00", "12:00", "13:00", "16:00", "17:00", "18:00"];

const Agenda: React.FC = () => {
    const {
        appointments, addAppointment, patients, currentUser, currentUserRole, api
    } = useAppContext();

    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');
    const [selectedDoctorId, setSelectedDoctorId] = useState<string>('all');

    const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
    const [activeSlot, setActiveSlot] = useState<{ time: string, dayIdx: number } | null>(null);

    // Search States
    const [apptSearch, setApptSearch] = useState('');
    const [bookingTreatment, setBookingTreatment] = useState('');
    const [apptTreatmentSearch, setApptTreatmentSearch] = useState('');

    // Helpers
    const getWeekRange = (d: Date) => {
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const start = new Date(d);
        start.setDate(diff);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
    };

    const getDayName = (date: Date, offset: number) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1) + offset;
        d.setDate(diff);
        return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
    };

    const handlePrev = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'daily') newDate.setDate(newDate.getDate() - 1);
        else newDate.setDate(newDate.getDate() - 7);
        setCurrentDate(newDate);
    };

    const handleNext = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'daily') newDate.setDate(newDate.getDate() + 1);
        else newDate.setDate(newDate.getDate() + 7);
        setCurrentDate(newDate);
    };

    const filteredAppointments = useMemo(() => {
        return appointments.filter(a => {
            // Filter by Doctor if not 'all'
            if (selectedDoctorId !== 'all' && a.doctorId !== selectedDoctorId) return false;
            return true;
        });
    }, [appointments, selectedDoctorId]);

    // Handle Booking
    const handleBooking = async () => {
        if (!activeSlot || !apptSearch) return;

        // Find Patient
        const patient = patients.find(p => p.name.toLowerCase() === apptSearch.toLowerCase());
        if (!patient) {
            alert("Paciente no encontrado. Cree la ficha primero.");
            return;
        }

        // Calculate Date
        let dateToSave = currentDate;
        if (viewMode === 'weekly') {
            const currentDay = currentDate.getDay(); // 0-6
            const diff = currentDate.getDate() - currentDay + (currentDay === 0 ? -6 : 1) + activeSlot.dayIdx;
            dateToSave = new Date(currentDate); // Copy
            dateToSave.setDate(diff);
        }

        const newAppt: any = {
            id: crypto.randomUUID(),
            doctorId: selectedDoctorId === 'all' ? 'dr-1' : selectedDoctorId, // Default to dr-1 if all
            patientId: patient.id,
            date: dateToSave.toISOString().split('T')[0],
            time: activeSlot.time,
            treatment: bookingTreatment || 'Consulta General',
            status: 'PENDING'
        };

        try {
            await api.appointments.create(newAppt);
            addAppointment(newAppt);
            setIsAppointmentModalOpen(false);
            setActiveSlot(null);
            setApptSearch('');
            setBookingTreatment('');
            alert("✅ Cita guardada correctamente.");
        } catch (e) {
            console.error(e);
            alert("Error al guardar la cita.");
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col xl:flex-row justify-between items-end xl:items-center gap-4 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Agenda Médica</h2>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
                        {viewMode === 'daily' ? currentDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : getWeekRange(currentDate)}
                    </p>
                </div>

                <div className="flex gap-4 items-center flex-wrap justify-end">
                    {/* FILTERS REMOVED AS REQUESTED */}

                    {/* DOCTOR SELECTOR (ADMIN ONLY) */}
                    {(currentUserRole === 'ADMIN' || currentUserRole === 'RECEPTION') && (
                        <div className="bg-slate-50 p-1 rounded-xl border border-slate-200">
                            <select
                                value={selectedDoctorId}
                                onChange={(e) => setSelectedDoctorId(e.target.value)}
                                className="bg-transparent text-xs font-bold uppercase text-slate-600 outline-none px-2 py-2 cursor-pointer"
                            >
                                <option value="all">Vista General (Todos)</option>
                                <option value="dr-1">Dr. Martin (General)</option>
                                <option value="dr-2">Dra. Garcia (Orto)</option>
                                <option value="dr-3">Dr. Fernandez (Implantes)</option>
                            </select>
                        </div>
                    )}

                    <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-200">
                        <div className="flex bg-white rounded-xl shadow-sm p-1">
                            <button onClick={() => setViewMode('daily')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${viewMode === 'daily' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900'}`}>Día</button>
                            <button onClick={() => setViewMode('weekly')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${viewMode === 'weekly' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900'}`}>Semana</button>
                        </div>
                    </div>
                    <div className="flex gap-2 items-center">
                        <button onClick={handlePrev} className="p-3 bg-white rounded-xl text-slate-400 hover:text-blue-600 hover:shadow-lg transition-all border border-slate-200"><ChevronLeft size={18} /></button>
                        <button onClick={() => setCurrentDate(new Date())} className="px-6 py-3 bg-white rounded-xl text-slate-900 font-black text-xs uppercase hover:shadow-md transition-all border border-slate-200 min-w-[120px]">
                            {viewMode === 'daily' ? currentDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : getWeekRange(currentDate)}
                        </button>
                        <button onClick={handleNext} className="p-3 bg-white rounded-xl text-slate-400 hover:text-blue-600 hover:shadow-lg transition-all border border-slate-200"><ChevronRight size={18} /></button>
                    </div>
                </div>
            </div>

            {/* CALENDAR GRID */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative">
                <div className="overflow-x-auto pb-4">
                    <div className="min-w-[1000px]">
                        {/* Header Row */}
                        <div className={`grid gap-4 mb-6 ${viewMode === 'daily' && selectedDoctorId === 'all' && (currentUserRole === 'ADMIN' || currentUserRole === 'RECEPTION') ? 'grid-cols-10' : 'grid-cols-8'}`}>
                            <div className="col-span-1 text-[10px] font-black uppercase text-slate-300 tracking-widest text-center self-end pb-2">Hora</div>

                            {/* DAY VIEW HEADERS */}
                            {viewMode === 'daily' && (
                                <>
                                    {/* If All Doctors: Show Doctor Columns */}
                                    {selectedDoctorId === 'all' && (currentUserRole === 'ADMIN' || currentUserRole === 'RECEPTION') ? (
                                        <>
                                            <div className="col-span-3 text-center pb-2 border-b-2 border-blue-500"><span className="text-sm font-black text-slate-900 uppercase">Dr. Martin</span></div>
                                            <div className="col-span-3 text-center pb-2 border-b-2 border-purple-500"><span className="text-sm font-black text-slate-900 uppercase">Dra. Garcia</span></div>
                                            <div className="col-span-3 text-center pb-2 border-b-2 border-emerald-500"><span className="text-sm font-black text-slate-900 uppercase">Dr. Fernandez</span></div>
                                        </>
                                    ) : (
                                        <div className="col-span-7 text-center pb-2 border-b-2 border-blue-500">
                                            <span className="text-sm font-black text-slate-900 uppercase">Hoy</span>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* WEEKLY VIEW HEADERS */}
                            {viewMode === 'weekly' && (
                                Array.from({ length: 7 }).map((_, i) => (
                                    <div key={i} className="col-span-1 text-center pb-2 border-b-2 border-slate-100">
                                        <span className="text-xs font-black text-slate-400 uppercase">{getDayName(currentDate, i)}</span>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Time Slots */}
                        {TIME_SLOTS.map((time) => (
                            <div key={time} className={`grid gap-4 mb-4 group ${viewMode === 'daily' && selectedDoctorId === 'all' && (currentUserRole === 'ADMIN' || currentUserRole === 'RECEPTION') ? 'grid-cols-10' : 'grid-cols-8'}`}>
                                <div className="col-span-1 text-right pr-6 py-4">
                                    <span className="text-xs font-black text-slate-400 group-hover:text-blue-500 transition-colors">{time}</span>
                                </div>

                                {/* DAILY VIEW SLOTS */}
                                {viewMode === 'daily' && (
                                    <>
                                        {selectedDoctorId === 'all' && (currentUserRole === 'ADMIN' || currentUserRole === 'RECEPTION') ? (
                                            ['dr-1', 'dr-2', 'dr-3'].map((docId, idx) => (
                                                <div key={docId} className="col-span-3 relative h-24 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-300 transition-all cursor-pointer"
                                                    onClick={() => { setActiveSlot({ time, dayIdx: 0 }); setSelectedDoctorId(docId); setIsAppointmentModalOpen(true); }}
                                                >
                                                    {appointments.filter(a => a.time === time && a.date === currentDate.toISOString().split('T')[0] && a.doctorId === docId).map(a => (
                                                        <div key={a.id} className="absolute inset-2 bg-blue-100 text-blue-700 p-2 rounded-xl text-[10px] font-bold border border-blue-200 overflow-hidden leading-tight">
                                                            {patients.find(p => p.id === a.patientId)?.name || 'Paciente'}
                                                        </div>
                                                    ))}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="col-span-7 relative h-24 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-300 transition-all group-hover:shadow-lg group-hover:shadow-blue-500/5 flex items-center justify-center cursor-pointer"
                                                onClick={() => { setActiveSlot({ time, dayIdx: 0 }); setIsAppointmentModalOpen(true); }}
                                            >
                                                {/* Show existing appointments */}
                                                {filteredAppointments.filter(a => a.time === time && a.date === currentDate.toISOString().split('T')[0]).map(a => (
                                                    <div key={a.id} className="absolute inset-2 bg-blue-100 text-blue-700 p-2 rounded-xl text-xs font-bold border border-blue-200 flex flex-col justify-center">
                                                        <span>{patients.find(p => p.id === a.patientId)?.name || 'Paciente'}</span>
                                                        <span className="text-[10px] opacity-70">
                                                            {typeof a.treatment === 'object' && a.treatment !== null
                                                                ? (a.treatment as any).name || 'Tratamiento'
                                                                : a.treatment || '-'}
                                                        </span>
                                                    </div>
                                                ))}
                                                {/* Empty State Plus */}
                                                {filteredAppointments.filter(a => a.time === time && a.date === currentDate.toISOString().split('T')[0]).length === 0 && (
                                                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2 text-blue-500 font-bold text-xs uppercase tracking-wide">
                                                        <Plus size={16} />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* WEEKLY VIEW SLOTS */}
                                {viewMode === 'weekly' && (
                                    Array.from({ length: 7 }).map((_, i) => {
                                        // Calculate exact date for this cell
                                        const d = new Date(currentDate);
                                        const day = d.getDay();
                                        const diff = d.getDate() - day + (day === 0 ? -6 : 1) + i;
                                        d.setDate(diff);
                                        const dateStr = d.toISOString().split('T')[0];

                                        const cellAppts = filteredAppointments.filter(a => a.time === time && a.date === dateStr);

                                        return (
                                            <div key={i} className="col-span-1 h-24 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 hover:bg-white hover:border-solid hover:border-blue-400 transition-all cursor-pointer relative"
                                                onClick={() => { setActiveSlot({ time, dayIdx: i }); setIsAppointmentModalOpen(true); }}
                                            >
                                                {cellAppts.map(a => (
                                                    <div key={a.id} className="absolute inset-1 bg-blue-100 text-blue-700 p-1 rounded-lg text-[9px] font-bold border border-blue-200 overflow-hidden leading-tight">
                                                        {patients.find(p => p.id === a.patientId)?.name?.split(' ')[0] || 'Pct'}
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* APPOINTMENT MODAL */}
            {isAppointmentModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in">
                    <div className="bg-white max-w-lg w-full rounded-[2rem] p-8 shadow-2xl space-y-6">
                        <h3 className="text-2xl font-black text-slate-900">Nueva Cita</h3>
                        <p className="text-sm text-slate-500">
                            {activeSlot?.time} - {viewMode === 'daily' ? currentDate.toLocaleDateString() : 'Día ' + activeSlot?.dayIdx}
                        </p>

                        {/* Patient Search in Modal */}
                        <div>
                            <label className="text-xs font-bold uppercase text-slate-400">Paciente</label>
                            <input
                                className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 mt-2 outline-none font-bold"
                                placeholder="Buscar paciente (Nombre)"
                                value={apptSearch}
                                onChange={(e) => setApptSearch(e.target.value)}
                            />
                            {/* Suggestions */}
                            {apptSearch.length > 0 && (
                                <div className="mt-2 bg-white border border-slate-100 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                                    {patients
                                        .filter(p => p.name.toLowerCase().includes(apptSearch.toLowerCase()))
                                        .map(p => (
                                            <div
                                                key={p.id}
                                                onClick={() => setApptSearch(p.name)}
                                                className="p-3 hover:bg-slate-50 cursor-pointer text-xs font-bold text-slate-600 border-b border-slate-50 last:border-0"
                                            >
                                                {p.name}
                                            </div>
                                        ))
                                    }
                                </div>
                            )}
                        </div>

                        {/* Treatment Selection */}
                        <div>
                            <label className="text-xs font-bold uppercase text-slate-400">Tratamiento</label>
                            <select
                                className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 mt-2 outline-none font-bold text-slate-600"
                                value={bookingTreatment}
                                onChange={(e) => setBookingTreatment(e.target.value)}
                            >
                                <option value="">Seleccionar Tratamiento...</option>
                                {Object.values(DENTAL_SERVICES).flat().map((t, i) => (
                                    <option key={i} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <button onClick={() => setIsAppointmentModalOpen(false)} className="flex-1 py-3 font-bold text-slate-500">Cancelar</button>
                            <button onClick={handleBooking} className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold uppercase shadow-lg">Confirmar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Agenda;
