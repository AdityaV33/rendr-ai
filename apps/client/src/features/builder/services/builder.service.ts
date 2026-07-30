import api from "@/lib/axios";

const getProject = async (projectId: string) => {
  const response = await api.get(`/projects/${projectId}`);

  return response.data;
};

const generateProject = async (projectId: string) => {
  const response = await api.post(`/projects/${projectId}/generate`);

  return response.data;
};

const startRuntime = async (projectId: string) => {
  const response = await api.post(
    `/runtime/${projectId}/start`,
  );

  return response.data;
};

const stopRuntime = async (projectId: string) => {
  const response = await api.post(
    `/runtime/${projectId}/stop`,
  );

  return response.data;
};

const getWorkspaceTree = async (
  projectId: string,
) => {
  const response = await api.get(
    `/runtime/${projectId}/files`,
  );

  return response.data;
};

const getWorkspaceFile = async (
  projectId: string,
  filePath: string,
) => {
  const response = await api.get(
    `/runtime/${projectId}/file`,
    {
      params: {
        path: filePath,
      },
    },
  );

  return response.data;
};

const updateWorkspaceFile = async (
  projectId: string,
  path: string,
  content: string,
) => {
  const response = await api.put(
    `/runtime/${projectId}/file`,
    {
      path,
      content,
    },
  );

  return response.data;
};

const deleteProject = async (projectId: string) => {
  const response = await api.delete(`/projects/${projectId}`);
  return response.data;
};

export {
  getProject,
  generateProject,
  startRuntime,
  stopRuntime,
  getWorkspaceTree,
  getWorkspaceFile,
  updateWorkspaceFile,
  deleteProject,
};