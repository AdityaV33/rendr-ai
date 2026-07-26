import { useNavigate } from "react-router-dom";

import { useAuthStore } from "@/features/auth/store/auth.store";

interface DashboardHeaderProps {
  onCreateProject: () => void;
}

const DashboardHeader = ({
  onCreateProject,
}: DashboardHeaderProps) => {
  const navigate = useNavigate();

  const logout = useAuthStore((state) => state.logout);

  const handleLogout = async () => {
    await logout();

    navigate("/login", {
      replace: true,
    });
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-neutral-800 px-6">
      <div>
        <h1 className="text-2xl font-bold">
          RendrAI
        </h1>

        <p className="text-sm text-neutral-400">
          AI Frontend Application Builder
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onCreateProject}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-neutral-200"
        >
          Create Project
        </button>

        <button
          onClick={handleLogout}
          className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-medium transition hover:bg-neutral-800"
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default DashboardHeader;