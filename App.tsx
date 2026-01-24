import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './src/context/AppContext';
import Layout from './src/layouts/Layout';
import Dashboard from './src/pages/Dashboard';
import Agenda from './src/pages/Agenda';
import Patients from './src/pages/Patients';
import Billing from './src/pages/Billing';
import Stock from './src/pages/Stock';
import AI from './src/pages/AI';
import Payroll from './src/pages/Payroll';
import Settings from './src/pages/Settings';
import Login from './src/pages/Login';

import { AppointmentDetails } from './src/pages/AppointmentDetails';

const App: React.FC = () => {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Root Route is now Login */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />

          {/* Protected Routes wrapped in Layout */}
          <Route element={<Layout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="agenda" element={<Agenda />} />
            <Route path="appointment/:appointmentId" element={<AppointmentDetails />} />
            <Route path="pacientes" element={<Patients />} />
            <Route path="billing" element={<Billing />} />
            <Route path="stock" element={<Stock />} />
            <Route path="ai" element={<AI />} />
            <Route path="payroll" element={<Payroll />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Fallback route - Redirect to root (Login) */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
};

export default App;
