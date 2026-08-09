import { useNavigate } from "react-router-dom";

import { useAuthStore } from "@/features/auth/store/auth.store";
import { useWorkspaceStore } from "@/features/builder/store/workspace.store";
import type { Project } from "@/features/builder/types/project";
import { dashboardService } from "@/features/dashboard/services/dashboard.service";
import { useState } from "react";
import { toast } from "@/lib/toast";

const DownloadIcon = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

interface BuilderHeaderProps {
  project: Project;
  onDelete?: () => void;
}

const BuilderHeader = ({
  project,
  onDelete,
}: BuilderHeaderProps) => {
  const navigate = useNavigate();
  const [isExporting, setIsExporting] = useState(false);

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

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await dashboardService.exportProject(project.id);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      const safeFilename = project.name.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "project";
      link.setAttribute("download", `${safeFilename}-export.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Success", "Project exported successfully.");
    } catch {
      toast.error("Export Failed", "Unable to export project. Please try again.");
    } finally {
      setIsExporting(false);
    }
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

        {project.status === 'ready' && (
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 rounded-lg border border-[#555] px-4 py-2 text-sm font-medium text-[#a0a0a0] transition hover:bg-[#1a1a1a] hover:text-[#f5f5f5] disabled:opacity-50"
            title="Export Project ZIP"
          >
            {isExporting ? (
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <DownloadIcon size={18} />
            )}
            Export ZIP
          </button>
        )}

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