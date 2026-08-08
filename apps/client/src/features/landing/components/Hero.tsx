import React from "react";
import { motion } from "framer-motion";
import { PixelCircle, PixelMinus, PixelX } from "./PixelIcons";
import { useNavigate } from "react-router-dom";

const PixelUser = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" shapeRendering="crispEdges" className={className}>
    <rect x="8" y="4" width="8" height="8" />
    <path d="M4 22 V 18 H 6 V 16 H 18 V 18 H 20 V 22" />
  </svg>
);

const PixelUserPlus = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" shapeRendering="crispEdges" className={className}>
    <rect x="6" y="4" width="8" height="8" />
    <path d="M2 22 V 18 H 4 V 16 H 16 V 18 H 18 V 22" />
    <path d="M20 7 V 13 M17 10 H 23" />
  </svg>
);

const PixelArrowRight = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" shapeRendering="crispEdges" className={className}>
    <rect x="4" y="11" width="10" height="2" />
    <rect x="14" y="7" width="2" height="2" />
    <rect x="16" y="9" width="2" height="2" />
    <rect x="18" y="11" width="2" height="2" />
    <rect x="16" y="13" width="2" height="2" />
    <rect x="14" y="15" width="2" height="2" />
  </svg>
);

export const Hero: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="flex flex-col items-center px-4 pt-16 pb-16 max-w-6xl mx-auto w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-[94%] my-8 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg shadow-2xl overflow-hidden relative flex flex-col"
      >
        {/* Window Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a] bg-[#0f0f0f] relative">
          <div className="flex items-center space-x-2">
            <PixelCircle className="text-[#f5f5f5]" />
            <PixelCircle className="text-[#f5f5f5]" />
            <PixelCircle className="text-[#f5f5f5]" />
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 font-mono text-xs text-white">
            RendrAI
          </div>
          <div className="flex items-center space-x-3">
            <PixelMinus className="text-[#f5f5f5]" />
            <PixelX className="text-[#f5f5f5]" />
          </div>
        </div>

        {/* Window Content */}
        <div className="relative flex items-center min-h-[450px] p-8 md:p-16 overflow-hidden">
          
          <div className="flex items-center space-x-8 md:space-x-10 lg:space-x-12 z-10">
            {/* Decorative Concentric Circles (Left) */}
            <div className="flex-shrink-0 w-48 md:w-64 opacity-80 pointer-events-none hidden md:block">
              <svg width="240" height="240" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
                <circle cx="120" cy="120" r="110" stroke="#F5F5F5" strokeWidth="6" />
                <circle cx="120" cy="120" r="80" stroke="#F5F5F5" strokeWidth="6" />
                <circle cx="120" cy="120" r="50" stroke="#F5F5F5" strokeWidth="6" />
                <circle cx="120" cy="120" r="20" stroke="#F5F5F5" strokeWidth="6" />
              </svg>
            </div>

            {/* Main Content (Right of circles) */}
            <div className="text-left flex-1 max-w-2xl">
              <h1 className="font-mono text-5xl md:text-6xl lg:text-7xl font-normal tracking-tight text-[#f5f5f5] leading-[1.1] mb-6">
                Ideas to frontends,<br />
                faster than ever.<span className="animate-pulse inline-block w-[0.5em] h-[0.9em] bg-[#f5f5f5] ml-1 translate-y-[2px]"></span>
              </h1>
              
              <div className="flex flex-col space-y-2 mb-10 text-[#a0a0a0] font-mono text-sm max-w-lg">
                <p>RendrAI is your AI frontend engineer.</p>
                <p>Describe your frontend. We'll build it.</p>
              </div>

              <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
                <button
                  onClick={() => navigate("/login")}
                  className="group flex items-center justify-center space-x-2 bg-[#f5f5f5] text-black px-8 py-3 font-mono text-lg hover:bg-[#a0a0a0] transition-all w-full sm:w-auto cursor-pointer"
                >
                  <PixelUser size={20} />
                  <span>Log in</span>
                  <PixelArrowRight size={20} className="group-hover:translate-x-1 transition-transform ml-2" />
                </button>

                <button
                  onClick={() => navigate("/register")}
                  className="group flex items-center justify-center space-x-2 bg-transparent border border-[#333] text-[#f5f5f5] px-8 py-3 font-mono text-lg hover:bg-[#1a1a1a] transition-all w-full sm:w-auto cursor-pointer"
                >
                  <PixelUserPlus size={20} />
                  <span>Sign up</span>
                  <PixelArrowRight size={20} className="group-hover:translate-x-1 transition-transform ml-2" />
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom Tab Text inside Window */}
        <div className="w-full text-gray-400 font-mono text-sm flex items-center space-x-2 px-8 pb-6 pt-2">
          <span className="text-[#f5f5f5]">{">"}</span>
          <span>Start building in seconds.</span>
        </div>
      </motion.div>
    </section>
  );
};
