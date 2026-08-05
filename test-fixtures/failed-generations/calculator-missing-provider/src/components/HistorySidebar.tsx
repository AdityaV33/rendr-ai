import React from 'react';
import { useCalculator } from '../context/CalculatorContext';

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  isOpen,
  onClose,
}) => {
  // Safe context consumption with fallbacks to prevent runtime crashes
  const context = useCalculator ? useCalculator() : null;
  const history = context?.history || [];
  const clearHistory = context?.clearHistory || (() => {});
  
  // Support multiple potential naming conventions for restoring history
  const handleSelect = (item: { expression: string; result: string }) => {
    if (context) {
      if ('loadHistoryItem' in context && typeof context.loadHistoryItem === 'function') {
        context.loadHistoryItem(item);
      } else if ('selectHistoryItem' in context && typeof context.selectHistoryItem === 'function') {
        (context as any).selectHistoryItem(item);
      } else if ('setExpression' in context && typeof context.setExpression === 'function') {
        (context as any).setExpression(item.expression);
      }
    }
    onClose();
  };

  return (
    <>
      {/* Backdrop Overlay */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-80 max-w-full bg-gray-900 border-l border-gray-800 shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-lg font-semibold text-gray-100">History</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
            aria-label="Close history"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* History List Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 space-y-2">
              <svg
                className="w-12 h-12 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <p className="text-sm font-medium">No calculations yet</p>
              <p className="text-xs text-gray-600">Your recent calculations will appear here.</p>
            </div>
          ) : (
            history.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item)}
                className="w-full text-left p-3 rounded-xl bg-gray-800/40 border border-gray-800/60 hover:border-blue-500/50 hover:bg-gray-800/80 transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                <div className="text-xs text-gray-400 truncate mb-1 group-hover:text-gray-300 transition-colors">
                  {item.expression}
                </div>
                <div className="text-base font-semibold text-gray-100 truncate flex items-center justify-between">
                  <span>= {item.result}</span>
                  <span className="opacity-0 group-hover:opacity-100 text-xs text-blue-400 font-normal transition-opacity">
                    Restore
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer Actions */}
        {history.length > 0 && (
          <div className="p-4 border-t border-gray-800 bg-gray-900/80 backdrop-blur-md">
            <button
              onClick={clearHistory}
              className="w-full py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 border border-red-500/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Clear History
            </button>
          </div>
        )}
      </div>
    </>
  );
};
