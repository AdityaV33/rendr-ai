import React from "react";
import { PixelTerminal } from "./PixelIcons";

export const Footer: React.FC = () => {
  return (
    <footer className="w-full mt-auto pb-8 pt-8">
      <div className="w-full h-px bg-[#2a2a2a] border-t border-dashed border-[#2a2a2a] mb-8" />
      
      <div className="px-6 flex flex-col md:flex-row items-center justify-between text-xs font-mono text-gray-500 gap-6">
        
        {/* Left: Branding & Copyright */}
        <div className="flex items-center space-x-4">
          <div className="flex flex-col space-y-1">
            <span>@ 2026 RendrAI</span>
          </div>
        </div>
        
        {/* Center: Quote */}
        <div className="flex flex-col text-center">
          <span className="text-[#f5f5f5] mb-2">"The best way to predict the future is to build it."</span>
          <span>— RendrAI</span>
        </div>
        
        {/* Right: Links */}
        <div className="flex items-center space-x-4 text-gray-500 hover:text-[#f5f5f5] transition-colors">
          <a href="https://github.com/AdityaV33" target="_blank" rel="noopener noreferrer" className="cursor-pointer">
            Designed & Developed by Aditya Verma
          </a>
        </div>

      </div>
    </footer>
  );
};
