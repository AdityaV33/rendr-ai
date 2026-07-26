import type { ProjectFile } from "@/features/builder/types/project-file";

export const mockProjectFiles: ProjectFile[] = [
  {
    id: "1",
    name: "main.tsx",
    path: "src/main.tsx",
    language: "typescript",
    content: `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
  },
  {
    id: "2",
    name: "App.tsx",
    path: "src/App.tsx",
    language: "typescript",
    content: `export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <h1>Hello from RendrAI</h1>
    </div>
  );
}`,
  },
  {
    id: "3",
    name: "index.css",
    path: "src/index.css",
    language: "css",
    content: `@tailwind base;
@tailwind components;
@tailwind utilities;`,
  },
];