import React from 'react';
import { useCalculator } from '../context/CalculatorContext';

export const CalculatorDisplay: React.FC = () => {
  const { displayValue, equation } = useCalculator();

  const getFontSizeClass = (text: string) => {
    const len = text.length;
    if (len <= 8) return 'text-5xl md:text-6xl';
    if (len <= 12) return 'text-4xl md:text-5xl';
    if (len <= 16) return 'text-3xl md:text-4xl';
    return 'text-2xl md:text-3xl break-all';
  };

  return (
    <div className="w-full bg-gray-900/60 backdrop-blur-md rounded-3xl p-6 flex flex-col justify-end items-end min-h-[140px] border border-gray-800/50 shadow-inner mb-4">
      <div className="text-gray-500 text-sm md:text-base font-mono tracking-wider min-h-[24px] mb-1 max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
        {equation || '\u00A0'}
      </div>
      <div
        className={`font-semibold tracking-tight text-white transition-all duration-150 text-right w-full select-all ${getFontSizeClass(
          displayValue || '0'
        )}`}
      >
        {displayValue || '0'}
      </div>
    </div>
  );
};
