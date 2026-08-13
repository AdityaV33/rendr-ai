import { useBuilderStore } from "@/features/builder/store/builder.store";
import { useWorkspaceStore } from "@/features/builder/store/workspace.store";
import { useState, useEffect, useRef } from "react";
import { toast } from "@/lib/toast";
import { Sparkles } from "lucide-react";

interface BuilderAssistantProps {
  onGenerate: () => void;
}

const TimelineItem = ({ index, title, subtitle, isActiveRefinement, visualProgress }: { index: number, title: string, subtitle?: string, isActiveRefinement: boolean, visualProgress: number }) => {
  // A node is completed if the progress has fully passed it.
  const isCompleted = isActiveRefinement ? visualProgress >= index + 1 : false;
  // A node is active if the progress is currently on it or passing through it to the next.
  const isActive = isActiveRefinement && visualProgress >= index && visualProgress < index + 1;
  // The line connects index to index + 1
  const lineFillPercent = isActiveRefinement ? Math.max(0, Math.min(1, visualProgress - index)) * 100 : 0;

  return (
    <div className="flex gap-4 relative">
      {/* Connection Line Background */}
      {index < 4 && (
        <div className="absolute left-[11px] top-6 bottom-[-8px] w-[2px] bg-[#333]" />
      )}
      
      {/* Connection Line Fill */}
      {index < 4 && (
        <div 
          className="absolute left-[11px] top-6 bottom-[-8px] w-[2px] bg-[#f5f5f5] origin-top" 
          style={{
             transform: `scaleY(${lineFillPercent / 100})`
          }}
        />
      )}
      
      {/* Icon */}
      <div className="relative z-10 flex-shrink-0 mt-1">
        {isCompleted ? (
          <div className="flex h-[24px] w-[24px] items-center justify-center rounded-full bg-[#f5f5f5] text-[#0a0a0a]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        ) : isActive ? (
          <div className="flex h-[24px] w-[24px] items-center justify-center rounded-full border-2 border-[#f5f5f5] bg-[#0a0a0a]">
             <div className="h-2 w-2 rounded-full bg-[#f5f5f5] animate-pulse" />
          </div>
        ) : (
          <div className="flex h-[24px] w-[24px] items-center justify-center rounded-full border-2 border-[#444] bg-[#0a0a0a]" />
        )}
      </div>

      {/* Text */}
      <div className="pb-6">
        <p className={`font-mono text-[13px] transition-colors duration-300 ${isCompleted || isActive ? "text-[#f5f5f5]" : "text-[#777]"}`}>
          {title}
        </p>
        <p className={`mt-1 font-mono text-[11px] transition-all duration-300 overflow-hidden ${subtitle ? "text-[#888] max-h-10 opacity-100" : "max-h-0 opacity-0"}`}>
          {subtitle || " "}
        </p>
      </div>
    </div>
  );
};

const BuilderAssistant = ({ onGenerate }: BuilderAssistantProps) => {
  const currentProject = useBuilderStore((state) => state.currentProject);
  const refineProject = useBuilderStore((state) => state.refineProject);
  const applyProject = useBuilderStore((state) => state.applyProject);
  const undoProject = useBuilderStore((state) => state.undoProject);
  const startingRuntime = useBuilderStore((state) => state.startingRuntime);
  const isApplying = useBuilderStore((state) => state.isApplying);
  const isUndoing = useBuilderStore((state) => state.isUndoing);
  const error = useBuilderStore((state) => state.error);
  const loadWorkspaceTree = useWorkspaceStore((state) => state.loadWorkspaceTree);

  const [refinementPrompt, setRefinementPrompt] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [showReadyHighlight, setShowReadyHighlight] = useState(false);
  const [hideFailure, setHideFailure] = useState(false);
  const [isPendingUIReady, setIsPendingUIReady] = useState(false);
  
  const prevStatusRef = useRef(currentProject?.status);

  if (currentProject?.status !== prevStatusRef.current) {
    if (currentProject?.status !== "failed") {
      setHideFailure(false);
    }
    prevStatusRef.current = currentProject?.status;
  }

  const isFailed = currentProject?.status === "failed" && !hideFailure;
  const isReady = currentProject?.status === "ready" || (currentProject?.status === "failed" && hideFailure);
  const isPendingChanges = Boolean(currentProject?.status === "pending_changes" || currentProject?.hasPendingChanges);
  const isActiveRefinement = Boolean(
    currentProject && 
    ["refining", "building", "repairing"].includes(currentProject.status) && 
    currentProject.historyCount !== undefined // Only refinement if it has history or is ready to have history
  );
  
  const stage = currentProject?.pipelineStage || "Initializing Refinement...";

  const previousStatusForEffectRef = useRef(currentProject?.status);

  // Success flash message when transitioning from refining/building to pending_changes (after preview verification)
  useEffect(() => {
    let innerTimer: ReturnType<typeof setTimeout>;
    const prev = previousStatusForEffectRef.current;
    if (currentProject?.status === "pending_changes" && prev && ["refining", "building", "repairing"].includes(prev)) {
      // Wait for the 1.5s timeline animation to complete before showing the success flash
      const outerTimer = setTimeout(() => {
        setShowReadyHighlight(true);
        setIsPendingUIReady(true);
        innerTimer = setTimeout(() => {
          setShowReadyHighlight(false);
        }, 6000);
      }, 1500);
      
      previousStatusForEffectRef.current = currentProject?.status;
      return () => {
        clearTimeout(outerTimer);
        clearTimeout(innerTimer);
      };
    } else if (currentProject?.status === "pending_changes" && prev === "pending_changes") {
      setIsPendingUIReady(true);
    } else if (currentProject?.status !== "pending_changes") {
      setIsPendingUIReady(false);
    }
    previousStatusForEffectRef.current = currentProject?.status;
  }, [currentProject?.status]);

  const handleRefine = async () => {
    if (!currentProject || !refinementPrompt.trim() || isRefining || isUndoing) return;
    
    setIsRefining(true);
    try {
      await refineProject(currentProject.id, refinementPrompt);
      // Don't clear prompt yet, let user see what they submitted
    } catch {
      toast.error("Refinement Failed", "Unable to start refinement.");
    } finally {
      setIsRefining(false);
    }
  };

  const handleApply = async () => {
    if (!currentProject || isApplying || isUndoing) return;
    
    try {
      await applyProject(currentProject.id);
      setRefinementPrompt(""); // Clear prompt after successful apply
      toast.success("Changes Applied", "The refinement has been persisted successfully.");
    } catch {
      toast.error("Apply Failed", "Unable to apply changes.");
    }
  };

  const handleUndo = async () => {
    if (!currentProject || isUndoing || isRefining || isActiveRefinement) return;
    
    try {
      await undoProject(currentProject.id);
      await loadWorkspaceTree();
      toast.success("Undo Successful", "Project restored to previous state.");
    } catch {
      toast.error("Undo Failed", "Unable to undo the last refinement.");
    }
  };

  const getStageIndex = () => {
    if (isPendingChanges) return 5;
    if (!isActiveRefinement) return 0;
    if (stage.includes("Analyzing request") || stage.includes("Initializing")) return 0;
    if (stage.includes("Modifying files") || stage.includes("Applying changes")) return 2; // Selecting is 1, so Modifying is 2
    if (stage.includes("Building") || stage.includes("Repairing") || stage.includes("Type checking")) return 3;
    if (stage.includes("Verifying preview") || stage.includes("Preview")) return 4;
    return 0; // fallback
  };
  
  const targetStageIndex = getStageIndex();
  const [visualProgress, setVisualProgress] = useState(0);

  useEffect(() => {
    let animId: number;
    let startTimestamp: number | null = null;
    // We capture the starting progress for this specific animation frame sequence
    const startProgress = visualProgress;
    const distance = targetStageIndex - startProgress;
    
    if (Math.abs(distance) < 0.01) {
      if (visualProgress !== targetStageIndex) {
        requestAnimationFrame(() => setVisualProgress(targetStageIndex));
      }
      return;
    }

    const duration = 1500; // 1500ms for the entire movement

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progressRatio = Math.min(elapsed / duration, 1);
      
      // ease-in-out cubic
      const ease = progressRatio < 0.5 
        ? 4 * progressRatio * progressRatio * progressRatio 
        : 1 - Math.pow(-2 * progressRatio + 2, 3) / 2;

      const current = startProgress + distance * ease;
      setVisualProgress(current);

      if (progressRatio < 1) {
        animId = requestAnimationFrame(step);
      } else {
        setVisualProgress(targetStageIndex);
      }
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetStageIndex]); // Only re-run when target changes

  return (
    <div className="flex h-full flex-col bg-[#0a0a0a]">
      <div className="p-4 pb-2 border-b border-[#222]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-mono font-bold text-[#f5f5f5] flex items-center gap-2 uppercase tracking-wide">
              <Sparkles size={14} className="text-[#f5f5f5]" /> 
              {isFailed ? "REFINEMENT FAILED" : "Refine your project with AI"}
            </h2>
          </div>
          {currentProject && !isFailed && (
            <div className={`flex items-center gap-2 rounded-full border px-2 py-0.5 transition-colors duration-500 ${showReadyHighlight ? "border-green-900/50 bg-green-950/30" : "border-[#333] bg-[#111] opacity-50"}`}>
              <div className={`h-1.5 w-1.5 rounded-full transition-colors duration-500 ${showReadyHighlight ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" : "bg-[#555]"}`} />
              <span className={`text-[10px] font-mono font-bold tracking-wider transition-colors duration-500 ${showReadyHighlight ? "text-green-400" : "text-[#777]"}`}>READY</span>
            </div>
          )}
        </div>

        {!isFailed && (
          <p className="mt-3 text-[13px] font-mono text-[#a0a0a0]">
            Make small changes with AI refinement.
          </p>
        )}
      </div>

      <div className="flex-1 overflow-hidden p-4 relative">
        {isFailed ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="mb-4 text-red-500">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            </div>
            <p className="font-mono text-[13px] text-[#f5f5f5] mb-2">Refinement failed</p>
            <p className="font-mono text-[12px] text-[#a0a0a0] mb-6">Your project was restored to its previous working state.</p>
            <button
              onClick={() => {
                setHideFailure(true);
                // Also optionally pre-fill the prompt if we want, but usually it's already there
                setTimeout(() => {
                  const input = document.querySelector('textarea');
                  if (input) input.focus();
                }, 0);
              }}
              className="rounded-lg border border-[#444] bg-[#222] px-4 py-2 text-[12px] font-mono text-[#f5f5f5] transition hover:bg-[#333]"
            >
              Try Again
            </button>
          </div>
        ) : isReady || isActiveRefinement || isPendingChanges ? (
          <div className="flex flex-col gap-6 min-h-full">
            <div className="relative h-48 flex-shrink-0">
              <textarea
                value={refinementPrompt}
                onChange={(e) => setRefinementPrompt(e.target.value)}
                placeholder="e.g. Make the buttons rounded and change the primary color to indigo."
                disabled={isActiveRefinement || isRefining || isUndoing}
                maxLength={500}
                className="h-full w-full resize-none rounded-lg border border-[#333] bg-[#111] p-4 pb-12 text-[13px] font-mono text-[#f5f5f5] outline-none disabled:opacity-50 transition focus:border-[#555] focus:bg-[#151515]"
              />
              <div className="absolute bottom-3 left-4 text-[11px] font-mono text-[#777]">
                {refinementPrompt.length}/500
              </div>
              <button
                onClick={handleRefine}
                disabled={!refinementPrompt.trim() || isActiveRefinement || isRefining || isUndoing || isPendingChanges || isApplying}
                className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-md border border-[#444] bg-[#222] text-[#f5f5f5] transition hover:bg-[#333] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>

            <div className="flex flex-col pt-2">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[11px] font-mono text-[#777] uppercase tracking-widest whitespace-nowrap">Refinement Process</span>
                <div className="flex-1 border-t border-dashed border-[#333]"></div>
              </div>
              <TimelineItem isActiveRefinement={isActiveRefinement || isPendingChanges} visualProgress={visualProgress} index={0} title="Understanding your request" />
              <TimelineItem isActiveRefinement={isActiveRefinement || isPendingChanges} visualProgress={visualProgress} index={1} title="Selecting relevant files" subtitle={(isActiveRefinement || isPendingChanges) && visualProgress >= 1 ? "Files identified" : ""} />
              <TimelineItem isActiveRefinement={isActiveRefinement || isPendingChanges} visualProgress={visualProgress} index={2} title="Updating files" subtitle={(isActiveRefinement || isPendingChanges) && visualProgress >= 3 ? "Changes applied" : ((isActiveRefinement || isPendingChanges) && visualProgress >= 2 ? "Applying changes" : "")} />
              <TimelineItem isActiveRefinement={isActiveRefinement || isPendingChanges} visualProgress={visualProgress} index={3} title="Building project" subtitle={(isActiveRefinement || isPendingChanges) && visualProgress >= 4 ? "Build successful" : ((isActiveRefinement || isPendingChanges) && visualProgress >= 3 ? "Running build and type checks" : "")} />
              <TimelineItem isActiveRefinement={isActiveRefinement || isPendingChanges} visualProgress={visualProgress} index={4} title="Verifying preview" subtitle={(isActiveRefinement || isPendingChanges) && visualProgress >= 5 ? "Preview verified" : ((isActiveRefinement || isPendingChanges) && visualProgress >= 4 ? "Checking preview and functionality" : "")} />
            </div>

            <div className="mt-8 rounded-lg border border-[#222] bg-[#0c0c0c] p-4">
              <div className="flex items-center gap-1.5 text-[#a0a0a0]">
                <span className="text-[12px]">✦</span>
                <span className="text-[10px] font-mono font-bold tracking-widest uppercase">Refinement Tip</span>
              </div>
              <p className="mt-2 font-mono text-[11px] text-[#777] leading-relaxed">
                Be specific. "Fix the UI" leaves us with several thousand possibilities.
              </p>
            </div>
          </div>
        ) : (
          <div className="h-48">
            <textarea
              value={currentProject?.prompt ?? ""}
              readOnly
              className="h-full w-full resize-none rounded-lg border border-[#333] bg-[#111] p-4 text-[13px] font-mono text-[#777] outline-none"
            />
          </div>
        )}
      </div>

      {error && (
        <p className="px-4 pb-2 text-[13px] font-mono text-red-500">
          {error}
        </p>
      )}

      <div className="p-4 pt-0 space-y-3">
        {(isReady || isActiveRefinement || isPendingChanges) && !isFailed && (
          <button
            type="button"
            onClick={handleUndo}
            disabled={(!isPendingUIReady && (!currentProject?.historyCount || currentProject.historyCount === 0)) || isUndoing || isActiveRefinement || isRefining}
            className="w-full flex items-center justify-between rounded-lg border border-[#333] bg-transparent px-4 py-3 text-[13px] font-mono text-[#a0a0a0] transition-colors hover:bg-[#111] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div className="flex items-center gap-2">
              {isUndoing ? (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1 4 1 10 7 10"></polyline>
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                </svg>
              )}
              {isUndoing ? "Undoing..." : "Undo Last Change"}
            </div>
          </button>
        )}

        {(isReady || isActiveRefinement || isPendingChanges) && !isFailed && (
          <div className="rounded-lg border border-[#333] bg-[#111] p-3 flex gap-3 items-start mb-4">
            <svg className="flex-shrink-0 mt-0.5 text-[#a0a0a0]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              <polyline points="9 12 11 14 15 10"></polyline>
            </svg>
            <div>
              <p className="font-mono text-[12px] text-[#f5f5f5]">Refinement will be applied safely.</p>
              <p className="font-mono text-[11px] text-[#777] mt-0.5">You can undo changes after completion.</p>
            </div>
          </div>
        )}

        {(isReady || isActiveRefinement || isPendingChanges || isFailed) ? (
          <div>
            <button
              type="button"
              onClick={handleApply}
              disabled={!isPendingUIReady || isApplying || isUndoing}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#444] bg-[#f5f5f5] px-4 py-3 text-[13px] font-mono font-bold text-[#0a0a0a] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[#333] disabled:text-[#777] disabled:border-[#444]"
            >
              {isApplying ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Applying...
                </>
              ) : (
                <><Sparkles size={14} /> Apply Changes <span className="ml-1">→</span></>
              )}
            </button>
            
            <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] font-mono text-[#777]">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              Review changes in the preview before applying.
            </div>
          </div>
        ) : null}

        {!(isReady || isActiveRefinement || isPendingChanges || isFailed) && (
          <button
            type="button"
            onClick={onGenerate}
            disabled={!currentProject || startingRuntime}
            className="w-full flex items-center justify-center rounded-lg border border-[#444] bg-transparent px-4 py-3 text-[13px] font-mono font-medium text-[#f5f5f5] transition-colors hover:bg-[#111] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
            </svg>
            {startingRuntime ? "Starting Runtime..." : "Generate Project"}
          </button>
        )}
      </div>
    </div>
  );
};

export default BuilderAssistant;
