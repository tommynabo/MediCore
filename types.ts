
export enum Specialization {
  GENERAL = 'General',
  DENTIST = 'Odontología'
}

export interface Patient {
  id: string;
  name: string;
  dni: string;
  birthDate: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  country?: string;
  sex?: 'Masculino' | 'Femenino';
  profession?: string;
  referredBy?: string;
  hasChildren?: boolean;
  notes?: string;
  alerts?: string[];
  insurance?: string; // Mutua: 'Privado', 'Sanitas', 'Adeslas'
  assignedDoctorId?: string;
  prescriptions?: string[];
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: 'Comision' | 'Material' | 'General';
  receiver?: string;
  url?: string;
}

export interface ToothState {
  id: number;
  status: 'HEALTHY' | 'CARIES' | 'CROWN' | 'EXTRACTED' | 'FILLING' | 'ENDODONTICS' | 'IMPLANT' | 'BRIDGE';
  surfaces?: string[];
}

export interface ClinicalRecord {
  id: string;
  patientId: string;
  specialization: Specialization;
  date: string;
  clinicalData: {
    treatment: string;
    observation: string;
    odontogram?: ToothState[];
    signatureUrl?: string;
  };
  isEncrypted: boolean;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  insurancePrice?: Record<string, number>; // Precios por mutua
}

export interface Budget {
  id: string;
  patientId: string;
  date: string;
  items: { serviceId: string; name: string; price: number }[];
  status: 'pending' | 'accepted' | 'rejected';
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  patientId: string;
  amount: number;
  tax: number;
  date: string;
  status: 'draft' | 'issued' | 'rectified';
  paymentMethod: 'cash' | 'card';
  chainHash?: string;
  qrUrl?: string;
  url?: string; // Direct PDF Link
  items: { serviceId: string; name: string; price: number }[];
  isRectificative?: boolean;
  rectifiesId?: string;
}

export interface AIChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialization: Specialization;
  commission: number; // Ej: 0.40 para 40%
  availability: Record<number, { morning: boolean; afternoon: boolean }>;
}

export interface Appointment {
  id: string;
  doctorId: string;
  patientId: string;
  date: string;
  dayIdx: number; // Nuevo campo para diferenciar días en la vista semanal
  time: string;
  treatment?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'Consumible' | 'Instrumental' | 'Maquinaria';
  quantity: number;
  minStock: number;
  unit: string;
}

export interface CashClosing {
  id: string;
  date: string;
  systemCash: number;
  systemCard: number;
  actualCash: number;
  actualCard: number;
  difference: number;
}

export type CalendarView = 'day' | 'week' | 'month';

// --- NEW MODULE TYPES ---

export interface Liquidation {
  id: string;
  doctorId: string;
  doctorName?: string;
  appointmentId: string;
  grossAmount: number;
  labCost: number;
  commissionRate: number;
  finalAmount: number;
  status: 'PENDING' | 'PAID';
  date: string;
}

export interface Installment {
  id: string;
  dueDate: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  description: string;
}

export interface TreatmentPlan {
  id: string;
  name: string;
  totalCost: number;
  duration: number; // months
  startDate: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  installments: Installment[];
}

export interface DocumentTemplate {
  id: string;
  title: string;
  category: string;
  date: string;
  size: string;
  type: 'docx' | 'pdf';
}
