import type { ReactNode } from "react";

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {children}
    </div>
  );
};

export default AppLayout;

