import { useState } from "react";

interface CreateProjectDialogProps {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onCreate: (
    name: string,
    prompt: string,
  ) => Promise<void>;
}

const CreateProjectDialog = ({
  open,
  loading,
  onClose,
  onCreate,
}: CreateProjectDialogProps) => {
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [nameError, setNameError] = useState("");
  const [promptError, setPromptError] = useState("");

  if (!open) {
    return null;
  }

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setNameError("");
    setPromptError("");

    let hasError = false;
    if (!name.trim()) {
      setNameError("Project name is required.");
      hasError = true;
    }
    if (!prompt.trim()) {
      setPromptError("Project prompt is required.");
      hasError = true;
    }

    if (hasError) return;

    await onCreate(name, prompt);

    setName("");
    setPrompt("");
    setNameError("");
    setPromptError("");

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-xl border-[2px] border-[#333] bg-[#050505] p-8 shadow-2xl relative">
        {/* Decorative corner accents */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#f5f5f5]" />
        <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#f5f5f5]" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[#f5f5f5]" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#f5f5f5]" />

        <h2 className="font-mono text-2xl font-bold tracking-tight text-[#f5f5f5]">
          Create Project
        </h2>

        <p className="mt-2 font-mono text-base text-[#a0a0a0] mb-8">
          Describe your application. RendrAI will handle the rest.
        </p>

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
          noValidate
        >
          <div>
            <label className="mb-3 block font-mono text-sm font-bold text-[#888] uppercase tracking-wider">
              Project Name
            </label>

            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (nameError) setNameError("");
              }}
              className={`w-full bg-[#0a0a0a] border ${nameError ? 'border-red-500' : 'border-[#333] focus:border-[#f5f5f5]'} text-[#f5f5f5] px-4 py-3 font-mono text-base focus:outline-none transition-colors placeholder:text-[#333]`}
              placeholder="Expense Tracker"
            />
            {nameError && (
              <p className="mt-2 font-mono text-sm text-red-500">{nameError}</p>
            )}
          </div>

          <div>
            <label className="mb-3 block font-mono text-sm font-bold text-[#888] uppercase tracking-wider">
              Project Prompt
            </label>

            <textarea
              value={prompt}
              onChange={(event) => {
                setPrompt(event.target.value);
                if (promptError) setPromptError("");
              }}
              rows={6}
              className={`w-full bg-[#0a0a0a] border ${promptError ? 'border-red-500' : 'border-[#333] focus:border-[#f5f5f5]'} text-[#f5f5f5] px-4 py-3 font-mono text-base focus:outline-none transition-colors placeholder:text-[#333] resize-none`}
              placeholder="Build a modern expense tracker with authentication, charts, recurring transactions, and a responsive dashboard."
            />
            
            {promptError && (
              <p className="mt-2 font-mono text-sm text-red-500">{promptError}</p>
            )}

            <div className="mt-3 flex items-center space-x-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-[#f5f5f5]">
                <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
              </svg>
              <p className="font-mono text-sm text-[#a0a0a0]">
                Don't worry. We've seen worse prompts.
              </p>
            </div>
          </div>

          <div className="h-px w-full border-b border-dashed border-[#555] my-8" />

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="font-mono text-base font-bold border border-[#555] text-[#a0a0a0] px-6 py-2.5 hover:bg-[#1a1a1a] hover:text-[#f5f5f5] hover:border-[#f5f5f5] transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="font-mono text-base font-bold bg-[#f5f5f5] border border-[#f5f5f5] text-black px-6 py-2.5 hover:bg-[#e0e0e0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Project</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectDialog;