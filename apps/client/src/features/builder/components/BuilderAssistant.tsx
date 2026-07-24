import { useBuilderStore } from "@/features/builder/store/builder.store";

const BuilderAssistant = () => {
  const currentProject = useBuilderStore(
    (state) => state.currentProject,
  );

  const generating = useBuilderStore(
    (state) => state.generating,
  );

  const error = useBuilderStore((state) => state.error);

  const generate = useBuilderStore(
    (state) => state.generate,
  );

  const handleGenerate = async () => {
    if (!currentProject) return;

    await generate(currentProject._id);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-neutral-800 p-4">
        <h2 className="text-lg font-semibold">
          AI Assistant
        </h2>

        <p className="mt-1 text-sm text-neutral-400">
          This project will be generated using its saved prompt.
        </p>
      </div>

      <div className="flex-1 p-4">
        <textarea
          value={currentProject?.prompt ?? ""}
          readOnly
          className="h-full w-full resize-none rounded-lg border border-neutral-700 bg-neutral-900 p-3 text-sm text-neutral-300 outline-none"
        />
      </div>

      {error && (
        <p className="px-4 pb-2 text-sm text-red-500">
          {error}
        </p>
      )}

      <div className="border-t border-neutral-800 p-4">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!currentProject || generating}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-neutral-700"
        >
          {generating ? "Generating..." : "Generate Project"}
        </button>
      </div>
    </div>
  );
};

export default BuilderAssistant;