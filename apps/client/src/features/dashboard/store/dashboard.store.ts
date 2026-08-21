import { create } from "zustand";

import { dashboardService } from "../services/dashboard.service";
import type {
  CreateProjectRequest,
  Project,
} from "../types/dashboard";

interface DashboardState {
  projects: Project[];

  loading: boolean;
  error: string | null;

  fetchProjects: () => Promise<void>;
  createProject: (
    data: CreateProjectRequest,
  ) => Promise<void>;
  deleteProject: (
    projectId: string,
  ) => Promise<void>;
  exportProject: (
    projectId: string,
    projectName: string,
  ) => Promise<void>;

  clearError: () => void;
}

export const useDashboardStore =
  create<DashboardState>((set, get) => ({
    projects: [],

    loading: false,
    error: null,

    fetchProjects: async () => {
      if (get().projects.length === 0) {
        set({
          loading: true,
          error: null,
        });
      }

      try {
        const projects =
          await dashboardService.getProjects();

        set({
          projects,
          loading: false,
        });
      } catch (error) {
        set({
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to fetch projects.",
        });
      }
    },

    createProject: async (data) => {
      set({
        loading: true,
        error: null,
      });

      try {
        const project =
          await dashboardService.createProject(
            data,
          );

        set({
          projects: [
            project,
            ...get().projects,
          ],
        });

        // Trigger generation but don't await the final project, just wait for the 202 accepted
        await dashboardService.generateProject(project.id);
        
        // Optimistically update the project state to start polling and trigger UI
        set({
          projects: get().projects.map(p => 
            p.id === project.id 
              ? { ...p, status: "generating", pipelineStage: "Planning..." } 
              : p
          ),
        });
        
        // Wait 2.35 seconds to simulate creation time as requested by user
        await new Promise(r => setTimeout(r, 2350));
        
        set({
          loading: false,
        });
      } catch (error) {
        set({
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to create project.",
        });

        throw error;
      }
    },

    deleteProject: async (projectId) => {
      const currentProjects = get().projects;
      const projectToDelete = currentProjects.find((p) => p.id === projectId);
      
      // Optimistic Update
      set({
        projects: currentProjects.filter((p) => p.id !== projectId),
      });

      try {
        await dashboardService.deleteProject(projectId);
      } catch (error) {
        // Rollback
        if (projectToDelete) {
          set({ projects: [...get().projects, projectToDelete] });
        }
        
        set({
          error: error instanceof Error ? error.message : "Failed to delete project.",
        });

        throw error;
      }
    },

    exportProject: async (projectId: string, projectName: string) => {
      try {
        const blob = await dashboardService.exportProject(projectId);
        const url = window.URL.createObjectURL(new Blob([blob]));
        const link = document.createElement("a");
        link.href = url;
        const safeFilename = projectName.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "project";
        link.setAttribute("download", `${safeFilename}-export.zip`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (error) {
        set({
          error:
            error instanceof Error
              ? error.message
              : "Failed to export project.",
        });
        throw error;
      }
    },

    clearError: () =>
      set({
        error: null,
      }),
  }));