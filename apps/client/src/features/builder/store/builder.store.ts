import axios from "axios";
import { create } from "zustand";

import {
  getProject,
  generateProject as generateProjectRequest,
  refineProject as refineProjectRequest,
  undoProject as undoProjectRequest,
  applyProject as applyProjectRequest,
  getRuntimeStatus as getRuntimeStatusRequest,
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
  isApplying: boolean;
  isUndoing: boolean;

  error: string | null;

  loadProject: (projectId: string, silent?: boolean) => Promise<void>;
  loadRuntimeStatus: (projectId: string) => Promise<void>;
  generateProject: (projectId: string) => Promise<void>;
  refineProject: (projectId: string, prompt: string) => Promise<void>;
  undoProject: (projectId: string) => Promise<void>;
  applyProject: (projectId: string) => Promise<void>;
  startRuntime: (projectId: string) => Promise<void>;
  stopRuntime: (projectId: string) => Promise<void>;

  selectFile: (file: string | null) => void;
}

export const useBuilderStore = create<BuilderStore>((set, get) => ({
  currentProject: null,
  runtime: null,

  selectedFile: null,

  loading: false,
  startingRuntime: false,
  isApplying: false,
  isUndoing: false,

  error: null,

  loadProject: async (projectId, silent = false) => {
    try {
      const state = get();
      if (state.currentProject?.id !== projectId) {
        set({
          currentProject: null,
          runtime: null,
          selectedFile: null,
        });
      }

      if (!silent) {
        set({
          loading: true,
          error: null,
        });
      }

      const project = await getProject(projectId);

      const currentState = get();
      const isCurrentlyActive = currentState.currentProject && ["generating", "building", "repairing", "refining"].includes(currentState.currentProject.status);
      const isNewStateReady = project.status === "ready" || project.status === "failed";
      const isDefinitivelyDone = project.pipelineStage === "Ready" || project.pipelineStage === "Failed" || project.pipelineStage?.startsWith("Failed");

      if (isCurrentlyActive && isNewStateReady && !isDefinitivelyDone) {
        // Prevent stale 'ready' state from overwriting active refinement due to a race condition
        set({
          currentProject: {
            ...currentState.currentProject!,
            pipelineStage: project.pipelineStage && project.pipelineStage !== "Ready" ? project.pipelineStage : currentState.currentProject!.pipelineStage
          }
        });
      } else {
        if (silent) {
          set({ currentProject: project });
        } else {
          set({
            currentProject: project,
            loading: false,
          });
        }
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        throw error; // Handled by axios interceptor redirect, throw to stop polling
      }

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

  loadRuntimeStatus: async (projectId) => {
    try {
      const runtime = await getRuntimeStatusRequest(projectId);
      
      const currentId = get().currentProject?.id;
      if (currentId && currentId !== projectId) {
        return; // Ignore stale request if user navigated away
      }
      
      set({ runtime });
    } catch (error) {
      console.error("Failed to load runtime status:", error);
      const currentId = get().currentProject?.id;
      if (!currentId || currentId === projectId) {
        set({ runtime: null });
      }
    }
  },

  generateProject: async (projectId) => {
    try {
      set({
        startingRuntime: true,
        error: null,
      });

      const project = await generateProjectRequest(projectId);

      set({
        currentProject: project,
      });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        set({ startingRuntime: false });
        throw error;
      }

      let message = "Failed to generate project.";

      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message ?? message;
      }

      set({
        error: message,
        startingRuntime: false,
      });
      throw error;
    }
  },

  refineProject: async (projectId, prompt) => {
    try {
      set({ error: null });
      
      // FIX 1: Optimistic Frontend State Start
      const prevState = get().currentProject;
      set((state) => ({
        currentProject: state.currentProject
          ? {
              ...state.currentProject,
              status: "refining",
              pipelineStage: "Initializing Refinement...",
            }
          : null,
      }));

      try {
        await refineProjectRequest(projectId, prompt);
      } catch (reqError) {
        // FIX 7: Recover from failed API request
        set({ currentProject: prevState });
        throw reqError;
      }
      
      // We don't await the final project here because refinement happens in the background.
      // The SSE/polling will fetch real-time updates now that status is "refining".
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        throw error;
      }
      let message = "Failed to refine project.";
      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message ?? message;
      }
      set({ error: message });
      throw error;
    }
  },

  undoProject: async (projectId) => {
    try {
      set({ error: null, isUndoing: true });
      const project = await undoProjectRequest(projectId);
      set({ currentProject: project });
      await get().loadRuntimeStatus(projectId);
      await new Promise(resolve => setTimeout(resolve, 7500));
      set({ isUndoing: false });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        set({ isUndoing: false });
        throw error;
      }
      let message = "Failed to undo project.";
      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message ?? message;
      }
      set({ error: message, isUndoing: false });
      throw error;
    }
  },

  applyProject: async (projectId) => {
    try {
      set({ error: null, isApplying: true });
      const project = await applyProjectRequest(projectId);
      set({ currentProject: project, isApplying: false });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        set({ isApplying: false });
        throw error;
      }
      let message = "Failed to apply project changes.";
      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message ?? message;
      }
      set({ error: message, isApplying: false });
      throw error;
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
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        set({ startingRuntime: false });
        throw error;
      }

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
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        throw error;
      }

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