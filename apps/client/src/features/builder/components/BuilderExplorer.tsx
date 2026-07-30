import FileTree from "@/features/builder/components/FileTree";
import { useWorkspaceStore } from "@/features/builder/store/workspace.store";

const BuilderExplorer = () => {
  const workspaceTree =
    useWorkspaceStore(
      (state) => state.workspaceTree,
    );

  const loadingWorkspace =
    useWorkspaceStore(
      (state) =>
        state.loadingWorkspace,
    );

  if (loadingWorkspace) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-500">
        Loading workspace...
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-neutral-800 px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-300">
          Explorer
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <FileTree
          nodes={workspaceTree}
        />
      </div>
    </div>
  );
};

export default BuilderExplorer;