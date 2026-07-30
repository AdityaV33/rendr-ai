import { useNavigate } from "react-router-dom";

import { useAuthStore } from "@/features/auth/store/auth.store";
import { useWorkspaceStore } from "@/features/builder/store/workspace.store";
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

  const savingFile = useWorkspaceStore(
    (state) => state.savingFile,
  );
  const saveSuccess = useWorkspaceStore(
    (state) => state.saveSuccess,
  );
  const saveError = useWorkspaceStore(
    (state) => state.saveError,
  );
  const selectedFile = useWorkspaceStore(
    (state) => state.selectedFile,
  );
  const saveCurrentFile = useWorkspaceStore(
    (state) => state.saveCurrentFile,
  );
  const isFileDirty = useWorkspaceStore(
    (state) => state.isFileDirty,
  );

  const isDirty = selectedFile
    ? isFileDirty(selectedFile)
    : false;

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

  const handleSave = () => {
    void saveCurrentFile();
  };

  const getSaveButtonText = () => {
    if (savingFile) return "Saving...";
    if (saveSuccess) return "Saved ✓";
    if (saveError) return "Save Failed";
    return "Save";
  };

  const getSaveButtonClass = () => {
    const base =
      "rounded-lg px-4 py-2 text-sm font-medium transition-colors";

    if (saveSuccess) {
      return `${base} border border-green-700 bg-green-950/30 text-green-400`;
    }

    if (saveError) {
      return `${base} border border-red-700 bg-red-950/30 text-red-400`;
    }

    if (!isDirty || savingFile) {
      return `${base} border border-neutral-700 bg-neutral-800/50 text-neutral-500 cursor-not-allowed`;
    }

    return `${base} border border-blue-600 bg-blue-600 text-white hover:bg-blue-700`;
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
          type="button"
          onClick={handleSave}
          disabled={
            !isDirty ||
            savingFile ||
            saveSuccess
          }
          className={getSaveButtonClass()}
        >
          {getSaveButtonText()}
        </button>

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