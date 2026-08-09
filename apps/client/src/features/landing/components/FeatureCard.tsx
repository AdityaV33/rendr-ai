import React from "react";
import { motion } from "framer-motion";
import { PixelCircle, PixelX } from "./PixelIcons";

export interface Feature {
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
}

interface FeatureCardProps {
  feature: Feature;
  index: number;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({ feature, index }) => {
  const Icon = feature.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="group relative p-6 bg-[#0a0a0a] border border-[#2a2a2a] rounded flex flex-col items-center text-center transition-all duration-300 hover:border-gray-500 hover:-translate-y-1 overflow-hidden"
    >
      {/* Decorative window header inside card */}
      <div className="absolute top-0 left-0 right-0 h-7 border-b border-[#2a2a2a] bg-[#0f0f0f] flex items-center justify-between px-2">
        <div className="flex items-center space-x-1.5">
          <PixelCircle size={6} className="text-[#f5f5f5]" />
          <PixelCircle size={6} className="text-[#f5f5f5]" />
          <PixelCircle size={6} className="text-[#f5f5f5]" />
        </div>
        <div className="flex items-center space-x-1.5">
          <div className="w-1.5 h-0.5 bg-[#f5f5f5]" />
          <PixelX size={6} className="text-[#f5f5f5]" />
        </div>
      </div>
      
      <div className="mt-8 mb-4">
        <Icon size={32} strokeWidth={1} className="text-[#f5f5f5]" />
      </div>
      
      <h3 className="text-sm font-mono font-medium text-app-text mb-3">
        {feature.title}
      </h3>
      
      <p className="text-sm text-app-muted leading-relaxed font-sans">
        {feature.description}
      </p>
    </motion.div>
  );
};
