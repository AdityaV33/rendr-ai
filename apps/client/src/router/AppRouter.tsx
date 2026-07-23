import { Routes, Route, Navigate } from "react-router-dom";

import DashboardPage from "@/features/dashboard/pages/DashboardPage.tsx";
import BuilderPage from "@/features/builder/pages/BuilderPage.tsx";

const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route path="/dashboard" element={<DashboardPage />} />

      <Route
        path="/builder/:projectId"
        element={<BuilderPage />}
      />
    </Routes>
  );
};

export default AppRouter;