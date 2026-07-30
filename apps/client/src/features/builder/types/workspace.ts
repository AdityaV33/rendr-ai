import type { FileNode } from "./fileTree";

export interface OpenedFile {
  path: string;
  content: string;
  savedContent: string;
}

export interface WorkspaceState {
  projectId: string | null;

  workspaceTree: FileNode[];

  openedFiles: Record<
    string,
    OpenedFile
  >;

  selectedFile: string | null;
}