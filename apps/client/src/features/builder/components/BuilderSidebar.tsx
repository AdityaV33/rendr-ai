import { useState } from "react";
import BuilderAssistant from "./BuilderAssistant";
import BuilderPreview from "./BuilderPreview";
import { useBuilderStore } from "@/features/builder/store/builder.store";

interface BuilderSidebarProps {
  onGenerate: () => void;
}

const BuilderSidebar = ({ onGenerate }: BuilderSidebarProps) => {
  const [hasOpenedPreview, setHasOpenedPreview] = useState(false);
  
  const currentProject = useBuilderStore((state) => state.currentProject);
  const activeTab = useBuilderStore((state) => state.sidebarTab);
  const setActiveTab = useBuilderStore((state) => state.setSidebarTab);
  const isApplying = useBuilderStore((state) => state.isApplying);
  const isUndoing = useBuilderStore((state) => state.isUndoing);
  const isActiveRefinement = Boolean(
    currentProject && 
    ["refining", "building", "repairing"].includes(currentProject.status) && 
    currentProject.historyCount !== undefined
  );

  const handleTabChange = (tab: "assistant" | "preview") => {
    setActiveTab(tab);
    if (tab === "preview") {
      setHasOpenedPreview(true);
    }
  };

  return (
    <div className="flex h-full flex-col bg-[#0a0a0a]">
      <div className="relative flex border-b border-dotted border-[#444] pt-4 px-2">
        {/* Top left decor */}
        <div className="absolute top-1 left-2 text-[8px] text-[#555] font-mono leading-none">. .</div>
        {/* Top right decor */}
        <div className="absolute top-1 right-2 text-[8px] text-[#555] font-mono leading-none">. .</div>

        <button
          onClick={() => handleTabChange("assistant")}
          className={`flex-1 px-4 py-2 text-[13px] font-mono transition-colors border-b ${
            activeTab === "assistant"
              ? "border-[#f5f5f5] text-[#f5f5f5] font-bold"
              : "border-transparent text-[#a0a0a0] hover:text-[#f5f5f5]"
          }`}
        >
          AI Refinement
        </button>
        <button
          onClick={() => handleTabChange("preview")}
          disabled={isActiveRefinement || isApplying || isUndoing}
          className={`flex-1 px-4 py-2 text-[13px] font-mono transition-colors border-b ${
            activeTab === "preview"
              ? "border-[#f5f5f5] text-[#f5f5f5] font-bold"
              : "border-transparent text-[#a0a0a0] hover:text-[#f5f5f5] disabled:opacity-50 disabled:cursor-not-allowed"
          }`}
        >
          Preview
        </button>
      </div>

      <div className={`flex-1 overflow-hidden ${activeTab === "assistant" ? "block" : "hidden"}`}>
        <BuilderAssistant onGenerate={onGenerate} />
      </div>

      {hasOpenedPreview && (
        <div className={`flex-1 overflow-hidden ${activeTab === "preview" ? "block" : "hidden"}`}>
          <BuilderPreview />
        </div>
      )}
    </div>
  );
};

export default BuilderSidebar;
