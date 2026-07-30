import { useEffect, useCallback } from "react";
import Editor from "@monaco-editor/react";

import { useWorkspaceStore } from "@/features/builder/store/workspace.store";

const getLanguage = (
  filePath: string,
): string => {
  if (filePath.endsWith(".tsx")) {
    return "typescript";
  }

  if (filePath.endsWith(".ts")) {
    return "typescript";
  }

  if (filePath.endsWith(".jsx")) {
    return "javascript";
  }

  if (filePath.endsWith(".js")) {
    return "javascript";
  }

  if (filePath.endsWith(".json")) {
    return "json";
  }

  if (filePath.endsWith(".css")) {
    return "css";
  }

  if (filePath.endsWith(".html")) {
    return "html";
  }

  if (filePath.endsWith(".md")) {
    return "markdown";
  }

  return "plaintext";
};

const CodeEditor = () => {
  const selectedFile =
    useWorkspaceStore(
      (state) => state.selectedFile,
    );

  const openedFiles =
    useWorkspaceStore(
      (state) => state.openedFiles,
    );

  const updateOpenedFile =
    useWorkspaceStore(
      (state) =>
        state.updateOpenedFile,
    );

  const saveCurrentFile =
    useWorkspaceStore(
      (state) =>
        state.saveCurrentFile,
    );

  const handleSave = useCallback(
    (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "s"
      ) {
        e.preventDefault();
        void saveCurrentFile();
      }
    },
    [saveCurrentFile],
  );

  useEffect(() => {
    window.addEventListener(
      "keydown",
      handleSave,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleSave,
      );
    };
  }, [handleSave]);

  if (!selectedFile) {
    return (
      <div className="flex h-full items-center justify-center bg-neutral-950 text-neutral-500">
        Select a file from the explorer to begin.
      </div>
    );
  }

  const currentFile =
    openedFiles[selectedFile];

  if (!currentFile) {
    return (
      <div className="flex h-full items-center justify-center bg-neutral-950 text-neutral-500">
        Loading file...
      </div>
    );
  }

  return (
    <Editor
      key={selectedFile}
      height="100%"
      theme="vs-dark"
      language={getLanguage(
        selectedFile,
      )}
      value={currentFile.content}
      onChange={(value) =>
        updateOpenedFile(
          selectedFile,
          value ?? "",
        )
      }
      options={{
        readOnly: false,
        minimap: {
          enabled: false,
        },
        fontSize: 14,
        automaticLayout: true,
        scrollBeyondLastLine: false,
      }}
    />
  );
};

export default CodeEditor;