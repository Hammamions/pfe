import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "./components/layouts/AdminLayout";
import DoctorLayout from "./components/layouts/DoctorLayout";
import LoginPro from "./pages/LoginPro";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Aiassistant from "./pages/docteur/Aiassistant";
import DocteurDashboard from "./pages/docteur/DocteurDashboard";
import Docteuragenda from "./pages/docteur/Docteuragenda";
import PatientFiles from "./pages/docteur/PatientFiles";
import PrescriptionGenerator from "./pages/docteur/PrescriptionGenerator";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/login-pro" replace />} />
                <Route path="/login-pro" element={<LoginPro />} />

                <Route path="/doctor" element={<DoctorLayout />}>
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<DocteurDashboard />} />
                    <Route path="agenda" element={<Docteuragenda />} />
                    <Route path="patients" element={<PatientFiles />} />
                    <Route path="prescriptions" element={<PrescriptionGenerator />} />
                    <Route path="ai-assistant" element={<Aiassistant />} />
                </Route>

                <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<AdminDashboard />} />
                </Route>

                <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
