import FileTreeNode from "@/features/builder/components/FileTreeNode";
import type { FileNode  } from "@/features/builder/types/fileTree";

interface FileTreeProps {
  nodes: FileNode[];
}

const FileTree = ({ nodes }: FileTreeProps) => {
  return (
    <div className="space-y-1">
      {nodes.map((node) => (
        <FileTreeNode
          key={node.path}
          node={node}
        />
      ))}
    </div>
  );
};

export default FileTree;