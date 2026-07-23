import { useEffect } from "react";
import { useParams } from "react-router-dom";

import BuilderLayout from "@/features/builder/components/BuilderLayout";
import AppLayout from "@/components/layout/AppLayout";
import { useBuilderStore } from "@/features/builder/store/builder.store";
import BuilderHeader from "@/features/builder/components/BuilderHeader";

const BuilderPage = () => {
  const { projectId } = useParams();

  const {
    currentProject,
    loading,
    error,
    loadProject,
  } = useBuilderStore();

  useEffect(() => {
    if (!projectId) return;

    loadProject(projectId);
  }, [projectId, loadProject]);
    if (loading) {
    return (
      <AppLayout>
        <main className="flex min-h-screen items-center justify-center">
          <h1 className="text-xl font-semibold">Loading project...</h1>
        </main>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <main className="flex min-h-screen items-center justify-center">
          <h1 className="text-xl font-semibold text-red-500">{error}</h1>
        </main>
      </AppLayout>
    );
  }

 return (
  <AppLayout>
    <BuilderLayout
      left={
        <div className="p-4">
          <h2 className="mb-4 text-lg font-semibold">Explorer</h2>

          <p className="text-sm text-neutral-400">
            File Explorer coming in Day 2.
          </p>
        </div>
      }
      center={
  currentProject && (
    <div className="flex h-full flex-col">
      <BuilderHeader project={currentProject} />

      <div className="flex flex-1 items-center justify-center">
        <p className="text-neutral-500">
          Monaco Editor coming in Day 2.
        </p>
      </div>
    </div>
  )
}
      right={
        <div className="p-4">
          <h2 className="mb-4 text-lg font-semibold">
            AI Assistant
          </h2>

          <p className="text-sm text-neutral-400">
            Prompt tools coming in Day 2.
          </p>
        </div>
      }
    />
  </AppLayout>
); 
};

export default BuilderPage;