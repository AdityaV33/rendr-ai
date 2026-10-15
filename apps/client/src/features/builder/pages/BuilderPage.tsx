import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";

import AppLayout from "@/components/layout/AppLayout";
import BuilderSidebar from "@/features/builder/components/BuilderSidebar";
import BuilderExplorer from "@/features/builder/components/BuilderExplorer";
import BuilderHeader from "@/features/builder/components/BuilderHeader";
import BuilderLayout from "@/features/builder/components/BuilderLayout";
import CodeEditor from "@/features/builder/editor/CodeEditor";
import { useBuilderStore } from "@/features/builder/store/builder.store";
import { useWorkspaceStore } from "@/features/builder/store/workspace.store";
import axios from "axios";

const BuilderPage = () => {
  const { projectId } = useParams();

  const {
    currentProject,
    loading,
    error,
    loadProject,
    loadRuntimeStatus,
    generateProject,
    startRuntime,
  } = useBuilderStore();

  const {
    setProject,
    loadWorkspaceTree,
  } = useWorkspaceStore();

  const pollingRef = useRef<number | null>(null);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    setProject(projectId);

    const init = async () => {
      await loadProject(projectId);
      
      const { currentProject } = useBuilderStore.getState();
      if (currentProject?.framework) {
        await loadWorkspaceTree();
      }
    };

    void init();
    void loadRuntimeStatus(projectId);
  }, [
    projectId,
    loadProject,
    loadRuntimeStatus,
    setProject,
    loadWorkspaceTree,
  ]);

  useEffect(() => {
    if (!projectId) return;

    const checkPolling = async () => {
      const state = useBuilderStore.getState();
      const status = state.currentProject?.status;
      
      if (status === "ready" || status === "failed") {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        return;
      }

      if (
        status && 
        ["generating", "building", "repairing", "refining"].includes(status)
      ) {
        if (!pollingRef.current) {
          pollingRef.current = window.setInterval(async () => {
            try {
              await loadProject(projectId, true);
              const newState = useBuilderStore.getState();
              const newStatus = newState.currentProject?.status;
              const newStage = newState.currentProject?.pipelineStage;
              
              const isDefinitivelyDone = newStage === "Ready" || newStage === "Failed" || newStage?.startsWith("Failed");

              if (newStatus === "pending_changes" || ((newStatus === "ready" || newStatus === "failed") && isDefinitivelyDone)) {
                if (pollingRef.current) {
                  clearInterval(pollingRef.current);
                  pollingRef.current = null;
                }
              }
            } catch (err) {
              if (axios.isAxiosError(err) && err.response?.status === 401) {
                if (pollingRef.current) {
                  clearInterval(pollingRef.current);
                  pollingRef.current = null;
                }
              }
            }
          }, 2000);
        }
      }
    };

    void checkPolling();

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [projectId, currentProject?.status, loadProject]);

  const handleStartRuntime = async () => {
    if (!projectId || !currentProject) {
      return;
    }

    try {
      if (!currentProject.generatedProject) {
        await generateProject(projectId);
      } else {
        await startRuntime(projectId);
      }
      await loadWorkspaceTree();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <main className="flex min-h-screen items-center justify-center">
          <h1 className="text-xl font-semibold">
            Loading project...
          </h1>
        </main>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <main className="flex min-h-screen items-center justify-center">
          <h1 className="text-xl font-semibold text-red-500">
            {error}
          </h1>
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
              <BuilderHeader
                project={currentProject}
              />

              <div className="min-h-0 flex-1">
                <CodeEditor />
              </div>
            </div>
          )
        }
        right={
          <BuilderSidebar 
            onGenerate={handleStartRuntime} 
          />
        }
      />
    </AppLayout>
  );
};

export default BuilderPage;
