import React, { useState } from "react";
import { CalculatorDisplay } from "./components/CalculatorDisplay";
import { CalculatorKeypad } from "./components/CalculatorKeypad";
import { CalculatorButton } from "./components/CalculatorButton";
import { HistorySidebar } from "./components/HistorySidebar";

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-4 font-sans selection:bg-blue-500/30">
      <div className="relative w-full max-w-md bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl p-6 flex flex-col gap-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
            NEO-CALC
          </span>
          <div className="w-24 h-9 flex items-center">
            <CalculatorButton
              label="History"
              onClick={() => setIsSidebarOpen(true)}
              variant="secondary"
              isDoubleWidth={false}
            />
          </div>
        </div>

        {/* Display Component */}
        <CalculatorDisplay />

        {/* Keypad Component */}
        <CalculatorKeypad />

        {/* History Sidebar Component */}
        <HistorySidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>
    </div>
  );
}
