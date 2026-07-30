import { useState } from "react";
import { useWorkspaceStore } from "@/features/builder/store/workspace.store";
import type { FileNode } from "@/features/builder/types/fileTree";

interface FileTreeNodeProps {
  node: FileNode;
}

const HIDDEN_FOLDERS = ["node_modules", ".git", ".vscode", "dist"];

const FileTreeNode = ({
  node,
}: FileTreeNodeProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const selectedFile =
    useWorkspaceStore(
      (state) =>
        state.selectedFile,
    );

  const openFile =
    useWorkspaceStore(
      (state) => state.openFile,
    );

  if (node.type === "folder" && HIDDEN_FOLDERS.includes(node.name)) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.type === "file") {
      void openFile(node.path);
    } else if (node.type === "folder") {
      setIsExpanded(!isExpanded);
    }
  };

  const isSelected =
    selectedFile === node.path;

  return (
    <div className="ml-1">
      <div
        onClick={handleClick}
        className={`cursor-pointer flex items-center gap-2 rounded px-2 py-1 text-sm transition-colors select-none ${
          isSelected
            ? "bg-neutral-700 text-white"
            : "text-neutral-300 hover:bg-neutral-800"
        }`}
      >
        <span className="text-base flex-shrink-0">
          {node.type === "folder" ? (isExpanded ? "📂" : "📁") : "📄"}
        </span>
        <span className="truncate">{node.name}</span>
      </div>

      {node.type === "folder" &&
        node.children &&
        isExpanded && (
          <div className="ml-3 border-l border-neutral-800 pl-1">
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