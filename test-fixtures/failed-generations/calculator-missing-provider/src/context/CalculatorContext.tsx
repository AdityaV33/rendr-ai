import React, { createContext, useContext, useState, useEffect } from "react";

export interface HistoryItem {
  id: string;
  formula: string;
  result: string;
  timestamp: string;
}

export interface CalculatorContextType {
  currentInput: string;
  formula: string;
  history: HistoryItem[];
  inputDigit: (digit: string) => void;
  inputDecimal: () => void;
  inputOperator: (op: string) => void;
  clear: () => void;
  clearEntry: () => void;
  backspace: () => void;
  toggleSign: () => void;
  percentage: () => void;
  evaluate: () => void;
  clearHistory: () => void;
}

const CalculatorContext = createContext<CalculatorContextType | undefined>(undefined);

export const CalculatorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentInput, setCurrentInput] = useState<string>("0");
  const [formula, setFormula] = useState<string>("");
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem("calculator_history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("calculator_history", JSON.stringify(history));
  }, [history]);

  const isResetRequired = isFinished || currentInput === "Error";

  const inputDigit = (digit: string) => {
    if (isResetRequired) {
      setCurrentInput(digit);
      setFormula("");
      setIsFinished(false);
      return;
    }

    if (currentInput === "0") {
      setCurrentInput(digit);
    } else if (currentInput === "-0") {
      setCurrentInput("-" + digit);
    } else {
      setCurrentInput(prev => prev + digit);
    }
  };

  const inputDecimal = () => {
    if (isResetRequired) {
      setCurrentInput("0.");
      setFormula("");
      setIsFinished(false);
      return;
    }

    if (!currentInput.includes(".")) {
      setCurrentInput(prev => prev + ".");
    }
  };

  const inputOperator = (op: string) => {
    if (isResetRequired) {
      if (currentInput === "Error") {
        setFormula("");
        setCurrentInput("0");
        setIsFinished(false);
        return;
      }
      setFormula(`${currentInput} ${op}`);
      setCurrentInput("0");
      setIsFinished(false);
      return;
    }

    if (formula === "" && currentInput === "0") {
      if (op === "-") {
        setCurrentInput("-");
      }
      return;
    }

    if (currentInput === "-") {
      if (op !== "-") {
        setCurrentInput("0");
      }
      return;
    }

    const trimmedFormula = formula.trim();
    const lastChar = trimmedFormula.slice(-1);
    const operators = ["+", "-", "×", "÷"];

    if (currentInput === "0" && operators.includes(lastChar) && formula !== "") {
      const parts = trimmedFormula.split(" ");
      parts[parts.length - 1] = op;
      setFormula(parts.join(" ") + " ");
      return;
    }

    setFormula(prev => prev ? `${prev} ${currentInput} ${op}` : `${currentInput} ${op}`);
    setCurrentInput("0");
  };

  const clear = () => {
    setCurrentInput("0");
    setFormula("");
    setIsFinished(false);
  };

  const clearEntry = () => {
    if (isFinished) {
      clear();
    } else {
      setCurrentInput("0");
    }
  };

  const backspace = () => {
    if (isResetRequired) {
      clear();
      return;
    }

    if (currentInput.length > 1) {
      setCurrentInput(prev => prev.slice(0, -1));
    } else {
      setCurrentInput("0");
    }
  };

  const toggleSign = () => {
    if (isResetRequired) return;
    if (currentInput === "0") return;
    if (currentInput.startsWith("-")) {
      setCurrentInput(prev => prev.slice(1));
    } else {
      setCurrentInput(prev => "-" + prev);
    }
  };

  const percentage = () => {
    if (isResetRequired) return;
    const val = parseFloat(currentInput);
    if (!isNaN(val)) {
      setCurrentInput((val / 100).toString());
    }
  };

  const evaluate = () => {
    if (isFinished || !formula) return;

    const fullExpression = `${formula} ${currentInput}`;
    const cleanExpr = fullExpression
      .replace(/×/g, "*")
      .replace(/÷/g, "/");

    try {
      if (/[^0-9+\-*/().\s]/.test(cleanExpr)) {
        throw new Error("Invalid characters");
      }

      const evalResult = new Function(`return (${cleanExpr})`)();

      if (typeof evalResult !== "number" || isNaN(evalResult) || !isFinite(evalResult)) {
        throw new Error("Calculation error");
      }

      const formattedResult = parseFloat(evalResult.toFixed(10)).toString();

      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        formula: `${formula} ${currentInput}`,
        result: formattedResult,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };

      setHistory(prev => [newHistoryItem, ...prev]);
      setFormula(`${formula} ${currentInput} =`);
      setCurrentInput(formattedResult);
      setIsFinished(true);
    } catch (error) {
      setCurrentInput("Error");
      setIsFinished(true);
    }
  };

  const clearHistory = () => {
    setHistory([]);
  };

  return (
    <CalculatorContext.Provider
      value={{
        currentInput,
        formula,
        history,
        inputDigit,
        inputDecimal,
        inputOperator,
        clear,
        clearEntry,
        backspace,
        toggleSign,
        percentage,
        evaluate,
        clearHistory
      }}
    >
      {children}
    </CalculatorContext.Provider>
  );
};

export const useCalculator = () => {
  const context = useContext(CalculatorContext);
  if (context === undefined) {
    throw new Error("useCalculator must be used within a CalculatorProvider");
  }
  return context;
};
