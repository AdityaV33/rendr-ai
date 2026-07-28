import { BadRequestError } from "../lib/http-error.js";

import {
  runProcess,
  type ProcessResult,
} from "./process.service.js";
import {
  getWorkspacePath,
  workspaceExists,
} from "./workspace.service.js";

export async function buildProject(
  projectId: string,
): Promise<ProcessResult> {
  if (!workspaceExists(projectId)) {
    throw new BadRequestError(
      "Workspace does not exist. Please initialize the runtime first.",
    );
  }

  const workspacePath = getWorkspacePath(projectId);

  return runProcess("npm", ["run", "build"], {
    cwd: workspacePath,
  });
}