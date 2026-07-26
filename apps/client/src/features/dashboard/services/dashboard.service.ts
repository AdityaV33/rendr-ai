import api from "@/lib/axios";

import type {
  CreateProjectRequest,
  Project,
} from "../types/dashboard";

class DashboardService {
  async getProjects(): Promise<Project[]> {
    const response = await api.get<Project[]>("/projects");

    return response.data;
  }

  async createProject(
    data: CreateProjectRequest,
  ): Promise<Project> {
    const response = await api.post<Project>(
      "/projects",
      data,
    );

    return response.data;
  }

  async getProject(
    projectId: string,
  ): Promise<Project> {
    const response = await api.get<Project>(
      `/projects/${projectId}`,
    );

    return response.data;
  }

  async deleteProject(
    projectId: string,
  ): Promise<void> {
    await api.delete(`/projects/${projectId}`);
  }
}

export const dashboardService =
  new DashboardService();