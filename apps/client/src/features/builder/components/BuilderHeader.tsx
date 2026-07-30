import { useNavigate } from "react-router-dom";

import { useAuthStore } from "@/features/auth/store/auth.store";
import type { Project } from "@/features/builder/types/project";

interface BuilderHeaderProps {
  project: Project;
  onDelete?: () => void;
}

const BuilderHeader = ({
  project,
  onDelete,
}: BuilderHeaderProps) => {
  const navigate = useNavigate();

  const logout = useAuthStore((state) => state.logout);

  const handleLogout = async () => {
    await logout();

    navigate("/login", {
      replace: true,
    });
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      onDelete?.();
    }
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-neutral-800 px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex h-8 items-center justify-center rounded-lg border border-neutral-700 px-3 text-sm font-medium text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
          title="Back to Dashboard"
        >
          &larr; Back
        </button>

        <div>
          <h1 className="text-xl font-semibold">
            {project.name}
          </h1>

          <p className="text-sm text-neutral-400">
            {project.framework} • {project.status}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleDelete}
          className="flex items-center gap-2 rounded-lg border border-red-900/50 bg-red-950/20 px-4 py-2 text-sm font-medium text-red-500 transition hover:bg-red-900/40"
        >
          Delete Project
        </button>

        <button
          className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-medium transition hover:bg-neutral-800"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default BuilderHeader;