import { useEffect } from "react";
import { useBuilderStore } from "@/features/builder/store/builder.store";
import { RuntimeStatus } from "@/features/builder/types/runtime";

interface BuilderPreviewProps {
  onStartRuntime: () => void;
}

const BuilderPreview = ({ onStartRuntime }: BuilderPreviewProps) => {
  const runtime = useBuilderStore((state) => state.runtime);
  const startingRuntime = useBuilderStore((state) => state.startingRuntime);
  const error = useBuilderStore((state) => state.error);

  const currentProject = useBuilderStore((state) => state.currentProject);

  useEffect(() => {
    console.log("========================================");
    console.log("PREVIEW INSTRUMENTATION LOG");
    console.log(`Project ID: ${currentProject?.id}`);
    console.log(`Starting Runtime State: ${startingRuntime}`);
    console.log(`Runtime Error: ${error}`);
    console.log(`Runtime Status Object:`, runtime);
    console.log(`Preview URL: ${runtime?.preview?.url}`);
    
    if (!runtime && !startingRuntime && !error) {
      console.log("-> TRIGGERING onStartRuntime()");
      onStartRuntime();
    }
  }, [runtime, startingRuntime, error, onStartRuntime, currentProject?.id]);

  const isLoading =
    startingRuntime ||
    runtime?.status === RuntimeStatus.STARTING ||
    runtime?.status === RuntimeStatus.BUILDING ||
    runtime?.status === RuntimeStatus.INSTALLING ||
    runtime?.status === RuntimeStatus.GENERATING;

  const isFailed = runtime?.status === RuntimeStatus.FAILED || error;

  console.log(`[Preview Render] iframe src will be: ${!isLoading && !isFailed && runtime?.preview?.url ? runtime.preview.url : "NOT RENDERED"}`);

  return (
    <div className="flex h-full flex-col bg-white">
      {isLoading && (
        <div className="flex flex-1 items-center justify-center bg-neutral-950 text-neutral-400">
          <div className="flex flex-col items-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-600 border-t-blue-500" />
            <p>Starting Preview...</p>
          </div>
        </div>
      )}

      {isFailed && (
        <div className="flex flex-1 items-center justify-center bg-neutral-950 p-6 text-center text-red-500">
          <div>
            <p className="font-medium">Failed to load preview</p>
            {error && <p className="mt-1 text-sm text-red-400 opacity-80">{error}</p>}
          </div>
        </div>
      )}

      {!isLoading && !isFailed && runtime?.preview?.url && (
        <iframe
          src={runtime.preview.url}
          className="h-full w-full border-none bg-white"
          title="Preview"
          sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
        />
      )}
    </div>
  );
};

export default BuilderPreview;
