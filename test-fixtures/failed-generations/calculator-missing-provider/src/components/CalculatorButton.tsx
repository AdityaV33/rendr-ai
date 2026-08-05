import React from 'react';

export interface CalculatorButtonProps {
  label: string;
  onClick: () => void;
  variant: string;
  isDoubleWidth: boolean;
}

export const CalculatorButton: React.FC<CalculatorButtonProps> = ({
  label,
  onClick,
  variant,
  isDoubleWidth,
}) => {
  let bgClass = 'bg-gray-800 hover:bg-gray-700 text-white';
  if (variant === 'operator') {
    bgClass = 'bg-blue-600 hover:bg-blue-500 text-white font-semibold';
  } else if (variant === 'utility') {
    bgClass = 'bg-gray-700 hover:bg-gray-600 text-gray-200';
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        ${bgClass}
        ${isDoubleWidth ? 'col-span-2' : 'col-span-1'}
        py-4 rounded-2xl text-xl font-medium transition-all duration-150
        active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500/50
        flex items-center justify-center select-none shadow-md
      `}
    >
      {label}
    </button>
  );
};
