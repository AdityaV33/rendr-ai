import { useEffect } from "react";
import { useParams } from "react-router-dom";
import BuilderAssistant from "@/features/builder/components/BuilderAssistant";

import AppLayout from "@/components/layout/AppLayout";
import BuilderExplorer from "@/features/builder/components/BuilderExplorer";
import BuilderHeader from "@/features/builder/components/BuilderHeader";
import BuilderLayout from "@/features/builder/components/BuilderLayout";
import CodeEditor from "@/features/builder/editor/CodeEditor";
import { useBuilderStore } from "@/features/builder/store/builder.store";

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
        left={<BuilderExplorer />}
        center={
          currentProject && (
            <div className="flex h-full flex-col">
              <BuilderHeader project={currentProject} />

              <div className="min-h-0 flex-1">
                <CodeEditor />
              </div>
            </div>
          )
        }
      right={<BuilderAssistant />}
      />
    </AppLayout>
  );
};

export default BuilderPage;