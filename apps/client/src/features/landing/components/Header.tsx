import React from "react";
import { PixelWebcam, GithubIcon } from "./PixelIcons";

export const Header: React.FC = () => {
  return (
    <header className="flex items-center justify-between px-4 pb-2 pt-1 relative text-[#888]">
      {/* Center Laptop Webcam */}
      <div className="absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center space-x-1.5">
        <PixelWebcam size={10} />
        {/* Faint LED indicator */}
        <div className="w-[3px] h-[3px] rounded-full bg-white/15"></div>
      </div>

      {/* Left section */}
      <div className="flex items-center space-x-3">
        {/* Logo */}
        <div className="flex items-center justify-center w-6 h-6">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="#F5F5F5" strokeWidth="2" />
            <circle cx="12" cy="12" r="6" stroke="#F5F5F5" strokeWidth="2" />
            <circle cx="12" cy="12" r="2" stroke="#F5F5F5" strokeWidth="2" />
          </svg>
        </div>
        <span className="font-mono font-medium text-lg tracking-tight">RendrAI</span>
      </div>

      {/* Right section */}
      <div className="flex items-center space-x-6">
        <a 
          href="https://github.com/AdityaV33" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center space-x-2 font-mono text-sm text-gray-500 hover:text-[#f5f5f5] transition-colors cursor-pointer"
        >
          <GithubIcon size={14} />
          <span>github.com/AdityaV33</span>
        </a>

      </div>
    </header>
  );
};
