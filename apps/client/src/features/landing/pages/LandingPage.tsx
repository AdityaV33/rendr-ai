import React from "react";
import { LandingContainer } from "../components/LandingContainer";
import { Header } from "../components/Header";
import { Hero } from "../components/Hero";
import { Features } from "../components/Features";
import { Footer } from "../components/Footer";

const LandingPage: React.FC = () => {
  return (
    <LandingContainer>
      <div className="flex flex-col items-center w-full">
        {/* Monitor Bezel */}
        <div className="w-full max-w-6xl bg-[#050505] p-3 md:p-5 rounded-[2rem] border border-[#222] shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col relative ring-1 ring-white/5">
          <Header />
          {/* Inner Screen */}
          <div className="w-full bg-app-bg/80 backdrop-blur-md border border-[#1a1a1a] rounded-2xl overflow-hidden flex flex-col relative min-h-[600px] flex items-center justify-center">
            <Hero />
          </div>
        </div>
        
        {/* Monitor Stand */}
        <div className="w-32 h-16 bg-[#050505] border-l border-r border-[#222] shadow-inner flex justify-center items-center">
          <div className="w-8 h-8 rounded-full border border-white/5 bg-[#0a0a0a]"></div>
        </div>
        <div className="w-64 h-4 bg-[#050505] rounded-t-lg border-t border-l border-r border-[#222] shadow-[0_10px_20px_rgba(0,0,0,0.5)]"></div>
      </div>

      <div className="w-full mt-4">
        <Features />
      </div>
      <div className="w-full">
        <Footer />
      </div>
    </LandingContainer>
  );
};

export default LandingPage;
