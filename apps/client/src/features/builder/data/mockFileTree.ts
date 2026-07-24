import type { FileNode } from "@/features/builder/types/fileTree";

export const mockFileTree: FileNode[] = [
  {
    name: "src",
    path: "src",
    type: "folder",
    children: [
      {
        name: "App.tsx",
        path: "src/App.tsx",
        type: "file",
      },
      {
        name: "main.tsx",
        path: "src/main.tsx",
        type: "file",
      },
      {
        name: "index.css",
        path: "src/index.css",
        type: "file",
      },
      {
        name: "components",
        path: "src/components",
        type: "folder",
        children: [
          {
            name: "Button.tsx",
            path: "src/components/Button.tsx",
            type: "file",
          },
          {
            name: "Navbar.tsx",
            path: "src/components/Navbar.tsx",
            type: "file",
          },
        ],
      },
      {
        name: "pages",
        path: "src/pages",
        type: "folder",
        children: [
          {
            name: "Home.tsx",
            path: "src/pages/Home.tsx",
            type: "file",
          },
        ],
      },
    ],
  },
  {
    name: "public",
    path: "public",
    type: "folder",
    children: [
      {
        name: "favicon.ico",
        path: "public/favicon.ico",
        type: "file",
      },
    ],
  },
  {
    name: "package.json",
    path: "package.json",
    type: "file",
  },
  {
    name: "vite.config.ts",
    path: "vite.config.ts",
    type: "file",
  },
];