import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import LoginPro from "./pages/LoginPro";
import Appointments from "./pages/patient/Appointmentspatient";
import Dashboard from "./pages/patient/Dashboardpatient";
import Documents from "./pages/patient/Documentspatient";
import Login from "./pages/patient/loginpatient";
import Profile from "./pages/patient/Profilepatient";
import Aiassistant from "./pages/docteur/Aiassistant";
import DocteurDashboard from "./pages/docteur/DocteurDashboard";
import Docteuragenda from "./pages/docteur/Docteuragenda";
import PatientFiles from "./pages/docteur/PatientFiles";
import PrescriptionGenerator from "./pages/docteur/PrescriptionGenerator";
import AdminLayout from "./components/layouts/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import DoctorLayout from "./components/layouts/DoctorLayout";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/login-pro" element={<LoginPro />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/appointments" element={<Appointments />} />
                <Route path="/documents" element={<Documents />} />

                {/* Doctor Routes */}
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

                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
