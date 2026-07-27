import fs from "node:fs/promises";


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