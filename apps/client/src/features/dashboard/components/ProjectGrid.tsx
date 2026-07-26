import ProjectCard from "./ProjectCard";

import type { Project } from "../types/dashboard";

interface ProjectGridProps {
  projects: Project[];
}

const ProjectGrid = ({
  projects,
}: ProjectGridProps) => {
  if (projects.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-neutral-700">
        <div className="text-center">
          <h2 className="text-xl font-semibold">
            No Projects Yet
          </h2>

          <p className="mt-2 text-neutral-400">
            Create your first AI project to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
        />
      ))}
    </div>
  );
};

export default ProjectGrid;