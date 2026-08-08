import { useNavigate } from "react-router-dom";

import { useAuthStore } from "@/features/auth/store/auth.store";

const PixelLogout = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
    <polyline points="16 17 21 12 16 7"></polyline>
    <line x1="21" y1="12" x2="9" y2="12"></line>
  </svg>
);

const DashboardHeader = () => {
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = async () => {
    await logout();
    // Redirect is handled by AppRouter automatically since isAuthenticated becomes false
  };

  return (
    <header className="flex items-center justify-between py-6 px-8 border-b border-[#f5f5f5] bg-transparent">
      {/* Left: Logo and Title */}
      <div className="flex items-center space-x-6">
        <div className="flex-shrink-0 w-16 h-16">
          <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
            <circle cx="120" cy="120" r="110" stroke="#F5F5F5" strokeWidth="8" />
            <circle cx="120" cy="120" r="75" stroke="#F5F5F5" strokeWidth="8" />
            <circle cx="120" cy="120" r="40" stroke="#F5F5F5" strokeWidth="8" />
          </svg>
        </div>
        <div className="flex flex-col">
          <h1 className="font-mono text-4xl font-bold tracking-tight text-[#f5f5f5] mb-1">
            RendrAI
          </h1>
          <p className="font-mono text-[#a0a0a0] text-sm">Describe it. We'll build it.</p>
        </div>
      </div>

      {/* Right: User and Logout */}
      <div className="flex items-center space-x-6">

        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 border border-[#f5f5f5] px-4 py-2 text-[#f5f5f5] hover:bg-[#1a1a1a] transition-colors cursor-pointer"
        >
          <PixelLogout size={16} />
          <span className="font-mono text-sm font-bold tracking-wider">Logout</span>
        </button>
      </div>
    </header>
  );
};

export default DashboardHeader;