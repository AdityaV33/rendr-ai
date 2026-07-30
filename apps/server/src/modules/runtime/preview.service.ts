import { ChildProcess } from "node:child_process";

import { BadRequestError } from "../lib/http-error.js";

import {
  releasePort,
  getAvailablePort,
} from "./port.service.js";
import {
  startProcess,
  stopProcess,
} from "./process.service.js";
import {
  getWorkspacePath,
  workspaceExists,
} from "./workspace.service.js";

export interface PreviewResult {
  port: number;
  url: string;
  process: ChildProcess;
}

export function startPreview(
  projectId: string,
  framework: string,
): PreviewResult {
  if (!workspaceExists(projectId)) {
    throw new BadRequestError(
      "Workspace does not exist. Please initialize the runtime first.",
    );
  }

  const workspacePath = getWorkspacePath(projectId);
  const port = getAvailablePort();

  console.log("========================================");
  console.log("RUNTIME STARTUP LOGGING");
  console.log(`Project ID: ${projectId}`);
  console.log(`Framework: ${framework}`);
  console.log(`Workspace path: ${workspacePath}`);
  console.log(`CWD passed to spawn(): ${workspacePath}`);
  console.log(`Assigned port: ${port}`);
  console.log(`Preview URL: http://127.0.0.1:${port}`);
  console.log("========================================");

  try {
    const process = startProcess(
      "npm",
      [
        "run",
        "dev",
        "--",
        "--host",
        "0.0.0.0",
        "--port",
        String(port),
        "--strictPort"
      ],
      {
        cwd: workspacePath,
      },
    );

    console.log(`[Spawn] Absolute path of executed process: ${process.spawnfile}`);

    return {
      port,
      url: `http://127.0.0.1:${port}`,
      process,
    };
  } catch (error) {
    releasePort(port);
    throw error;
  }
}

export function stopPreview(
  preview: PreviewResult,
): void {
  stopProcess(preview.process);
  releasePort(preview.port);
}