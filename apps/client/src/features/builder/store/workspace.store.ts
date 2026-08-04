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
}

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

            set({
              workspaceTree: tree,
              loadingWorkspace: false,
            });
          } catch (error) {
            let message =
              "Failed to load workspace.";

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
              error: message,
              loadingWorkspace: false,
            });
          }
        },

      openFile: async (
        filePath,
      ) => {
        const projectId =
          get().projectId;

        if (!projectId) {
          return;
        }

        const cached =
          get().openedFiles[
            filePath
          ];

        if (cached) {
          set({
            selectedFile:
              filePath,
          });

          return;
        }

        try {
          set({
            openingFile: true,
            error: null,
          });

          const file =
            await getWorkspaceFile(
              projectId,
              filePath,
            );

          const openedFile: OpenedFile =
            {
              path: file.path,
              content:
                file.content,
              savedContent:
                file.content,
            };

          set((state) => ({
            openedFiles: {
              ...state.openedFiles,
              [filePath]:
                openedFile,
            },
            selectedFile:
              filePath,
            openingFile: false,
          }));
        } catch (error) {
          let message =
            "Failed to open file.";

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
            error: message,
            openingFile: false,
          });
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
    }),
  );