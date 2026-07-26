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

  if (!open) {
    return null;
  }

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    await onCreate(name, prompt);

    setName("");
    setPrompt("");

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="w-full max-w-xl rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <h2 className="text-2xl font-semibold">
          Create Project
        </h2>

        <p className="mt-2 text-neutral-400">
          Describe the application you want RendrAI to build.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-5"
        >
          <div>
            <label className="mb-2 block text-sm">
              Project Name
            </label>

            <input
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              required
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-3 outline-none"
              placeholder="My AI Dashboard"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm">
              Project Prompt
            </label>

            <textarea
              value={prompt}
              onChange={(event) =>
                setPrompt(event.target.value)
              }
              required
              rows={6}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-4 py-3 outline-none"
              placeholder="Build a modern SaaS landing page with pricing, testimonials and authentication..."
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-neutral-700 px-4 py-2"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-white px-4 py-2 font-medium text-black disabled:opacity-50"
            >
              {loading
                ? "Creating..."
                : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectDialog;