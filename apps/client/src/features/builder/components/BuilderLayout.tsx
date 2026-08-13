import type { ReactNode } from "react";

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
  return (
    <div className="grid h-screen grid-cols-[280px_1fr_350px]">
      <aside className="border-r border-[#333] bg-[#0a0a0a] overflow-hidden">
        {left}
      </aside>

      <main className="overflow-hidden bg-[#050505]">
        {center}
      </main>

      <aside className="border-l border-[#333] bg-[#0a0a0a] overflow-hidden">
        {right}
      </aside>
    </div>
  );
};

export default BuilderLayout;