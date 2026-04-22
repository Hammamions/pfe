import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "./components/layouts/AdminLayout";
import DoctorLayout from "./components/layouts/DoctorLayout";
import SousAdminLayout from "./components/layouts/SousAdminLayout";
import LoginPro from "./pages/LoginPro";
import ResetPassword from "./pages/ResetPassword";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminSystemPage from "./pages/admin/AdminSystemPage";
import Aiassistant from "./pages/docteur/Aiassistant";
import DocteurDashboard from "./pages/docteur/DocteurDashboard";
import Docteuragenda from "./pages/docteur/Docteuragenda";
import PatientFiles from "./pages/docteur/PatientFiles";
import PrescriptionGenerator from "./pages/docteur/PrescriptionGenerator";
import SousAdminAppointments from "./pages/sous-admin/SousAdminAppointments";
import SousAdminDashboard from "./pages/sous-admin/SousAdminDashboard";

const getSousAdminPermissions = () => {
    try {
        const user = JSON.parse(sessionStorage.getItem("proUser") || "{}");
        return Array.isArray(user.permissions) ? user.permissions : [];
    } catch {
        return [];
    }
};

const hasSousAdminPermission = (permissionId) => {
    const permissions = getSousAdminPermissions();
    return permissions.length === 0 || permissions.includes(permissionId);
};

function SousAdminDefaultRedirect() {
    if (hasSousAdminPermission("gestion_patients")) {
        return <Navigate to="dashboard" replace />;
    }
    return <Navigate to="/login-pro" replace />;
}

function RequireSousAdminPermission({ permissionId, children }) {
    const allowed = hasSousAdminPermission(permissionId);
    if (!allowed) {
        return <Navigate to="/login-pro" replace />;
    }
    return children;
}

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/login-pro" replace />} />
                <Route path="/login-pro" element={<LoginPro />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                <Route path="/doctor" element={<DoctorLayout />}>
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<DocteurDashboard />} />
                    <Route path="agenda" element={<Docteuragenda />} />
                    <Route path="patients" element={<PatientFiles />} />
                    <Route path="prescriptions" element={<PrescriptionGenerator />} />
                    <Route path="ai-assistant" element={<Aiassistant />} />
                </Route>

                <Route path="/sous-admin" element={<SousAdminLayout />}>
                    <Route index element={<SousAdminDefaultRedirect />} />
                    <Route
                        path="dashboard"
                        element={
                            <RequireSousAdminPermission permissionId="gestion_patients">
                                <SousAdminDashboard />
                            </RequireSousAdminPermission>
                        }
                    />
                    <Route
                        path="appointments"
                        element={
                            <RequireSousAdminPermission permissionId="gestion_patients">
                                <SousAdminAppointments />
                            </RequireSousAdminPermission>
                        }
                    />
                </Route>

                <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="system" element={<AdminSystemPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
