import { useCallback, useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import type { OnMount } from "@monaco-editor/react";

import { useWorkspaceStore } from "@/features/builder/store/workspace.store";

const getLanguage = (
  filePath: string,
): string => {
  if (filePath.endsWith(".tsx")) return "typescript";
  if (filePath.endsWith(".ts")) return "typescript";
  if (filePath.endsWith(".jsx")) return "javascript";
  if (filePath.endsWith(".js")) return "javascript";
  if (filePath.endsWith(".json")) return "json";
  if (filePath.endsWith(".css")) return "css";
  if (filePath.endsWith(".html")) return "html";
  if (filePath.endsWith(".md")) return "markdown";
  return "plaintext";
};

const getLanguageDisplayName = (
  filePath: string,
): string => {
  if (filePath.endsWith(".tsx")) return "TypeScript JSX";
  if (filePath.endsWith(".ts")) return "TypeScript";
  if (filePath.endsWith(".jsx")) return "JavaScript JSX";
  if (filePath.endsWith(".js")) return "JavaScript";
  if (filePath.endsWith(".json")) return "JSON";
  if (filePath.endsWith(".css")) return "CSS";
  if (filePath.endsWith(".html")) return "HTML";
  if (filePath.endsWith(".md")) return "Markdown";
  return "Plain Text";
};

const CodeEditor = () => {
  const selectedFile = useWorkspaceStore((state) => state.selectedFile);
  const openedFiles = useWorkspaceStore((state) => state.openedFiles);
  const updateOpenedFile = useWorkspaceStore((state) => state.updateOpenedFile);
  const saveFile = useWorkspaceStore((state) => state.saveFile);
  const saveCurrentFile = useWorkspaceStore((state) => state.saveCurrentFile);
  const openFile = useWorkspaceStore((state) => state.openFile);
  const closeFile = useWorkspaceStore((state) => state.closeFile);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [cursorPosition, setCursorPosition] = useState({ lineNumber: 1, column: 1 });

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
        noSemanticValidation: true,
        noSyntaxValidation: false,
      });

      editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
        () => {
          void saveCurrentFile();
        },
      );

      editor.onDidChangeCursorPosition((e) => {
        setCursorPosition({
          lineNumber: e.position.lineNumber,
          column: e.position.column,
        });
      });
    },
    [saveCurrentFile],
  );

  const handleEditorWillMount = useCallback((monaco: any) => {
    monaco.editor.defineTheme('custom-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#121212',
      }
    });
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full w-full bg-[#121212] overflow-hidden">
      {/* Tab Bar */}
      {Object.keys(openedFiles).length > 0 && (
        <div className="flex bg-[#0a0a0a] overflow-x-auto shrink-0 no-scrollbar" style={{ scrollbarWidth: 'none' }}>
          {Object.keys(openedFiles).map((filePath) => {
            const isSelected = filePath === selectedFile;
            const fileName = filePath.split('/').pop() || filePath;
            
            return (
              <div
                key={filePath}
                onClick={() => openFile(filePath)}
                className={`group flex items-center gap-2 px-3 py-2 min-w-fit cursor-pointer border-r border-[#1a1a1a] text-[13px] font-mono select-none ${
                  isSelected 
                    ? "bg-[#121212] text-[#f5f5f5] border-t border-t-blue-500" 
                    : "bg-[#0a0a0a] text-[#888] hover:bg-[#151515] border-t border-t-transparent"
                }`}
              >
                <span>{fileName}</span>
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    closeFile(filePath);
                  }}
                  className={`p-0.5 rounded-md hover:bg-[#444] transition-colors ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor Content Area */}
      <div className="flex-1 relative min-h-0 bg-[#121212]">
        {!selectedFile ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[#121212] overflow-hidden font-mono">
            {/* Top Left Decor */}
            <div className="absolute top-6 left-6 flex items-start space-x-2">
              <div className="w-3 h-3 border-t-2 border-l-2 border-[#333]" />
              <span className="text-[#333] text-[10px] tracking-widest mt-0.5">/// ///</span>
            </div>

            {/* Top Right Decor */}
            <div className="absolute top-6 right-6 flex items-start space-x-3">
              <div className="flex items-center space-x-2 mt-0.5">
                <div className="w-1.5 h-1.5 bg-[#444] rounded-full animate-pulse" />
                <span className="text-[#333] text-[10px] tracking-widest">IDLE</span>
              </div>
              <div className="w-3 h-3 border-t-2 border-r-2 border-[#333]" />
            </div>

            {/* Bottom Left Decor */}
            <div className="absolute bottom-6 left-6 flex items-end">
              <div className="flex flex-col items-center mr-1">
                <div className="w-[2px] h-[2px] bg-[#444] mb-1" />
                <div className="w-[2px] h-[2px] bg-[#444] mb-1" />
                <div className="w-[2px] h-[2px] bg-[#444] mb-1" />
                <div className="w-[2px] h-[2px] bg-[#444] mb-1" />
                <div className="w-3 h-3 border-b-2 border-l-2 border-[#333]" />
              </div>
              <div className="flex space-x-1 mb-0.5 ml-1">
                <div className="w-[2px] h-[2px] bg-[#444]" />
                <div className="w-[2px] h-[2px] bg-[#444]" />
                <div className="w-[2px] h-[2px] bg-[#444]" />
                <div className="w-[2px] h-[2px] bg-[#444]" />
                <div className="w-[2px] h-[2px] bg-[#444]" />
              </div>
            </div>

            {/* Bottom Right Decor */}
            <div className="absolute bottom-6 right-6 flex items-end">
              <div className="flex space-x-1 mb-0.5 mr-2">
                <div className="w-[2px] h-[2px] bg-[#444]" />
                <div className="w-[2px] h-[2px] bg-[#444]" />
                <div className="w-[2px] h-[2px] bg-[#444]" />
              </div>
              <div className="relative w-8 h-8">
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#333]" />
                <div className="absolute bottom-1.5 right-1.5 w-6 h-[2px] bg-[#333] transform -rotate-45 origin-bottom-right" />
              </div>
            </div>

            {/* Center Content */}
            <div className="flex flex-col items-center space-y-5">
              <div className="relative">
                <svg width="72" height="72" viewBox="0 0 64 64" fill="none" className="text-[#f5f5f5]">
                  <path 
                    d="M14 24 H28 L34 30 H50 V48 H14 V24 Z" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeDasharray="2 2" 
                  />
                  {/* Sparkle */}
                  <path 
                    d="M48 12 L49.5 17.5 L55 19 L49.5 20.5 L48 26 L46.5 20.5 L41 19 L46.5 17.5 Z" 
                    stroke="currentColor" 
                    strokeWidth="1.5" 
                    fill="transparent" 
                  />
                </svg>
              </div>

              <div className="flex flex-col items-center space-y-2">
                <h2 className="text-xl text-[#f5f5f5] tracking-wider font-normal">
                  No file selected
                </h2>
                <p className="text-xs text-[#888]">
                  Select a file from the explorer to begin.
                </p>
              </div>
            </div>
          </div>
        ) : (
          openedFiles[selectedFile] ? (
            <Editor
              key={selectedFile}
              height="100%"
              theme="custom-dark"
              language={getLanguage(selectedFile)}
              value={openedFiles[selectedFile].content}
              onChange={(value) => {
                updateOpenedFile(selectedFile, value ?? "");
                
                if (saveTimeoutRef.current) {
                  clearTimeout(saveTimeoutRef.current);
                }
                
                saveTimeoutRef.current = setTimeout(() => {
                  void saveFile(selectedFile);
                }, 300);
              }}
              beforeMount={handleEditorWillMount}
              onMount={handleEditorMount}
              options={{
                readOnly: false,
                minimap: {
                  enabled: true,
                  scale: 0.75,
                },
                fontSize: 14,
                automaticLayout: true,
                scrollBeyondLastLine: false,
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-[#050505] text-[#888]">
              Loading file...
            </div>
          )
        )}
      </div>

      {/* Status Bar */}
      {selectedFile && openedFiles[selectedFile] && (
        <div className="flex items-center justify-end px-4 py-1 bg-[#0a0a0a] border-t border-[#1a1a1a] text-[#888] font-mono text-[11px] shrink-0 select-none space-x-6">
          <span>Ln {cursorPosition.lineNumber}, Col {cursorPosition.column}</span>
          <span>Spaces: 2</span>
          <span>UTF-8</span>
          <span>LF</span>
          <span>{'{ }'}</span>
          <span>{getLanguageDisplayName(selectedFile)}</span>
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m20 6-8.25 11.5L5 12.5"/></svg>
            Prettier
          </span>
        </div>
      )}
    </div>
  );
};

export default CodeEditor;