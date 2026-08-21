import axios from "axios";
import { create } from "zustand";

import {
  getWorkspaceFile,
  getWorkspaceTree,
  updateWorkspaceFile,
} from "@/features/builder/services/builder.service";

import type {
  OpenedFile,
  WorkspaceState,
} from "@/features/builder/types/workspace";

interface WorkspaceStore
  extends WorkspaceState {
  loadingWorkspace: boolean;
  openingFile: boolean;
  savingFile: boolean;
  saveSuccess: boolean;
  saveError: string | null;

  error: string | null;

  setProject: (
    projectId: string,
  ) => void;

  loadWorkspaceTree: () => Promise<void>;

  openFile: (
    filePath: string,
  ) => Promise<void>;

  updateOpenedFile: (
    filePath: string,
    content: string,
  ) => void;

  saveFile: (
    filePath: string,
  ) => Promise<void>;

  saveCurrentFile: () => Promise<void>;

  isFileDirty: (
    filePath: string,
  ) => boolean;

  hasUnsavedChanges: () => boolean;

  clearWorkspace: () => void;
  clearOpenedFiles: () => Promise<void>;
  closeFile: (filePath: string) => void;
}

let globalOpenFileToken = 0;

export const useWorkspaceStore =
  create<WorkspaceStore>(
    (set, get) => ({
      projectId: null,

      workspaceTree: [],

      openedFiles: {},

      selectedFile: null,

      loadingWorkspace: false,
      openingFile: false,
      savingFile: false,
      saveSuccess: false,
      saveError: null,

      error: null,

      setProject: (projectId) => {
        set((state) => {
          if (state.projectId === projectId) {
            return { projectId };
          }

          return {
            projectId,
            workspaceTree: [],
            openedFiles: {},
            selectedFile: null,
            error: null,
            saveError: null,
            saveSuccess: false,
          };
        });
      },

      loadWorkspaceTree:
        async () => {
          const projectId =
            get().projectId;

          if (!projectId) {
            return;
          }

          try {
            set({
              loadingWorkspace: true,
              error: null,
            });

            const tree =
              await getWorkspaceTree(
                projectId,
              );

            const allPaths = new Set<string>();
            type TraverseNode = { path: string; children?: TraverseNode[] };
            const traverse = (nodes: TraverseNode[]) => {
              for (const n of nodes) {
                allPaths.add(n.path);
                if (n.children) traverse(n.children);
              }
            };
            traverse(tree);

            const state = get();
            const newOpenedFiles = { ...state.openedFiles };
            let currentSelected = state.selectedFile;
            let filesChanged = false;

            for (const p of Object.keys(newOpenedFiles)) {
              if (!allPaths.has(p)) {
                delete newOpenedFiles[p];
                filesChanged = true;
              }
            }

            if (currentSelected && !allPaths.has(currentSelected)) {
               const remaining = Object.keys(newOpenedFiles);
               currentSelected = remaining.length > 0 ? remaining[0] : null;
               filesChanged = true;
            }

            set({
              workspaceTree: tree,
              loadingWorkspace: false,
              ...(filesChanged ? { openedFiles: newOpenedFiles, selectedFile: currentSelected } : {})
            });
          } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 401) {
              throw error; // Let global interceptor handle it
            }

            let message = "Failed to load workspace.";

            if (axios.isAxiosError(error)) {
              message = error.response?.data?.message ?? message;
            }

            set({
              error: message,
              loadingWorkspace: false,
            });
          }
        },

      openFile: async (filePath) => {
        const currentToken = ++globalOpenFileToken;
        const projectId = get().projectId;
        if (!projectId) return;

        const cached = get().openedFiles[filePath];
        if (cached) {
          if (currentToken === globalOpenFileToken) {
            set({ selectedFile: filePath });
          }
          return;
        }

        try {
          if (currentToken === globalOpenFileToken) {
            set({ openingFile: true, error: null });
          }

          const file = await getWorkspaceFile(projectId, filePath);

          const openedFile: OpenedFile = {
            path: file.path,
            content: file.content,
            savedContent: file.content,
          };

          set((state) => {
            const updates: Partial<WorkspaceStore> = {
              openedFiles: {
                ...state.openedFiles,
                [filePath]: openedFile,
              },
            };
            
            if (currentToken === globalOpenFileToken) {
              updates.selectedFile = filePath;
              updates.openingFile = false;
            }
            
            return updates;
          });
        } catch (error) {
          if (axios.isAxiosError(error) && error.response?.status === 401) {
            throw error;
          }

          if (currentToken === globalOpenFileToken) {
            let message = "Failed to open file.";
            if (axios.isAxiosError(error)) {
              message = error.response?.data?.message ?? message;
            }
            set({ error: message, openingFile: false });
          }
        }
      },

      updateOpenedFile: (
        filePath,
        content,
      ) => {
        set((state) => {
          const existing =
            state.openedFiles[filePath];

          return {
            openedFiles: {
              ...state.openedFiles,
              [filePath]: {
                path: filePath,
                content,
                savedContent:
                  existing?.savedContent ??
                  content,
              },
            },
          };
        });
      },

      saveFile: async (
        filePath,
      ) => {
        const projectId =
          get().projectId;

        if (!projectId) {
          return;
        }

        const file =
          get().openedFiles[
            filePath
          ];

        if (!file) {
          return;
        }

        try {
          console.log(`[Runtime] Client saving file: ${filePath}`);
          set({
            savingFile: true,
            saveError: null,
            saveSuccess: false,
          });

          await updateWorkspaceFile(
            projectId,
            filePath,
            file.content,
          );
          
          console.log(`[Runtime] Client successfully saved file: ${filePath}`);

          set((state) => ({
            savingFile: false,
            saveSuccess: true,
            openedFiles: {
              ...state.openedFiles,
              [filePath]: {
                ...state.openedFiles[
                  filePath
                ],
                savedContent:
                  file.content,
              },
            },
          }));

          // Reset success indicator after 2 seconds
          setTimeout(() => {
            set({ saveSuccess: false });
          }, 2000);
        } catch (error) {
          if (axios.isAxiosError(error) && error.response?.status === 401) {
            throw error;
          }

          let message =
            "Failed to save file.";

          if (
            axios.isAxiosError(
              error,
            )
          ) {
            message =
              error.response?.data
                ?.message ??
              message;
          }

          set({
            saveError: message,
            savingFile: false,
            saveSuccess: false,
          });

          // Reset error after 3 seconds
          setTimeout(() => {
            set({ saveError: null });
          }, 3000);
        }
      },

      saveCurrentFile: async () => {
        const selectedFile =
          get().selectedFile;

        if (!selectedFile) {
          return;
        }

        await get().saveFile(selectedFile);
      },

      isFileDirty: (filePath) => {
        const file =
          get().openedFiles[filePath];

        if (!file) {
          return false;
        }

        return (
          file.content !==
          file.savedContent
        );
      },

      hasUnsavedChanges: () => {
        const openedFiles =
          get().openedFiles;

        return Object.values(
          openedFiles,
        ).some(
          (file) =>
            file.content !==
            file.savedContent,
        );
      },

      clearWorkspace: () => {
        set({
          projectId: null,
          workspaceTree: [],
          openedFiles: {},
          selectedFile: null,
          error: null,
          saveError: null,
          saveSuccess: false,
        });
      },

      clearOpenedFiles: async () => {
        const projectId = get().projectId;
        if (!projectId) return;

        const currentOpenedFiles = get().openedFiles;
        const filePaths = Object.keys(currentOpenedFiles);
        if (filePaths.length === 0) return;

        // Fetch latest content for all currently opened files concurrently
        const results = await Promise.allSettled(
          filePaths.map(path => getWorkspaceFile(projectId, path))
        );

        const newOpenedFiles: Record<string, OpenedFile> = {};
        
        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            const file = result.value;
            newOpenedFiles[file.path] = {
              path: file.path,
              content: file.content,
              savedContent: file.content,
            };
          }
        });

        set((state) => {
          let newSelectedFile = state.selectedFile;
          // If the selected file was deleted (not in newOpenedFiles), pick another
          if (newSelectedFile && !newOpenedFiles[newSelectedFile]) {
            const remainingPaths = Object.keys(newOpenedFiles);
            newSelectedFile = remainingPaths.length > 0 ? remainingPaths[0] : null;
          }

          return {
            openedFiles: newOpenedFiles,
            selectedFile: newSelectedFile,
          };
        });
      },

      closeFile: (filePath) => {
        const state = get();
        const newOpenedFiles = { ...state.openedFiles };
        delete newOpenedFiles[filePath];

        let newSelectedFile = state.selectedFile;
        if (state.selectedFile === filePath) {
          const remainingPaths = Object.keys(newOpenedFiles);
          newSelectedFile = remainingPaths.length > 0 ? remainingPaths[0] : null;
        }

        set({
          openedFiles: newOpenedFiles,
          selectedFile: newSelectedFile,
        });
      },
    }),
  );