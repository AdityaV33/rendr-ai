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

  clearError: () => void;
}

export const useDashboardStore =
  create<DashboardState>((set, get) => ({
    projects: [],

    loading: false,
    error: null,

    fetchProjects: async () => {
      set({
        loading: true,
        error: null,
      });

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

        throw error;
      }
    },

    createProject: async (data) => {
      set({
        loading: true,
        error: null,
      });

      try {
        let project =
          await dashboardService.createProject(
            data,
          );

        set({
          projects: [
            project,
            ...get().projects,
          ],
        });

        // Trigger generation
        project = await dashboardService.generateProject(project.id);
        
        // Update project state with generation status
        set({
          projects: get().projects.map(p => p.id === project.id ? project : p),
        });

        // Trigger runtime
        await dashboardService.startRuntime(project.id);

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
      try {
        await dashboardService.deleteProject(
          projectId,
        );

        set({
          projects: get().projects.filter(
            (project) =>
              project.id !== projectId,
          ),
        });
      } catch (error) {
        set({
          error:
            error instanceof Error
              ? error.message
              : "Failed to delete project.",
        });

        throw error;
      }
    },

    clearError: () =>
      set({
        error: null,
      }),
  }));