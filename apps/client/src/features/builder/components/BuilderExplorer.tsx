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
      <div className="flex h-full items-center justify-center font-mono text-sm text-[#a0a0a0]">
        Loading workspace...
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#0a0a0a]">
      {/* Explorer Header */}
      <div className="relative flex flex-col mt-2 px-2 mb-2">
        {/* Top dotted line */}
        <div className="w-full border-t border-dotted border-[#444] relative">
          {/* Top right decoration overlaid */}
          <div className="absolute -top-[6px] right-0 bg-[#0a0a0a] pl-2 text-[9px] font-mono text-[#555] tracking-[0.2em] text-right leading-none select-none flex flex-col items-end">
            <div>. . . - - - - - - ]</div>
            <div className="pr-1 mt-[2px]">- - - - - -</div>
          </div>
        </div>

        <div className="flex items-center justify-between px-2 py-3">
          <h2 className="text-[13px] font-mono font-bold uppercase tracking-widest text-[#f5f5f5]">
            EXPLORER
          </h2>
          <button className="text-[#a0a0a0] hover:text-[#f5f5f5] transition-colors" title="Refresh">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <rect x="5" y="3" width="6" height="2" />
              <rect x="3" y="5" width="2" height="6" />
              <rect x="5" y="11" width="6" height="2" />
              <rect x="11" y="4" width="2" height="2" />
              <rect x="9" y="6" width="2" height="2" />
              <rect x="11" y="8" width="2" height="2" />
            </svg>
          </button>
        </div>

        {/* Bottom dotted line */}
        <div className="w-full border-b border-dotted border-[#444]" />
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <FileTree
          nodes={workspaceTree}
        />
      </div>

      {/* Footer Logo Area */}
      <div className="p-4 border-t border-dashed border-[#444] relative overflow-hidden flex items-center justify-center mt-auto">
        {/* Corner Decors */}
        <div className="absolute top-2 left-2 flex items-start space-x-1">
          <div className="w-2 h-2 border-t border-l border-[#555]" />
        </div>
        <div className="absolute top-2 right-2 flex items-start space-x-1">
          <div className="w-2 h-2 border-t border-r border-[#555]" />
        </div>
        <div className="absolute bottom-2 left-2 flex items-start space-x-1">
          <div className="w-2 h-2 border-b border-l border-[#555]" />
        </div>
        <div className="absolute bottom-2 right-2 flex items-start space-x-1">
          <div className="w-2 h-2 border-b border-r border-[#555]" />
        </div>

        <div className="flex items-center space-x-3 opacity-70 hover:opacity-100 transition-opacity cursor-pointer">
          <div className="w-8 h-8 relative flex-shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <circle cx="120" cy="120" r="100" stroke="#F5F5F5" strokeWidth="12" />
              <circle cx="120" cy="120" r="65" stroke="#F5F5F5" strokeWidth="12" />
              <circle cx="120" cy="120" r="30" stroke="#F5F5F5" strokeWidth="12" />
            </svg>
          </div>
          <span className="font-mono text-lg font-bold text-[#f5f5f5] tracking-widest">RendrAI</span>
        </div>
      </div>
    </div>
  );
};

export default BuilderExplorer;