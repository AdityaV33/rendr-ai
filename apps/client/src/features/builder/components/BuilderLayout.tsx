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
      <aside className="border-r border-neutral-800 bg-neutral-900">
        {left}
      </aside>

      <main className="overflow-hidden bg-neutral-950">
        {center}
      </main>

      <aside className="border-l border-neutral-800 bg-neutral-900">
        {right}
      </aside>
    </div>
  );
};

export default BuilderLayout;