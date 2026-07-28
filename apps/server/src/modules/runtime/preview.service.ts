import { ChildProcess } from "node:child_process";

import { BadRequestError } from "../lib/http-error.js";

import { getAvailablePort } from "./port.service.js";
import { startProcess } from "./process.service.js";
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
): PreviewResult {
  if (!workspaceExists(projectId)) {
    throw new BadRequestError(
      "Workspace does not exist. Please initialize the runtime first.",
    );
  }

  const workspacePath = getWorkspacePath(projectId);

  const port = getAvailablePort();

  const process = startProcess(
    "npm",
    ["run", "dev", "--", "--host", "0.0.0.0", "--port", String(port)],
    {
      cwd: workspacePath,
    },
  );

  return {
    port,
    url: `http://localhost:${port}`,
    process,
  };
}