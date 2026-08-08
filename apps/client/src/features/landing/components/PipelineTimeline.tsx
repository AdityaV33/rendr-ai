import React from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const pipelineStages = [
  "Prompt",
  "Planner",
  "Architect",
  "Generator",
  "Validator",
  "Repair",
  "Preview"
];

export const PipelineTimeline: React.FC = () => {
  return (
    <section className="w-full py-16 px-4 md:px-8 border-y border-app-border bg-app-panel/30 overflow-hidden">
      <div className="max-w-6xl mx-auto flex flex-col items-center">
        <h2 className="font-mono text-sm uppercase tracking-widest text-app-muted mb-12">
          Autonomous Generation Pipeline
        </h2>
        
        <div className="w-full flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
          {pipelineStages.map((stage, index) => (
            <React.Fragment key={stage}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="flex items-center justify-center py-2 px-4 bg-app-bg border border-app-border rounded font-mono text-sm text-app-text whitespace-nowrap"
              >
                {stage}
              </motion.div>
              
              {index < pipelineStages.length - 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 + 0.1 }}
                  className="hidden md:flex text-app-border"
                >
                  <ArrowRight size={16} />
                </motion.div>
              )}
              {/* Vertical arrow for mobile */}
              {index < pipelineStages.length - 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 + 0.1 }}
                  className="md:hidden text-app-border"
                >
                  <ArrowRight size={16} className="rotate-90" />
                </motion.div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
};
