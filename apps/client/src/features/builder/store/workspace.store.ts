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

      error: null,

      setProject: (
        projectId,
      ) => {
        set({
          projectId,
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
        set((state) => ({
          openedFiles: {
            ...state.openedFiles,
            [filePath]: {
              path: filePath,
              content,
            },
          },
        }));
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
          set({
            savingFile: true,
            error: null,
          });

          await updateWorkspaceFile(
            projectId,
            filePath,
            file.content,
          );

          set({
            savingFile: false,
          });
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
            error: message,
            savingFile: false,
          });
        }
      },

      clearWorkspace: () => {
        set({
          projectId: null,
          workspaceTree: [],
          openedFiles: {},
          selectedFile: null,
          error: null,
        });
      },
    }),
  );