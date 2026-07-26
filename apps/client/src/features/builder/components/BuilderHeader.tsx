import { useNavigate } from "react-router-dom";

import { useAuthStore } from "@/features/auth/store/auth.store";
import type { Project } from "@/features/builder/types/project";

interface BuilderHeaderProps {
  project: Project;
  generating: boolean;
  onGenerate: () => void;
}

const BuilderHeader = ({
  project,
  generating,
  onGenerate,
}: BuilderHeaderProps) => {
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
        <h1 className="text-xl font-semibold">
          {project.name}
        </h1>

        <p className="text-sm text-neutral-400">
          {project.framework} • {project.status}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-medium transition hover:bg-neutral-800"
          onClick={handleLogout}
        >
          Logout
        </button>

        <button
          onClick={onGenerate}
          disabled={generating}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {generating ? "Generating..." : "Generate"}
        </button>
      </div>
    </header>
  );
};

export default BuilderHeader;