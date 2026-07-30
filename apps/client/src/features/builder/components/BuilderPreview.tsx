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

  useEffect(() => {
    if (!runtime && !startingRuntime && !error) {
      onStartRuntime();
    }
  }, [runtime, startingRuntime, error, onStartRuntime]);

  const isLoading =
    startingRuntime ||
    runtime?.status === RuntimeStatus.STARTING ||
    runtime?.status === RuntimeStatus.BUILDING ||
    runtime?.status === RuntimeStatus.INSTALLING ||
    runtime?.status === RuntimeStatus.GENERATING;

  const isFailed = runtime?.status === RuntimeStatus.FAILED || error;

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
            {error && (
              <p className="mt-1 text-sm text-red-400 opacity-80">
                {error}
              </p>
            )}
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