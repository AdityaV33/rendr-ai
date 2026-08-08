import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

import CreateProjectDialog from "../components/CreateProjectDialog";
import DashboardHeader from "../components/DashboardHeader";
import ProjectGrid from "../components/ProjectGrid";
import { useDashboardStore } from "../store/dashboard.store";
import { BackgroundGrid } from "@/features/landing/components/BackgroundGrid";

const PixelPlus = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const PixelFolder = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" shapeRendering="crispEdges" className={className}>
    <path fillRule="evenodd" clipRule="evenodd" d="M2 4h8v2h12v14H2V4zm2 4V6h6v2h10v10H4V8z"></path>
  </svg>
);

const PixelCodeBox = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <polyline points="8 10 12 14 8 18"></polyline>
    <line x1="14" y1="18" x2="18" y2="18"></line>
  </svg>
);

const PixelClock = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const PixelCodeBrackets = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="8 6 2 12 8 18"></polyline>
    <polyline points="16 18 22 12 16 6"></polyline>
  </svg>
);

const formatTimeAgo = (dateString?: string) => {
  if (!dateString) return "Never";
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

const DashboardPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const {
    projects,
    loading,
    fetchProjects,
    createProject,
  } = useDashboardStore();

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  const prevProjectsRef = useRef(projects);

  useEffect(() => {
    // Check for transitions
    projects.forEach(project => {
      const prev = prevProjectsRef.current.find(p => p.id === project.id);
      if (prev && prev.status === "generating" && project.status === "ready") {
        toast.success(
          <div className="flex flex-col">
            <span className="font-mono font-bold tracking-tight">✓ Application ready!</span>
            <span className="font-mono text-sm text-[#a0a0a0] mt-1">Your preview has finished building.</span>
          </div>, 
          { duration: 5000, style: { background: '#050505', color: '#f5f5f5', border: '1px solid #333' }, icon: null }
        );
      }
      
      if (prev && prev.status === "generating" && project.status === "failed") {
        toast.error(
          <div className="flex flex-col">
            <span className="font-mono font-bold tracking-tight">✕ Generation failed.</span>
            <span className="font-mono text-sm text-[#a0a0a0] mt-1">We could not build your application.</span>
          </div>, 
          { duration: 5000, style: { background: '#050505', color: '#f5f5f5', border: '1px solid #333' }, icon: null }
        );
      }
    });

    prevProjectsRef.current = projects;

    // Polling logic
    const isGenerating = projects.some(p => p.status === "generating");
    if (isGenerating) {
      const timer = setInterval(() => {
        void fetchProjects();
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [projects, fetchProjects]);

  const handleCreateProject = async (
    name: string,
    prompt: string,
  ) => {
    await createProject({
      name,
      prompt,
    });
    setDialogOpen(false);
    
    const currentProjects = useDashboardStore.getState().projects;
    const stillGenerating = currentProjects.some(p => p.status === "generating");
    if (stillGenerating) {
      toast(
        <div className="flex flex-col gap-2">
          <span className="font-mono font-bold tracking-tight">⌛ Building your application...</span>
          <span className="font-mono text-sm text-[#a0a0a0]">This usually takes around 2 minutes.<br/>We'll let you know when it's ready.</span>
        </div>,
        { id: "building-toast", duration: 8000, style: { background: '#050505', color: '#f5f5f5', border: '1px solid #333' } }
      );
    }
  };

  return (
    <div className="min-h-screen bg-app-bg text-[#f5f5f5] relative overflow-x-hidden">
      <BackgroundGrid />
      
      <main className="relative z-10 flex flex-col min-h-screen">
        <DashboardHeader />
        
        <section className="flex-1 max-w-[1400px] w-full mx-auto p-8">
        {/* Subheader */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <h2 className="font-mono text-2xl font-bold tracking-tight text-[#f5f5f5]">
            Your Stats
          </h2>
          
          <button
            onClick={() => setDialogOpen(true)}
            className="flex items-center space-x-3 border border-[#f5f5f5] px-5 py-2.5 text-[#f5f5f5] hover:bg-[#1a1a1a] transition-colors cursor-pointer"
          >
            <PixelPlus size={18} />
            <span className="font-mono text-sm font-bold tracking-wider">Create Project</span>
          </button>
        </div>

        {/* Stats Bar */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {/* Projects */}
          <div className="flex items-center space-x-4 border border-[#333] bg-[#0a0a0a]/50 p-4">
            <PixelFolder size={24} className="text-[#a0a0a0]" />
            <div className="flex flex-col">
              <span className="font-mono text-xs text-[#888]">Projects</span>
              <span className="font-mono text-xl font-bold text-[#f5f5f5]">{projects.length}</span>
            </div>
          </div>
          
          {/* Total Files */}
          <div className="flex items-center space-x-4 border border-[#333] bg-[#0a0a0a]/50 p-4">
            <PixelCodeBox size={24} className="text-[#a0a0a0]" />
            <div className="flex flex-col">
              <span className="font-mono text-xs text-[#888]">Generated Files</span>
              <span className="font-mono text-xl font-bold text-[#f5f5f5]">
                {projects.reduce((acc, p) => acc + (p.files?.length || 0), 0)}
              </span>
            </div>
          </div>
          
          {/* Last Activity */}
          <div className="flex items-center space-x-4 border border-[#333] bg-[#0a0a0a]/50 p-4">
            <PixelClock size={24} className="text-[#a0a0a0]" />
            <div className="flex flex-col">
              <span className="font-mono text-xs text-[#888]">Last Activity</span>
              <span className="font-mono text-xl font-bold text-[#f5f5f5]">
                {projects.length > 0 
                  ? formatTimeAgo(projects[0]?.updatedAt || projects[0]?.createdAt) 
                  : "Never"}
              </span>
            </div>
          </div>
          
          {/* Ready Projects */}
          <div className="flex items-center space-x-4 border border-[#333] bg-[#0a0a0a]/50 p-4">
            <PixelCodeBrackets size={24} className="text-[#a0a0a0]" />
            <div className="flex flex-col">
              <span className="font-mono text-xs text-[#888]">Successful Builds</span>
              <span className="font-mono text-xl font-bold text-[#f5f5f5]">
                {projects.filter(p => p.status === 'ready').length}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Separator */}
        <div className="h-px w-full border-b border-dashed border-[#555] mb-8 mt-4" />

        <h2 className="font-mono text-2xl font-bold tracking-tight text-[#f5f5f5] mb-6">
          Your Projects
        </h2>

        {/* Grid */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <p className="font-mono text-[#a0a0a0] animate-pulse">
              Loading projects...
            </p>
          </div>
        ) : projects.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="w-full flex flex-col items-center justify-center py-24 border border-dashed border-[#555] bg-[#0a0a0a]/30"
          >
            <PixelFolder size={48} className="text-[#555] mb-6" />
            <h3 className="font-mono text-2xl font-bold tracking-tight text-[#f5f5f5] mb-3">No projects yet.</h3>
            <p className="font-mono text-[#a0a0a0] text-center mb-8 leading-relaxed">
              Your first frontend starts with a prompt.<br/>We'll build the rest.
            </p>
            <button
              onClick={() => setDialogOpen(true)}
              className="flex items-center space-x-3 bg-[#f5f5f5] text-black px-6 py-3 hover:bg-[#e0e0e0] transition-colors cursor-pointer"
            >
              <PixelPlus size={18} />
              <span className="font-mono text-sm font-bold tracking-wider">Create Project</span>
            </button>
          </motion.div>
        ) : (
          <ProjectGrid projects={projects} />
        )}
      </section>

      <CreateProjectDialog
        open={dialogOpen}
        loading={loading}
        onClose={() => setDialogOpen(false)}
        onCreate={handleCreateProject}
      />
    </main>
    </div>
  );
};

export default DashboardPage;