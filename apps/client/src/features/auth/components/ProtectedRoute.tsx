import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuthStore } from "../store/auth.store";

export default function ProtectedRoute() {
  const {
    isAuthenticated,
    isInitializing,
  } = useAuthStore();

  const location = useLocation();

  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location,
        }}
      />
    );
  }

  return <Outlet />;
}