import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { PreferencesProvider } from "./context/PreferencesContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminGate } from "./components/AdminGate";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { Login } from "./pages/Login";
import { DashboardHome } from "./pages/DashboardHome";
import { AcademicStructurePage } from "./pages/AcademicStructurePage";
import { StudentsListPage } from "./pages/StudentsListPage";
import { StudentFormPage } from "./pages/StudentFormPage";
import { StudentDetailPage } from "./pages/StudentDetailPage";
import { AttendancePage } from "./pages/AttendancePage";
import { FeesPage } from "./pages/FeesPage";
import { ResultsPage } from "./pages/ResultsPage";
import { DocumentsPage } from "./pages/DocumentsPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { PromotionPage } from "./pages/PromotionPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AdminGate>
                  <PreferencesProvider>
                    <DashboardLayout />
                  </PreferencesProvider>
                </AdminGate>
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardHome />} />
            <Route path="students" element={<StudentsListPage />} />
            <Route path="students/add" element={<StudentFormPage />} />
            <Route path="students/:id/edit" element={<StudentFormPage />} />
            <Route path="students/:id" element={<StudentDetailPage />} />
            <Route path="classes" element={<AcademicStructurePage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="fees" element={<FeesPage />} />
            <Route path="results" element={<ResultsPage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="promotions" element={<PromotionPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
