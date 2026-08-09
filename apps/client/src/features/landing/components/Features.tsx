import React from "react";
import { FeatureCard, type Feature } from "./FeatureCard";
import { 
  PixelAppWindow, 
  PixelCode, 
  PixelTerminal,
  PixelEye, 
  PixelPackage 
} from "./PixelIcons";

const featuresData: Feature[] = [
  {
    title: "Architecture Planning",
    description: "Plan your application before code generation.",
    icon: PixelAppWindow
  },
  {
    title: "Multi-file Generation",
    description: "Generate production-ready React apps across multiple files.",
    icon: PixelCode
  },
  {
    title: "Automatic Repair",
    description: "Detect and repair build errors automatically.",
    icon: PixelTerminal
  },
  {
    title: "Live Preview",
    description: "Preview your application while you build and refine.",
    icon: PixelEye
  },
  {
    title: "Export Project",
    description: "Download a complete React project, ready to run locally.",
    icon: PixelPackage
  }
];

export const Features: React.FC = () => {
  return (
    <section className="py-24 px-4 max-w-7xl mx-auto border-t border-[#111] mt-8">
      <div className="flex items-center justify-center space-x-4 mb-12">
        <div className="hidden sm:block h-px w-24 bg-gradient-to-r from-transparent to-[#333]" />
        <div className="flex items-center space-x-3 text-xs font-mono tracking-widest text-[#a0a0a0]">
          <span className="hidden sm:inline-block">o o o</span>
          <span>Why choose RendrAI?</span>
          <span className="hidden sm:inline-block">o o o</span>
        </div>
        <div className="hidden sm:block h-px w-24 bg-gradient-to-l from-transparent to-[#333]" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {featuresData.map((feature, index) => (
          <FeatureCard 
            key={feature.title} 
            feature={feature} 
            index={index} 
          />
        ))}
      </div>
    </section>
  );
};
