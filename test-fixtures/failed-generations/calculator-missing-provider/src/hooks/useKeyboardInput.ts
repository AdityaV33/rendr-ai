import { useEffect } from "react";
import { useCalculator } from "../context/CalculatorContext";

export const useKeyboardInput = () => {
  const {
    inputDigit,
    inputDecimal,
    inputOperator,
    clear,
    evaluate,
    backspace,
    percentage
  } = useCalculator();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { key } = event;

      if (["/", "Enter", "=", "Backspace"].includes(key)) {
        event.preventDefault();
      }

      if (/[0-9]/.test(key)) {
        inputDigit(key);
        return;
      }

      if (key === "." || key === ",") {
        inputDecimal();
        return;
      }

      if (key === "+") {
        inputOperator("+");
        return;
      }

      if (key === "-") {
        inputOperator("-");
        return;
      }

      if (key === "*" || key.toLowerCase() === "x") {
        inputOperator("×");
        return;
      }

      if (key === "/") {
        inputOperator("÷");
        return;
      }

      if (key === "Enter" || key === "=") {
        evaluate();
        return;
      }

      if (key === "Backspace") {
        backspace();
        return;
      }

      if (key === "Escape" || key.toLowerCase() === "c") {
        clear();
        return;
      }

      if (key === "%") {
        percentage();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [inputDigit, inputDecimal, inputOperator, clear, evaluate, backspace, percentage]);
};
