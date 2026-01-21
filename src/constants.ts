import { Doctor, Specialization } from '../types';

export const DOCTORS: Doctor[] = [
    { id: 'dr-1', name: 'Dr. Martin', specialization: Specialization.GENERAL, commission: 0.4, availability: { 1: { morning: true, afternoon: true }, 2: { morning: true, afternoon: true }, 3: { morning: true, afternoon: true } } },
    { id: 'dr-2', name: 'Dra. Elena', specialization: Specialization.ORTHODONTICS, commission: 0.35, availability: { 2: { morning: true, afternoon: true } } },
    { id: 'dr-3', name: 'Dr. Fernando', specialization: Specialization.IMPLANTOLOGY, commission: 0.45, availability: { 3: { morning: true, afternoon: true } } },
    { id: 'dr-4', name: 'Dra. Ana', specialization: Specialization.ESTHETICS, commission: 0.4, availability: { 4: { morning: true, afternoon: true } } },
    { id: 'dr-5', name: 'Dr. Carlos', specialization: Specialization.PERIODONTICS, commission: 0.4, availability: { 5: { morning: true, afternoon: true } } }
];

export const DENTAL_SERVICES = [
    { id: 'srv-1', name: 'Limpieza Dental', price: 50, insurancePrice: { 'Sanitas': 0, 'Adeslas': 10 }, specialization: Specialization.GENERAL },
    { id: 'srv-2', name: 'Obturación Simple', price: 60, insurancePrice: { 'Sanitas': 40, 'Adeslas': 45 }, specialization: Specialization.GENERAL },
    { id: 'srv-3', name: 'Endodoncia Unirradicular', price: 120, insurancePrice: { 'Sanitas': 90, 'Adeslas': 100 }, specialization: Specialization.GENERAL }, // Technically ENDO but usually General can do? Or separate? Let's use General for simplicity or add ENDO if type exists
    { id: 'srv-4', name: 'Implante Titanio', price: 1200, specialization: Specialization.IMPLANTOLOGY },
    { id: 'srv-5', name: 'Ortodoncia Brackets (Mensual)', price: 100, specialization: Specialization.ORTHODONTICS },
    { id: 'srv-6', name: 'Invisalign Full', price: 3500, specialization: Specialization.ORTHODONTICS },
    { id: 'srv-7', name: 'Blanqueamiento Zoom', price: 300, specialization: Specialization.ESTHETICS },
    { id: 'srv-8', name: 'Corona Zirconio', price: 350, specialization: Specialization.ESTHETICS }, // Prosthodontics/Esthetics
    { id: 'srv-9', name: 'Extracción Simple', price: 40, specialization: Specialization.GENERAL },
    { id: 'srv-10', name: 'Curetaje por Cuadrante', price: 70, specialization: Specialization.PERIODONTICS }
];
