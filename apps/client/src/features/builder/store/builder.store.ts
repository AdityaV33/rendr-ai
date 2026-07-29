import axios from "axios";
import { create } from "zustand";

import {
  getProject,
  startRuntime as startRuntimeRequest,
  stopRuntime as stopRuntimeRequest,
} from "@/features/builder/services/builder.service";
import type { Project } from "@/features/builder/types/project";
import type { RuntimeState } from "@/features/builder/types/runtime";

interface BuilderStore {
  currentProject: Project | null;
  runtime: RuntimeState | null;

  selectedFile: string | null;

  loading: boolean;
  startingRuntime: boolean;

  error: string | null;

  loadProject: (projectId: string) => Promise<void>;
  startRuntime: (projectId: string) => Promise<void>;
  stopRuntime: (projectId: string) => Promise<void>;

  selectFile: (file: string | null) => void;
}

export const useBuilderStore = create<BuilderStore>((set) => ({
  currentProject: null,
  runtime: null,

  selectedFile: null,

  loading: false,
  startingRuntime: false,

  error: null,

  loadProject: async (projectId) => {
    try {
      set({
        loading: true,
        error: null,
      });

      const project = await getProject(projectId);

      set({
        currentProject: project,
        loading: false,
      });
    } catch (error) {
      let message = "Failed to load project.";

      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message ?? message;
      }

      set({
        error: message,
        loading: false,
      });
    }
  },

  startRuntime: async (projectId) => {
    try {
      set({
        startingRuntime: true,
        error: null,
      });

      const runtime = await startRuntimeRequest(projectId);

      set({
        runtime,
        startingRuntime: false,
      });
    } catch (error) {
      let message = "Failed to start runtime.";

      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message ?? message;
      }

      set({
        error: message,
        startingRuntime: false,
      });
    }
  },

  stopRuntime: async (projectId) => {
    try {
      await stopRuntimeRequest(projectId);

      set({
        runtime: null,
      });
    } catch (error) {
      let message = "Failed to stop runtime.";

      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message ?? message;
      }

      set({
        error: message,
      });
    }
  },

  selectFile: (file) => {
    set({
      selectedFile: file,
    });
  },
}));