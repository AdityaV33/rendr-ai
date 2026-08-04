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
  command: string = "pnpm build",
): Promise<ProcessResult> {
  if (!(await workspaceExists(projectId))) {
    throw new BadRequestError(
      "Workspace does not exist. Please initialize the runtime first.",
    );
  }

  const workspacePath =
    getWorkspacePath(projectId);

  const [cmd, ...args] = command.split(" ");

  console.log(`\nBuilding Project\n\nExecuting:\n${command}\n`);

  return runProcess(
    cmd,
    args,
    {
      cwd: workspacePath,
    },
  );
}