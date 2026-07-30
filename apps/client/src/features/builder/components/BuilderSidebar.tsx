import { useState } from "react";
import BuilderAssistant from "./BuilderAssistant";
import BuilderPreview from "./BuilderPreview";

interface BuilderSidebarProps {
  onGenerate: () => void;
}

const BuilderSidebar = ({ onGenerate }: BuilderSidebarProps) => {
  const [activeTab, setActiveTab] = useState<"assistant" | "preview">("assistant");
  const [hasOpenedPreview, setHasOpenedPreview] = useState(false);

  const handleTabChange = (tab: "assistant" | "preview") => {
    setActiveTab(tab);
    if (tab === "preview") {
      setHasOpenedPreview(true);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex border-b border-neutral-800">
        <button
          onClick={() => handleTabChange("assistant")}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "assistant"
              ? "border-b-2 border-blue-500 text-white"
              : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
          }`}
        >
          AI Assistant
        </button>
        <button
          onClick={() => handleTabChange("preview")}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === "preview"
              ? "border-b-2 border-blue-500 text-white"
              : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
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
          <BuilderPreview onStartRuntime={onGenerate} />
        </div>
      )}
    </div>
  );
};

export default BuilderSidebar;
