export type FileNodeType = "file" | "folder";

export interface FileNode {
  name: string;
  path: string;
  type: FileNodeType;
  children?: FileNode[];
}