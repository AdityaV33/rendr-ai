import { useState } from "react";
import { useWorkspaceStore } from "@/features/builder/store/workspace.store";
import type { FileNode } from "@/features/builder/types/fileTree";
import {
  FileIconFolder,
  FileIconDefault,
  FileIconJS,
  FileIconTS,
  FileIconTSX,
  FileIconJSON,
  FileIconHTML,
  FileIconMD,
  FileIconCSS,
} from "@/features/landing/components/PixelIcons";

interface FileTreeNodeProps {
  node: FileNode;
}

const HIDDEN_FOLDERS = ["node_modules", ".git", ".vscode", "dist"];

const getFileIcon = (filename: string) => {
  if (filename.endsWith('.tsx')) return <FileIconTSX size={14} />;
  if (filename.endsWith('.ts')) return <FileIconTS size={14} />;
  if (filename.endsWith('.js') || filename.endsWith('.jsx')) return <FileIconJS size={14} />;
  if (filename.endsWith('.json')) return <FileIconJSON size={14} />;
  if (filename.endsWith('.html')) return <FileIconHTML size={14} />;
  if (filename.endsWith('.md')) return <FileIconMD size={14} />;
  if (filename.endsWith('.css')) return <FileIconCSS size={14} />;
  return <FileIconDefault size={14} />;
};

const ChevronRight = ({ size = 12, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

const ChevronDown = ({ size = 12, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

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

  const isFileDirty =
    useWorkspaceStore(
      (state) => state.isFileDirty,
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

  const isDirty =
    node.type === "file" &&
    isFileDirty(node.path);

  return (
    <div className="ml-1">
      <div
        onClick={handleClick}
        className={`cursor-pointer flex items-center gap-1.5 rounded-lg px-2 py-1.5 font-mono text-[13px] transition-colors select-none ${
          isSelected
            ? "bg-[#2a2a2a] text-[#f5f5f5]"
            : "text-[#a0a0a0] hover:text-[#f5f5f5]"
        }`}
      >
        <span className="flex items-center justify-center w-3 h-3 flex-shrink-0">
          {node.type === "folder" ? (
            isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />
          ) : (
            <span className="w-3 h-3" /> // Empty space for files to align with folder icons
          )}
        </span>
        <span className={`flex-shrink-0 flex items-center justify-center ${isSelected ? 'text-[#f5f5f5]' : 'text-[#a0a0a0]'}`}>
          {node.type === "folder" ? <FileIconFolder size={14} /> : getFileIcon(node.name)}
        </span>
        <span className="truncate ml-1">
          {node.name}
          {isDirty && (
            <span className="ml-1 text-amber-400" title="Unsaved changes">●</span>
          )}
        </span>
      </div>

      {node.type === "folder" &&
        node.children &&
        isExpanded && (
          <div className="ml-2 border-l border-dashed border-[#444] pl-2 mt-0.5 mb-0.5">
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