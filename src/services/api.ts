import { Patient, Appointment, Invoice, ClinicalRecord, InventoryItem } from '../types';

const API_URL = 'http://localhost:3000/api';

const headers = {
    'Content-Type': 'application/json',
    // 'x-user-role': 'DOCTOR' // Default role for now
};

export const api = {
    // Patients
    getPatients: async (): Promise<Patient[]> => {
        const res = await fetch(`${API_URL}/patients`, { headers });
        if (!res.ok) throw new Error('Failed to fetch patients');
        return res.json();
    },
    createPatient: async (patient: Partial<Patient>): Promise<Patient> => {
        const res = await fetch(`${API_URL}/patients`, {
            method: 'POST',
            headers,
            body: JSON.stringify(patient)
        });
        if (!res.ok) throw new Error('Failed to create patient');
        return res.json();
    },

    // Appointments
    appointments: {
        getAll: async (): Promise<Appointment[]> => {
            const res = await fetch(`${API_URL}/appointments`, { headers });
            if (!res.ok) throw new Error('Failed to fetch appointments');
            return res.json();
        },
        create: async (appointment: Partial<Appointment>): Promise<Appointment> => {
            const res = await fetch(`${API_URL}/appointments`, {
                method: 'POST',
                headers,
                body: JSON.stringify(appointment)
            });
            if (!res.ok) throw new Error('Failed to create appointment');
            return res.json();
        }
    },

    // Clinical Records
    clinicalRecords: {
        getByPatient: async (patientId: string): Promise<ClinicalRecord[]> => {
            const res = await fetch(`${API_URL}/patients/${patientId}/clinical-records`, { headers });
            if (!res.ok) throw new Error('Failed to fetch clinical records');
            return res.json();
        },
        create: async (data: { patientId: string, treatment: string, observation: string, specialization: string }): Promise<ClinicalRecord> => {
            const res = await fetch(`${API_URL}/clinical-records`, {
                method: 'POST',
                headers,
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Failed to create clinical record');
            return res.json();
        },
        delete: async (id: string): Promise<void> => {
            const res = await fetch(`${API_URL}/clinical-records/${id}`, { method: 'DELETE', headers });
            if (!res.ok) throw new Error('Failed to delete clinical record');
        }
    },

    // Budgets
    budget: {
        getByPatient: async (patientId: string) => {
            const res = await fetch(`${API_URL}/patients/${patientId}/budgets`, { headers });
            if (!res.ok) throw new Error('Failed to load budgets');
            return res.json();
        },
        create: async (patientId: string, items: any[]) => {
            const res = await fetch(`${API_URL}/patients/${patientId}/budgets`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ items })
            });
            if (!res.ok) throw new Error('Failed to create budget');
            return res.json();
        },
        updateStatus: async (id: string, status: string) => {
            const res = await fetch(`${API_URL}/budgets/${id}/status`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ status })
            });
            if (!res.ok) throw new Error('Failed to update budget status');
            return res.json();
        },
        convert: async (id: string) => {
            const res = await fetch(`${API_URL}/budgets/${id}/convert`, {
                method: 'POST',
                headers
            });
            if (!res.ok) throw new Error('Failed to convert budget');
            return res.json();
        },
        delete: async (id: string) => {
            const res = await fetch(`${API_URL}/budgets/${id}`, { method: 'DELETE', headers });
            if (!res.ok) throw new Error('Failed to delete budget');
        }
    },

    // Invoices
    invoices: {
        getAll: async (): Promise<Invoice[]> => {
            const res = await fetch(`${API_URL}/finance/invoices`, { headers });
            if (!res.ok) throw new Error('Failed to fetch invoices');
            return res.json();
        },
        create: async (invoiceData: any): Promise<Invoice> => {
            const res = await fetch(`${API_URL}/finance/invoice`, {
                method: 'POST',
                headers,
                body: JSON.stringify(invoiceData)
            });
            if (!res.ok) throw new Error('Failed to create invoice');
            return res.json();
        }
    },

    // AI Agent
    ai: {
        query: async (message: string, patientId?: string, context?: any) => {
            const res = await fetch(`${API_URL}/ai/query`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    message,
                    context: { patientId, ...context } // Pass patientId in context for the agent
                })
            });
            if (!res.ok) throw new Error('AI query failed');
            return res.json();
        }
    },

    // Odontogram
    odontogram: {
        get: async (patientId: string) => {
            const res = await fetch(`${API_URL}/patients/${patientId}/odontogram`, { headers });
            if (!res.ok) return { teethState: "{}" };
            return res.json();
        },
        save: async (patientId: string, teethState: any) => {
            const res = await fetch(`${API_URL}/patients/${patientId}/odontogram`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ teethState })
            });
            if (!res.ok) throw new Error('Failed to save odontogram');
            return res.json();
        }
    },

    // Snapshots
    snapshots: {
        save: async (patientId: string, imageUrl: string, description: string) => {
            const res = await fetch(`${API_URL}/patients/${patientId}/snapshots`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ imageUrl, description })
            });
            if (!res.ok) throw new Error('Failed to save snapshot');
            return res.json();
        },
        list: async (patientId: string) => {
            const res = await fetch(`${API_URL}/patients/${patientId}/snapshots`, { headers });
            if (!res.ok) return [];
            return res.json();
        }
    }
};
