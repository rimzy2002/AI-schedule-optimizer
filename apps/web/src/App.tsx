import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ImportSyllabusPage } from './pages/ImportSyllabusPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PlaceholderPage title="Login" />} />
        <Route path="/register" element={<PlaceholderPage title="Register" />} />
        
        {/* Protected Routes (Mocked for now) */}
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/import" element={<ImportSyllabusPage />} />
          <Route path="/review" element={<PlaceholderPage title="Review Courses" />} />
          <Route path="/schedule" element={<PlaceholderPage title="Schedule" />} />
          <Route path="/focus" element={<PlaceholderPage title="Focus Mode" />} />
          <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};
