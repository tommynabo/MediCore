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

const App: React.FC = () => {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="agenda" element={<Agenda />} />
            <Route path="patients" element={<Patients />} />
            <Route path="billing" element={<Billing />} />
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
