import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Simulation from "@/pages/Simulation";
import EnergyBalance from "@/pages/EnergyBalance";
import Scenarios from "@/pages/Scenarios";
import Forecasts from "@/pages/Forecasts";
import Maintenance from "@/pages/Maintenance";
import Outage from "@/pages/Outage";
import Settings from "@/pages/Settings";
import Login from "@/pages/Login";
import Register from "@/pages/Register";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/simulation" element={<Simulation />} />
          <Route path="/energy-balance" element={<EnergyBalance />} />
          <Route path="/scenarios" element={<Scenarios />} />
          <Route path="/forecasts" element={<Forecasts />} />
          <Route path="/maintenance" element={<Maintenance />} />
          <Route path="/outage" element={<Outage />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
