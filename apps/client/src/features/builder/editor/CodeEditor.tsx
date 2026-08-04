import { useCallback, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import type { OnMount } from "@monaco-editor/react";

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

    const saveFile =
      useWorkspaceStore(
        (state) => state.saveFile,
      );

    const saveCurrentFile =
      useWorkspaceStore(
        (state) =>
          state.saveCurrentFile,
      );

    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleEditorMount: OnMount = useCallback(
      (editor, monaco) => {
        
        // Configure TypeScript for React/JSX
        monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
          target: monaco.languages.typescript.ScriptTarget.ESNext,
          allowNonTsExtensions: true,
          moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
          module: monaco.languages.typescript.ModuleKind.CommonJS,
          noEmit: true,
          esModuleInterop: true,
          jsx: monaco.languages.typescript.JsxEmit.React,
          reactNamespace: "React",
          allowJs: true,
          typeRoots: ["node_modules/@types"]
        });

        monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
          noSemanticValidation: false,
          noSyntaxValidation: false,
        });

        editor.addCommand(
          monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
          () => {
            void saveCurrentFile();
          },
        );
      },
      [saveCurrentFile],
    );

    useEffect(() => {
      return () => {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
      };
    }, []);

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
        onChange={(value) => {
          updateOpenedFile(
            selectedFile,
            value ?? "",
          );
          
          if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
          }
          
          saveTimeoutRef.current = setTimeout(() => {
            void saveFile(selectedFile);
          }, 300);
        }}
        onMount={handleEditorMount}
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