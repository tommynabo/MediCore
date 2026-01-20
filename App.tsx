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

const App: React.FC = () => {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="agenda" element={<Agenda />} />
            <Route path="pacientes" element={<Patients />} />
            <Route path="billing" element={<Billing />} />
            <Route path="inventory" element={<Settings />} /> {/* User said inventory is in settings, but Layout links to /inventory. Let's make inventory route go to Stock component or Redirect? Actually Layout has Settings AND Inventory. User said "remove from left panel". I removed it from Layout. So /inventory link is gone. But just in case. */}
            {/* Wait, I commented out Stock in Layout, but user said "ya lo has puesto en configuración". So likely Inventory link SHOULD BE REMOVED.
                However, I should check if I missed any mismatch. 
                Layout: /pacientes, /billing, /payroll, /settings. 
                App: patients, billing, stock, payroll, settings.
                So 'patients' -> 'pacientes'. 'stock' -> remove? OR keep for direct access? 
                Let's rename 'patients' to 'pacientes'. 
            */}
            <Route path="stock" element={<Stock />} />
            <Route path="ai" element={<AI />} />
            <Route path="payroll" element={<Payroll />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
};

export default App;
