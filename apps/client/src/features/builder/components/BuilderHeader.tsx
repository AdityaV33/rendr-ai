import type { Project } from "@/features/builder/types/project";

interface BuilderHeaderProps {
  project: Project;
}

const BuilderHeader = ({
  project,
}: BuilderHeaderProps) => {
  return (
    <header className="flex h-16 items-center justify-between border-b border-neutral-800 px-6">
      <div>
        <h1 className="text-xl font-semibold">
          {project.name}
        </h1>

        <p className="text-sm text-neutral-400">
          {project.framework} • {project.status}
        </p>
      </div>

      <button
        className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-neutral-200"
      >
        Generate
      </button>
    </header>
  );
};

export default BuilderHeader;