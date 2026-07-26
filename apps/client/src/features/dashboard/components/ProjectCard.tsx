import { useNavigate } from "react-router-dom";

import type { Project } from "../types/dashboard";

interface ProjectCardProps {
  project: Project;
}

const ProjectCard = ({
  project,
}: ProjectCardProps) => {
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 transition hover:border-neutral-600">
      <h2 className="text-lg font-semibold">
        {project.name}
      </h2>

      <p className="mt-2 line-clamp-2 text-sm text-neutral-400">
        {project.prompt}
      </p>

      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs text-neutral-500">
          <p>{project.framework}</p>

          <p>{project.status}</p>
        </div>

        <button
          onClick={() =>
            navigate(`/builder/${project.id}`)
          }
          className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-black transition hover:bg-neutral-200"
        >
          Open Builder
        </button>
      </div>
    </div>
  );
};

export default ProjectCard;