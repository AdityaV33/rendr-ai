import React from "react";
import { BackgroundGrid } from "./BackgroundGrid";

interface LandingContainerProps {
  children: React.ReactNode;
}

export const LandingContainer: React.FC<LandingContainerProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-app-bg text-app-text relative overflow-x-hidden font-sans selection:bg-app-text selection:text-app-bg">
      <BackgroundGrid />
      
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col items-center">
        {children}
      </main>
    </div>
  );
};
