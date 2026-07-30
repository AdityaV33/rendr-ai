import fs from "node:fs/promises";
import path from "node:path";

export interface WorkspaceFileNode {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: WorkspaceFileNode[];
}

export async function pathExists(
  targetPath: string,
): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function createDirectory(
  directoryPath: string,
): Promise<void> {
  await fs.mkdir(directoryPath, {
    recursive: true,
  });
}

export async function removeDirectory(
  directoryPath: string,
): Promise<void> {
  await fs.rm(directoryPath, {
    recursive: true,
    force: true,
  });
}

export async function copyDirectory(
  sourcePath: string,
  destinationPath: string,
): Promise<void> {
  await fs.cp(sourcePath, destinationPath, {
    recursive: true,
  });
}

export async function readFile(
  filePath: string,
): Promise<string> {
  return fs.readFile(filePath, "utf-8");
}

export async function writeFile(
  filePath: string,
  content: string,
): Promise<void> {
  await fs.writeFile(
    filePath,
    content,
    "utf-8",
  );
}

export async function listDirectory(
  rootPath: string,
  currentPath: string,
): Promise<WorkspaceFileNode[]> {
  const entries = await fs.readdir(
    currentPath,
    {
      withFileTypes: true,
    },
  );

  const nodes: WorkspaceFileNode[] =
    await Promise.all(
      entries.map(async (entry) => {
        const absolutePath = path.join(
          currentPath,
          entry.name,
        );

        const relativePath = path.relative(
          rootPath,
          absolutePath,
        );

        if (entry.isDirectory()) {
          return {
            name: entry.name,
            path: relativePath,
            type: "folder",
            children:
              await listDirectory(
                rootPath,
                absolutePath,
              ),
          };
        }

        return {
          name: entry.name,
          path: relativePath,
          type: "file",
        };
      }),
    );

  nodes.sort((a, b) => {
    if (
      a.type === "folder" &&
      b.type === "file"
    ) {
      return -1;
    }

    if (
      a.type === "file" &&
      b.type === "folder"
    ) {
      return 1;
    }

    return a.name.localeCompare(
      b.name,
    );
  });

  return nodes;
}