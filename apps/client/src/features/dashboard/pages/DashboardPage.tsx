import { useEffect, useState } from "react";

import CreateProjectDialog from "../components/CreateProjectDialog";
import DashboardHeader from "../components/DashboardHeader";
import ProjectGrid from "../components/ProjectGrid";
import { useDashboardStore } from "../store/dashboard.store";

const DashboardPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const {
    projects,
    loading,
    fetchProjects,
    createProject,
  } = useDashboardStore();

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  const handleCreateProject = async (
    name: string,
    prompt: string,
  ) => {
    await createProject({
      name,
      prompt,
    });
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <DashboardHeader
        onCreateProject={() => setDialogOpen(true)}
      />

      <section className="mx-auto max-w-7xl p-6">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-neutral-400">
              Loading projects...
            </p>
          </div>
        ) : (
          <ProjectGrid projects={projects} />
        )}
      </section>

      <CreateProjectDialog
        open={dialogOpen}
        loading={loading}
        onClose={() => setDialogOpen(false)}
        onCreate={handleCreateProject}
      />
    </main>
  );
};

export default DashboardPage;