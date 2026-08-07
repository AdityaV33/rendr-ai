import { BadRequestError, InternalServerError } from "../lib/http-error.js";

import {
  runProcess,
  type ProcessResult,
} from "./process.service.js";
import {
  getWorkspacePath,
  workspaceExists,
} from "./workspace.service.js";

import crypto from "node:crypto";
import path from "node:path";
import * as fs from "node:fs/promises";

export async function installDependenciesInWorkspace(
  workspacePath: string,
  command: string = "pnpm install",
): Promise<ProcessResult> {
  const packageJsonPath = path.join(workspacePath, "package.json");
  const hashPath = path.join(workspacePath, ".package-hash");
  const nodeModulesPath = path.join(workspacePath, "node_modules");

  try {
    const packageJsonContent = await fs.readFile(packageJsonPath, "utf-8");
    const currentHash = crypto.createHash("md5").update(packageJsonContent).digest("hex");

    let previousHash = "";
    try {
      previousHash = await fs.readFile(hashPath, "utf-8");
    } catch {
      // Ignored
    }

    const nodeModulesExists = await fs.stat(nodeModulesPath).then(() => true).catch(() => false);

    if (currentHash === previousHash && nodeModulesExists) {
      console.log(`[Runtime] Skipping dependency install (cached) in ${workspacePath}`);
      return { success: true, exitCode: 0, stdout: "Skipped dependency install (cached)", stderr: "" };
    }

    const [cmd, ...args] = command.split(" ");
    if (cmd === "pnpm") {
      args.push("--ignore-workspace", "--ignore-scripts", "--config.confirmModulesPurge=false");
    }

    console.log(`\nInstalling Dependencies in ${workspacePath}\n\nExecuting:\n${command}\n`);

    const result = await runProcess(
      cmd,
      args,
      {
        cwd: workspacePath,
      },
    );

    if (result.success) {
      await fs.writeFile(hashPath, currentHash);
    }

    return result;
  } catch (err: any) {
    throw new InternalServerError(`Failed to check or install dependencies in ${workspacePath}. Error: ${err.message}`);
  }
}

export async function installDependencies(
  projectId: string,
  command: string = "pnpm install",
): Promise<ProcessResult> {
  if (!(await workspaceExists(projectId))) {
    throw new BadRequestError(
      "Workspace does not exist. Please initialize the runtime first.",
    );
  }

  const workspacePath = getWorkspacePath(projectId);
  return installDependenciesInWorkspace(workspacePath, command);
}