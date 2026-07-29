import { useWorkspaceStore } from "@/features/builder/store/workspace.store";
import type { FileNode } from "@/features/builder/types/fileTree";

interface FileTreeNodeProps {
  node: FileNode;
}

const FileTreeNode = ({
  node,
}: FileTreeNodeProps) => {
  const selectedFile =
    useWorkspaceStore(
      (state) =>
        state.selectedFile,
    );

  const openFile =
    useWorkspaceStore(
      (state) => state.openFile,
    );

  const handleClick = () => {
    if (node.type === "file") {
      void openFile(node.path);
    }
  };

  const isSelected =
    selectedFile === node.path;

  return (
    <div className="ml-2">
      <div
        onClick={handleClick}
        className={`cursor-pointer rounded px-2 py-1 text-sm transition-colors ${
          isSelected
            ? "bg-neutral-700 text-white"
            : "text-neutral-200 hover:bg-neutral-800"
        }`}
      >
        {node.type === "folder"
          ? "📁"
          : "📄"}{" "}
        {node.name}
      </div>

      {node.type === "folder" &&
        node.children && (
          <div className="ml-4 border-l border-neutral-800 pl-2">
            {node.children.map(
              (child) => (
                <FileTreeNode
                  key={child.path}
                  node={child}
                />
              ),
            )}
          </div>
        )}
    </div>
  );
};

export default FileTreeNode;