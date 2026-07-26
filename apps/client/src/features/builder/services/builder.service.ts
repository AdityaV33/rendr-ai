import api from "@/lib/axios";

const getProject = async (projectId: string) => {
  const response = await api.get(`/projects/${projectId}`);

  return response.data;
};

const generateProject = async (projectId: string) => {
  const response = await api.post(
    `/projects/${projectId}/generate`,
  );

  return response.data;
};

export { getProject, generateProject };