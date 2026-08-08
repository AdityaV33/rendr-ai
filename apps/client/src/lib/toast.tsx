import { toast as hotToast, type Toast } from "react-hot-toast";
import { motion } from "framer-motion";

type ToastType = "success" | "error" | "warning" | "info";

const createToast = (t: Toast, title: string, message: string, type: ToastType) => {
  const getBadge = () => {
    switch (type) {
      case 'success': return <span className="text-[#4ade80] font-mono text-[11px]">[OK]</span>;
      case 'error': return <span className="text-[#f87171] font-mono text-[11px]">[!]</span>;
      case 'warning': return <span className="text-[#facc15] font-mono text-[11px]">[!]</span>;
      case 'info': return <span className="text-[#60a5fa] font-mono text-[11px]">[i]</span>;
    }
  };

  return (
    <motion.div
      initial={false}
      animate={{ 
        opacity: t.visible ? 1 : 0, 
        y: t.visible ? 0 : 20,
      }}
      transition={{ 
        duration: t.visible ? 0.2 : 0.15, 
        ease: "easeOut" 
      }}
      className="max-w-sm w-full bg-[#0a0a0a] border border-[#f5f5f5] shadow-2xl pointer-events-auto flex flex-col p-4"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-mono text-sm font-bold tracking-wider text-[#f5f5f5] uppercase">
          {title}
        </h3>
        {getBadge()}
      </div>
      <p className="font-mono text-sm text-[#a0a0a0] leading-relaxed whitespace-pre-wrap">
        {message}
      </p>
    </motion.div>
  );
};

export const toast = {
  success: (title: string, message?: string) =>
    hotToast.custom((t) => createToast(t, message ? title : "SUCCESS", message || title, "success"), { duration: 3000 }),
  error: (title: string, message?: string) =>
    hotToast.custom((t) => createToast(t, message ? title : "ERROR", message || title, "error"), { duration: 4000 }),
  warning: (title: string, message?: string) =>
    hotToast.custom((t) => createToast(t, message ? title : "WARNING", message || title, "warning"), { duration: 4000 }),
  info: (title: string, message?: string) =>
    hotToast.custom((t) => createToast(t, message ? title : "INFO", message || title, "info"), { duration: 3000 }),
};
