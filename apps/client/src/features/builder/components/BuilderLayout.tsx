import { useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { useBuilderStore } from "@/features/builder/store/builder.store";

interface BuilderLayoutProps {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
}

const BuilderLayout = ({
  left,
  center,
  right,
}: BuilderLayoutProps) => {
  const sidebarTab = useBuilderStore((state) => state.sidebarTab);
  const [rightWidth, setRightWidth] = useState(350);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = (_e: React.MouseEvent) => {
    if (sidebarTab !== "preview") return;
    setIsDragging(true);
    document.body.style.cursor = "col-resize";
  };

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    document.body.style.cursor = "default";
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const newWidth = window.innerWidth - e.clientX;
    // Keep width within sensible bounds
    if (newWidth >= 250 && newWidth <= window.innerWidth - 400) {
      setRightWidth(newWidth);
    }
  }, [isDragging]);

  useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      // If the mouse leaves the document window, cancel the drag
      if (e.clientY <= 0 || e.clientX <= 0 || (e.clientX >= window.innerWidth || e.clientY >= window.innerHeight)) {
        handleMouseUp();
      }
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("mouseleave", handleMouseLeave);
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mouseleave", handleMouseLeave);
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const effectiveRightWidth = sidebarTab === "preview" ? rightWidth : 350;

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <aside className={`w-[280px] shrink-0 border-r border-[#333] bg-[#0a0a0a] overflow-hidden ${isDragging ? "pointer-events-none select-none" : ""}`}>
        {left}
      </aside>

      <main className={`flex-1 overflow-hidden bg-[#050505] ${isDragging ? "pointer-events-none select-none" : ""}`}>
        {center}
      </main>

      {sidebarTab === "preview" ? (
        <div 
          className="w-1 cursor-col-resize hover:bg-[#555] active:bg-[#777] bg-[#333] transition-colors z-50 shrink-0"
          onMouseDown={handleMouseDown}
          onDoubleClick={() => setRightWidth(350)}
          title="Drag to resize, double-click to reset"
        />
      ) : (
        <div className="w-[1px] bg-[#333] shrink-0" />
      )}

      <aside 
        style={{ width: effectiveRightWidth }}
        className={`bg-[#0a0a0a] overflow-hidden shrink-0 flex flex-col ${isDragging ? "pointer-events-none select-none" : ""}`}
      >
        {right}
      </aside>
    </div>
  );
};

export default BuilderLayout;