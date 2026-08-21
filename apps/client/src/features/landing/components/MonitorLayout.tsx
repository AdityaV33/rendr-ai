import React, { type ReactNode } from "react";
import { useLocation, Link } from "react-router-dom";
import { LandingContainer } from "./LandingContainer";
import { Header } from "./Header";

interface MonitorLayoutProps {
  children: ReactNode;
  footer?: ReactNode;
}

export const MonitorLayout: React.FC<MonitorLayoutProps> = ({ children, footer }) => {
  const location = useLocation();
  const showBack = location.pathname !== "/";

  return (
    <LandingContainer>
      <div className="flex flex-col items-center w-full">
        {/* Monitor Bezel */}
        <div className="w-full max-w-6xl bg-[#050505] p-3 md:p-5 rounded-[2rem] border border-[#222] shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col relative ring-1 ring-white/5">
          <Header />
          {/* Inner Screen */}
          <div className="w-full bg-app-bg/80 backdrop-blur-md border border-[#1a1a1a] rounded-2xl overflow-hidden flex flex-col relative h-[750px] flex items-center justify-center">
            {showBack && (
              <Link to="/" className="absolute top-6 left-6 flex items-center space-x-2 font-mono text-sm text-[#888] hover:text-[#f5f5f5] transition-colors z-50 group">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" shapeRendering="crispEdges" className="group-hover:-translate-x-1 transition-transform">
                  <path d="M19 12H5 M12 19l-7-7 7-7" />
                </svg>
                <span>Back</span>
              </Link>
            )}
            {children}
          </div>
        </div>
        
        {/* Monitor Stand */}
        <div className="w-32 h-16 bg-[#050505] border-l border-r border-[#222] shadow-inner flex justify-center items-center">
          <div className="w-8 h-8 rounded-full border border-white/5 bg-[#0a0a0a]"></div>
        </div>
        <div className="w-64 h-4 bg-[#050505] rounded-t-lg border-t border-l border-r border-[#222] shadow-[0_10px_20px_rgba(0,0,0,0.5)]"></div>
      </div>

      {footer}
    </LandingContainer>
  );
};
