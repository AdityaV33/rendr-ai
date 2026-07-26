import Editor from "@monaco-editor/react";

import { mockProjectFiles } from "@/features/builder/data/mockProjectFiles";
import { useBuilderStore } from "@/features/builder/store/builder.store";

const CodeEditor = () => {
  const selectedFile = useBuilderStore((state) => state.selectedFile);

  const currentFile = mockProjectFiles.find(
    (file) => file.path === selectedFile,
  );

  if (!currentFile) {
    return (
      <div className="flex h-full items-center justify-center bg-neutral-950 text-neutral-500">
        Select a file from the explorer to begin.
      </div>
    );
  }

  return (
    <Editor
      height="100%"
      theme="vs-dark"
      language={currentFile.language}
      value={currentFile.content}
      options={{
        readOnly: true,
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