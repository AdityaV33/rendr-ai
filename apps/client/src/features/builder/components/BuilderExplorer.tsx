import FileTree from "@/features/builder/components/FileTree";
import { mockFileTree } from "@/features/builder/data/mockFileTree";

const BuilderExplorer = () => {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-neutral-800 px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-300">
          Explorer
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <FileTree nodes={mockFileTree} />
      </div>
    </div>
  );
};

export default BuilderExplorer;