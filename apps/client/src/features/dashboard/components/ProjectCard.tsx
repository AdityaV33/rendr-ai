import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDashboardStore } from "../store/dashboard.store";
import type { Project } from "../types/dashboard";

interface ProjectCardProps {
  project: Project;
}

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return "just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
};

const TrashIcon = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
);

const ProjectCard = ({ project }: ProjectCardProps) => {
  const navigate = useNavigate();
  const deleteProject = useDashboardStore((state) => state.deleteProject);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    try {
      await deleteProject(project.id);
    } catch {
      setIsDeleting(false);
    }
  };

  return (
    <div 
      onClick={() => {
        if (!['generating', 'building', 'planning'].includes(project.status)) {
          navigate(`/builder/${project.id}`);
        }
      }}
      title={['generating', 'building', 'planning'].includes(project.status) ? "Project is still being generated." : undefined}
      className={`group flex flex-col bg-[#0a0a0a] border border-[#f5f5f5] ${['generating', 'building', 'planning'].includes(project.status) ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:border-[#a0a0a0]'} transition-colors`}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#f5f5f5]">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full border border-[#f5f5f5]" />
          <div className="w-2.5 h-2.5 rounded-full border border-[#f5f5f5]" />
          <div className="w-2.5 h-2.5 rounded-full border border-[#f5f5f5]" />
        </div>
        <span className="font-mono text-sm text-[#f5f5f5]">
          {project.updatedAt ? formatTimeAgo(project.updatedAt) : formatTimeAgo(project.createdAt)}
        </span>
      </div>

      <div className="p-5 flex flex-col flex-1">
        {/* Title & Description */}
        <div className="flex-1">
          <h2 className="font-mono text-2xl font-bold tracking-tight text-[#f5f5f5] mb-4">
            {project.name}
          </h2>
          <p className="font-mono text-sm text-[#f5f5f5] leading-relaxed mb-6 whitespace-pre-wrap line-clamp-3">
            {project.prompt}
          </p>
        </div>

        {/* Separator */}
        <div className="h-px w-full border-b border-dashed border-[#555] mb-5" />

        {/* Footer Actions */}
        <div className="flex items-center justify-between">
          {/* Status Badge */}
          <AnimatePresence mode="popLayout">
            {project.status === 'ready' && (
              <motion.div
                key="ready"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex items-center space-x-2 border border-[#22c55e]/30 px-3 py-1.5 bg-[#22c55e]/5"
              >
                <div className="w-2 h-2 rounded-full bg-[#4ade80]" />
                <span className="font-mono text-sm text-[#4ade80]">Complete</span>
              </motion.div>
            )}
            
            {project.status === 'failed' && (
              <motion.div
                key="failed"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex items-center space-x-2 border border-[#ef4444]/30 px-3 py-1.5 bg-[#ef4444]/5"
              >
                <div className="w-2 h-2 rounded-full bg-[#f87171]" />
                <span className="font-mono text-sm text-[#f87171]">Build Failed</span>
              </motion.div>
            )}

            {project.status === 'draft' && (
              <motion.div
                key="draft"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex items-center space-x-2 border border-[#a0a0a0]/30 px-3 py-1.5 bg-[#a0a0a0]/5"
              >
                <div className="w-2 h-2 rounded-full bg-[#a0a0a0]" />
                <span className="font-mono text-sm text-[#a0a0a0]">Draft</span>
              </motion.div>
            )}

            {project.status === 'planning' && (
              <motion.div
                key="planning"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex items-center space-x-2 border border-[#3b82f6]/30 px-3 py-1.5 bg-[#3b82f6]/5"
              >
                <div className="w-2 h-2 rounded-full bg-[#60a5fa] animate-pulse" />
                <span className="font-mono text-sm text-[#60a5fa]">{project.pipelineStage || 'Planning...'}</span>
              </motion.div>
            )}

            {['generating', 'building'].includes(project.status) && (
              <motion.div
                key="generating"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex flex-col space-y-2 flex-1 mr-4"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-[#60a5fa] animate-pulse" />
                  <span className="font-mono text-sm text-[#60a5fa]">
                    {project.pipelineStage || 'Generating...'}
                  </span>
                </div>
                <div className="font-mono text-xs text-[#a0a0a0]">
                  {(() => {
                    const stage = project.pipelineStage;
                    if (stage === "Planning...") return "████░░░░░░ 10%";
                    if (stage === "Designing Architecture...") return "█████░░░░░ 20%";
                    if (stage === "Generating Files...") return "███████░░░ 55%";
                    if (stage === "Installing Dependencies...") return "████████░░ 70%";
                    if (stage === "Building Application...") return "█████████░ 85%";
                    if (stage === "Starting Preview...") return "█████████░ 92%";
                    if (stage === "Verifying Preview...") return "██████████ 98%";
                    if (stage === "Repairing...") return "█████████░ 85%";
                    return "████░░░░░░ 10%";
                  })()}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Delete Button */}
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center justify-center border border-[#555] p-2 text-[#a0a0a0] hover:bg-[#1a1a1a] hover:text-[#f5f5f5] hover:border-[#f5f5f5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Delete Project"
          >
            {isDeleting ? (
               <svg className="animate-spin h-5 w-5 text-[#f5f5f5]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
            ) : (
               <TrashIcon size={20} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;