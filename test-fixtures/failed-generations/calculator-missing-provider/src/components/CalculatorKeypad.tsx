import React, { useEffect } from 'react';
import { CalculatorButton } from './CalculatorButton';
import { useCalculator } from '../context/CalculatorContext';

export const CalculatorKeypad: React.FC = () => {
  const {
    inputDigit,
    inputDecimal,
    clear,
    deleteLast,
    performOperation,
    calculate,
    inputPercent,
    toggleSign,
  } = useCalculator();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { key } = event;

      if (/[0-9]/.test(key)) {
        event.preventDefault();
        inputDigit(key);
      } else if (key === '.') {
        event.preventDefault();
        inputDecimal();
      } else if (key === '+' || key === '-' || key === '*' || key === '/') {
        event.preventDefault();
        const opMap: Record<string, string> = {
          '+': '+',
          '-': '-',
          '*': '×',
          '/': '÷',
        };
        performOperation(opMap[key]);
      } else if (key === 'Enter' || key === '=') {
        event.preventDefault();
        calculate();
      } else if (key === 'Backspace') {
        event.preventDefault();
        deleteLast();
      } else if (key === 'Escape' || key.toLowerCase() === 'c') {
        event.preventDefault();
        clear();
      } else if (key === '%') {
        event.preventDefault();
        inputPercent();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [inputDigit, inputDecimal, clear, deleteLast, performOperation, calculate, inputPercent]);

  const buttons = [
    { label: 'C', onClick: clear, variant: 'utility', isDoubleWidth: false },
    { label: '±', onClick: toggleSign, variant: 'utility', isDoubleWidth: false },
    { label: '%', onClick: inputPercent, variant: 'utility', isDoubleWidth: false },
    { label: '÷', onClick: () => performOperation('÷'), variant: 'operator', isDoubleWidth: false },

    { label: '7', onClick: () => inputDigit('7'), variant: 'number', isDoubleWidth: false },
    { label: '8', onClick: () => inputDigit('8'), variant: 'number', isDoubleWidth: false },
    { label: '9', onClick: () => inputDigit('9'), variant: 'number', isDoubleWidth: false },
    { label: '×', onClick: () => performOperation('×'), variant: 'operator', isDoubleWidth: false },

    { label: '4', onClick: () => inputDigit('4'), variant: 'number', isDoubleWidth: false },
    { label: '5', onClick: () => inputDigit('5'), variant: 'number', isDoubleWidth: false },
    { label: '6', onClick: () => inputDigit('6'), variant: 'number', isDoubleWidth: false },
    { label: '-', onClick: () => performOperation('-'), variant: 'operator', isDoubleWidth: false },

    { label: '1', onClick: () => inputDigit('1'), variant: 'number', isDoubleWidth: false },
    { label: '2', onClick: () => inputDigit('2'), variant: 'number', isDoubleWidth: false },
    { label: '3', onClick: () => inputDigit('3'), variant: 'number', isDoubleWidth: false },
    { label: '+', onClick: () => performOperation('+'), variant: 'operator', isDoubleWidth: false },

    { label: '0', onClick: () => inputDigit('0'), variant: 'number', isDoubleWidth: true },
    { label: '.', onClick: inputDecimal, variant: 'number', isDoubleWidth: false },
    { label: '=', onClick: calculate, variant: 'operator', isDoubleWidth: false },
  ];

  return (
    <div className="grid grid-cols-4 gap-3 p-1">
      {buttons.map((btn, idx) => (
        <CalculatorButton
          key={`${btn.label}-${idx}`}
          label={btn.label}
          onClick={btn.onClick}
          variant={btn.variant}
          isDoubleWidth={btn.isDoubleWidth}
        />
      ))}
    </div>
  );
};
