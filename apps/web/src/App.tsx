import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { ImportSyllabusPage } from './pages/ImportSyllabusPage';
import { ReviewTasksPage } from './pages/ReviewTasksPage';
import { SchedulePage } from './pages/SchedulePage';
import { FocusPage } from './pages/FocusPage';
import { CoursesPage } from './pages/CoursesPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Protected Application Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/courses" element={<CoursesPage />} />
              <Route path="/courses/:courseId" element={<ReviewTasksPage />} />
              <Route path="/courses/:courseId/review" element={<ReviewTasksPage />} />
              <Route path="/import" element={<ImportSyllabusPage />} />
              <Route path="/import/:syllabusId" element={<ImportSyllabusPage />} />
              <Route path="/review" element={<ReviewTasksPage />} />
              <Route path="/schedule" element={<SchedulePage />} />
              <Route path="/schedule/:scheduleId" element={<SchedulePage />} />
              <Route path="/focus" element={<FocusPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

