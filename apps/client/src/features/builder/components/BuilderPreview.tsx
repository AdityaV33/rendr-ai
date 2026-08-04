import { useBuilderStore } from "@/features/builder/store/builder.store";
import { RuntimeStatus } from "@/features/builder/types/runtime";

interface BuilderPreviewProps {
  onStartRuntime: () => void;
}

const BuilderPreview = ({ onStartRuntime }: BuilderPreviewProps) => {
  const runtime = useBuilderStore((state) => state.runtime);
  const startingRuntime = useBuilderStore((state) => state.startingRuntime);
  const error = useBuilderStore((state) => state.error);

  const isLoading =
    startingRuntime ||
    runtime?.status === RuntimeStatus.STARTING ||
    runtime?.status === RuntimeStatus.BUILDING ||
    runtime?.status === RuntimeStatus.INSTALLING ||
    runtime?.status === RuntimeStatus.GENERATING;

  const isFailed = runtime?.status === RuntimeStatus.FAILED || error;
  const isIdle = !runtime && !startingRuntime && !error;

  return (
    <div className="flex h-full flex-col bg-white">
      {isIdle && (
        <div className="flex flex-1 flex-col items-center justify-center bg-neutral-950 p-6 text-center">
          <div className="mb-4 text-neutral-400">
            <svg
              className="mx-auto h-12 w-12 text-neutral-600 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <p className="text-lg font-medium text-neutral-300">No Preview Available</p>
            <p className="mt-1 text-sm">The project has not been built yet.</p>
          </div>
          <button
            onClick={onStartRuntime}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
          >
            Generate / Start Preview
          </button>
        </div>
      )}

      {isLoading && (
        <div className="flex flex-1 items-center justify-center bg-neutral-950 text-neutral-400">
          <div className="flex flex-col items-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-600 border-t-blue-500" />
            <p>Starting Preview...</p>
          </div>
        </div>
      )}

      {isFailed && (
        <div className="flex flex-1 flex-col items-center justify-center bg-neutral-950 p-6 text-center text-red-500">
          <div>
            <p className="font-medium">Failed to load preview</p>
            {error && (
              <p className="mt-1 text-sm text-red-400 opacity-80">
                {error}
              </p>
            )}
          </div>
          <button
            onClick={onStartRuntime}
            className="mt-4 rounded-lg bg-red-900/40 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-900/60"
          >
            Retry
          </button>
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