import { useState } from "react";
import { motion } from "framer-motion";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../store/auth.store";
import { MonitorLayout } from "@/features/landing/components/MonitorLayout";
import { 
  PixelEnvelope, 
  PixelLock, 
  PixelEye, 
  PixelEyeClosed, 
  PixelTerminal,
  PixelMinimize,
  PixelClose,
} from "@/features/landing/components/PixelIcons";

const PixelArrowRight = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" shapeRendering="crispEdges" className={className}>
    <path d="M5 12h14 M12 5l7 7-7 7" />
  </svg>
);

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, loading, isAuthenticated, clearError, error } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearError();
    
    let hasError = false;
    
    if (!email.trim()) {
      setEmailError("Email is required.");
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Please enter a valid email address.");
      hasError = true;
    } else {
      setEmailError("");
    }

    if (!password) {
      setPasswordError("Password is required.");
      hasError = true;
    } else if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      hasError = true;
    } else {
      setPasswordError("");
    }

    if (hasError) return;

    try {
      const generatedName = email.split('@')[0] || "User";
      await register({ name: generatedName, email, password });
      navigate("/dashboard", { replace: true });
    } catch {
      // Error is handled via Toast by the auth store.
    }
  };

  return (
    <MonitorLayout>
      <main className="relative z-10 w-full max-w-lg mx-auto flex flex-col items-center">
        {/* Outer Window Chrome */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full bg-[#0a0a0a] border-[2px] border-[#333] rounded-sm overflow-hidden flex flex-col shadow-2xl"
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b-[2px] border-[#333]">
            <div className="flex items-center space-x-3 text-xs font-mono text-[#a0a0a0]">
              <div className="w-4 h-4 bg-[#f5f5f5] flex items-center justify-center text-black">
                <PixelTerminal size={12} className="text-black" />
              </div>
              <span>RendrAI -- Sign Up</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border border-[#555] flex items-center justify-center cursor-pointer hover:bg-[#333] transition-colors">
                <div className="w-2 h-px bg-[#888]" />
              </div>
              <div className="w-4 h-4 border border-[#555] flex items-center justify-center cursor-pointer hover:bg-[#333] transition-colors">
                <div className="w-2 h-2 border border-[#888]" />
              </div>
              <div className="w-4 h-4 border border-[#555] flex items-center justify-center cursor-pointer hover:bg-[#333] transition-colors text-[#888] text-[10px] leading-none">
                X
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Header Area */}
            <div className="flex items-center space-x-5 mb-4">
              {/* Concentric Circles Logo */}
              <div className="flex-shrink-0 w-[72px] h-[72px]">
                <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
                  <circle cx="120" cy="120" r="110" stroke="#F5F5F5" strokeWidth="6" />
                  <circle cx="120" cy="120" r="80" stroke="#F5F5F5" strokeWidth="6" />
                  <circle cx="120" cy="120" r="50" stroke="#F5F5F5" strokeWidth="6" />
                  <circle cx="120" cy="120" r="20" stroke="#F5F5F5" strokeWidth="6" />
                </svg>
              </div>
              <div className="flex flex-col">
                <h1 className="font-mono text-4xl font-normal tracking-tight text-[#f5f5f5] mb-1 flex items-baseline">
                  RendrAI<span className="animate-pulse inline-block w-[0.6em] h-[0.9em] bg-[#f5f5f5] ml-2"></span>
                </h1>
                <p className="font-mono text-[#a0a0a0] text-sm">Describe your frontend. We'll build it.</p>
              </div>
            </div>

            <div className="h-px w-full bg-[#2a2a2a] mb-5" />

            {/* Inner Window for Form */}
            <div className="border border-[#555] rounded-sm bg-transparent overflow-hidden mb-5">
              {/* Inner Top Bar */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-[#555]">
                <span className="font-mono text-xl text-[#f5f5f5]">Create an account</span>
                <div className="flex items-center space-x-4 text-[#888] pr-1">
                  <button className="cursor-pointer hover:text-[#f5f5f5] transition-colors flex items-center justify-center">
                    <PixelMinimize size={14} />
                  </button>
                  <button className="cursor-pointer hover:text-[#f5f5f5] transition-colors flex items-center justify-center">
                    <PixelClose size={14} />
                  </button>
                </div>
              </div>

              {/* Form Content */}
              <div className="p-5 sm:px-12 sm:py-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Email */}
                  <div className="space-y-1">
                    <label className="flex items-center space-x-4 font-mono text-base text-[#d4d4d4]">
                      <PixelEnvelope size={20} className="text-[#d4d4d4]" />
                      <span>Email address</span>
                    </label>
                    <div className="pl-9">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (emailError) setEmailError("");
                        }}
                        autoComplete="email"
                        autoCapitalize="none"
                        autoCorrect="off"
                        disabled={loading}
                        className={`w-full bg-[#1a1a1a] px-4 py-2 font-mono text-base text-[#f5f5f5] placeholder:text-[#666] focus:outline-none transition-colors duration-200 border ${
                          emailError 
                            ? "border-red-500" 
                            : "border-[#454545] focus:border-[#d8d8d8]"
                        } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                        placeholder="ada@example.com"
                      />
                      {emailError && (
                        <p className="mt-1.5 text-xs font-mono text-red-500">{emailError}</p>
                      )}
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1">
                    <label className="flex items-center space-x-4 font-mono text-base text-[#d4d4d4]">
                      <PixelLock size={20} className="text-[#d4d4d4]" />
                      <span>Password</span>
                    </label>
                    <div className="pl-9 relative">
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (passwordError) setPasswordError("");
                          }}
                          autoComplete="new-password"
                          disabled={loading}
                          className={`w-full bg-[#1a1a1a] px-4 py-2 pr-12 font-mono text-base text-[#f5f5f5] placeholder:text-[#666] focus:outline-none transition-colors duration-200 tracking-widest border ${
                            passwordError 
                              ? "border-red-500" 
                              : "border-[#454545] focus:border-[#d8d8d8]"
                          } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={loading}
                          className={`absolute right-4 top-1/2 -translate-y-1/2 text-[#888] hover:text-[#f5f5f5] transition-colors cursor-pointer ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          {showPassword ? <PixelEyeClosed size={20} /> : <PixelEye size={20} />}
                        </button>
                      </div>
                      {passwordError && (
                        <p className="mt-1.5 text-xs font-mono text-red-500">{passwordError}</p>
                      )}
                    </div>
                  </div>

                  {/* Global API Error */}
                  {error && (
                    <div className="pl-9 pt-2">
                      <p className="text-xs font-mono text-red-500">{error}</p>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="pl-9 pt-6 pb-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="group w-full flex items-center justify-between bg-transparent border border-[#555] hover:border-[#f5f5f5] text-[#a0a0a0] hover:text-[#f5f5f5] px-6 py-3 font-mono text-lg hover:bg-[#1a1a1a] transition-all duration-200 disabled:opacity-50 disabled:hover:border-[#555] disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer"
                    >
                      <span className="flex-1 text-center font-bold tracking-wider">
                        {loading ? "Initializing account..." : "Sign up"}
                      </span>
                      {loading ? (
                        <svg className="animate-spin h-5 w-5 ml-2 text-[#a0a0a0]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <PixelArrowRight size={20} className="group-hover:translate-x-1 transition-transform duration-200 ml-2" />
                      )}
                    </button>
                  </div>
                  
                  {/* Log In Link */}
                  <div className="text-center font-mono text-sm text-[#888] mt-4 pt-2">
                    Already have an account?{' '}
                    <Link to="/login" className="text-[#f5f5f5] border-b border-dashed border-[#888] hover:border-white transition-all pb-0.5 ml-1">
                      Log in
                    </Link>
                  </div>
                </form>
              </div>
            </div>

            {/* Footer Panel */}
            <div className="flex space-x-3 mb-2">
              <div className="w-12 h-12 flex-shrink-0 border border-[#555] bg-transparent flex items-center justify-center rounded-sm">
                <PixelTerminal size={20} className="text-[#f5f5f5]" />
              </div>
              <div className="flex-1 border border-[#555] bg-transparent py-2 px-4 flex items-center rounded-sm">
                <p className="font-mono text-sm text-[#a0a0a0] flex items-start space-x-3">
                  <span className="text-[#f5f5f5]">✦</span>
                  <span>Building UIs is hard. Signing up shouldn't be.</span>
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </MonitorLayout>
  );
}