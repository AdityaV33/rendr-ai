import axios from "axios";
import { create } from "zustand";

import {
  generateProject,
  getProject,
} from "@/features/builder/services/builder.service";
import type { Project } from "@/features/builder/types/project";

interface BuilderStore {
  currentProject: Project | null;
  selectedFile: string | null;

  loading: boolean;
  generating: boolean;

  error: string | null;

  loadProject: (projectId: string) => Promise<void>;
  generate: (projectId: string) => Promise<void>;

  selectFile: (file: string |null) => void;
}

export const useBuilderStore = create<BuilderStore>((set) => ({
  currentProject: null,
  selectedFile: null,

  loading: false,
  generating: false,

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

  generate: async (projectId) => {
    try {
      set({
        generating: true,
        error: null,
      });

      const project = await generateProject(projectId);

      set({
        currentProject: project,
        generating: false,
      });
    } catch (error) {
      let message = "Failed to generate project.";

      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message ?? message;
      }

      set({
        error: message,
        generating: false,
      });
    }
  },

  selectFile: (file) => {
    set({
      selectedFile: file,
    });
  },
}));