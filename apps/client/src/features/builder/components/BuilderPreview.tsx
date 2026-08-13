import { useBuilderStore } from "@/features/builder/store/builder.store";
import { RuntimeStatus } from "@/features/builder/types/runtime";

const BuilderPreview = () => {
  const currentProject = useBuilderStore((state) => state.currentProject);
  const runtime = useBuilderStore((state) => state.runtime);
  const startingRuntime = useBuilderStore((state) => state.startingRuntime);
  const startRuntime = useBuilderStore((state) => state.startRuntime);
  const error = useBuilderStore((state) => state.error);

  const handleStartPreview = () => {
    if (currentProject?.id) {
      startRuntime(currentProject.id);
    }
  };

  const isLoading =
    startingRuntime ||
    runtime?.status === RuntimeStatus.STARTING ||
    runtime?.status === RuntimeStatus.BUILDING ||
    runtime?.status === RuntimeStatus.INSTALLING ||
    runtime?.status === RuntimeStatus.GENERATING;

  const isFailed = runtime?.status === RuntimeStatus.FAILED || error;
  const isIdle = !runtime && !startingRuntime && !error;

  return (
    <div className="relative flex h-full flex-col bg-[#0a0a0a] overflow-hidden">
      {/* Background and Decorators (only visible when not rendering preview) */}
      {(isIdle || isLoading || isFailed) && (
        <>
          <div 
            className="absolute inset-0 pointer-events-none opacity-[0.25]" 
            style={{ 
              backgroundImage: 'radial-gradient(#a0a0a0 1px, transparent 1px)', 
              backgroundSize: '24px 24px' 
            }} 
          />
          <div className="absolute top-6 left-6 h-4 w-4 border-l-2 border-t-2 border-[#555] pointer-events-none" />
          <div className="absolute top-6 right-6 h-4 w-4 border-r-2 border-t-2 border-[#555] pointer-events-none" />
          <div className="absolute bottom-6 left-6 h-4 w-4 border-l-2 border-b-2 border-[#555] pointer-events-none" />
          <div className="absolute bottom-6 right-6 h-4 w-4 border-r-2 border-b-2 border-[#555] pointer-events-none" />
        </>
      )}

      {isIdle && (
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center p-6 text-center">
          <div className="mb-6 flex flex-col items-center text-[#a0a0a0]">
            <div className="mb-8 text-[#f5f5f5]">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
                <rect x="3" y="4" width="18" height="16" />
                <path d="M3 8h18" />
                <rect x="5.5" y="5.5" width="1.5" height="1.5" fill="currentColor" stroke="none" />
                <rect x="8.5" y="5.5" width="1.5" height="1.5" fill="currentColor" stroke="none" />
                <rect x="11.5" y="5.5" width="1.5" height="1.5" fill="currentColor" stroke="none" />
                <path d="M10 16.5l-3-3 3-3M14 16.5l3-3-3-3M13.5 10l-3 7" />
              </svg>
            </div>
            <p className="text-lg font-mono font-bold text-[#f5f5f5] tracking-wide">No Preview Available</p>
            <p className="mt-4 text-[13px] text-[#777] max-w-[200px] leading-relaxed">
              Have you tried turning the preview off and on?
            </p>

            <div className="mt-8 flex items-center justify-center space-x-3 opacity-60">
              <div className="w-12 border-t border-dotted border-[#777]" />
              <div className="flex h-5 w-5 items-center justify-center rounded-full border border-[#777]">
                <div className="h-1.5 w-1.5 rotate-45 bg-[#777]" />
              </div>
              <div className="w-12 border-t border-dotted border-[#777]" />
            </div>
          </div>
          
          <button
            onClick={handleStartPreview}
            className="mt-4 flex w-3/4 items-center justify-center rounded-lg border border-[#444] bg-[#0a0a0a] px-4 py-3 text-[13px] font-mono font-medium text-[#f5f5f5] transition-colors hover:bg-[#111]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
            </svg>
            Start Preview
          </button>
        </div>
      )}

      {isLoading && (
        <div className="relative z-10 flex flex-1 items-center justify-center text-[#a0a0a0]">
          <div className="flex flex-col items-center gap-6">
            <div className="relative h-12 w-12 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#555] animate-[spin_4s_linear_infinite]" />
              <div className="absolute inset-2 rounded-full border-2 border-dotted border-[#f5f5f5] animate-[spin_3s_linear_infinite_reverse]" />
              <div className="h-2 w-2 rounded-full bg-[#f5f5f5] animate-pulse" />
            </div>
            <p className="font-mono text-[13px] tracking-widest text-[#f5f5f5] uppercase">Starting...</p>
          </div>
        </div>
      )}

      {isFailed && (
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-red-500">
          <div className="mb-4">
            <p className="font-mono font-bold">Failed to load preview</p>
            {error && (
              <p className="mt-2 text-[13px] font-mono text-red-400 opacity-80">
                {error}
              </p>
            )}
          </div>
          <button
            onClick={handleStartPreview}
            className="rounded-lg border border-red-900 bg-transparent px-4 py-2 text-[13px] font-mono font-medium text-red-400 transition-colors hover:bg-red-950"
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !isFailed && runtime?.preview?.url && (
        <iframe
          src={runtime.preview.url}
          className="h-full w-full border-none bg-[#0a0a0a]"
          style={{ colorScheme: 'dark' }}
          title="Preview"
          sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
        />
      )}
    </div>
  );
};

export default BuilderPreview;