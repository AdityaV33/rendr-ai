import path from "node:path";

import { NotFoundError } from "../lib/http-error.js";

import {
  TEMPLATE_ROOT,
} from "./runtime.constants.js";

import * as filesystemService from "./filesystem.service.js";
import * as workspaceService from "./workspace.service.js";

export function getTemplatePath(): string {
  return path.join(
    process.cwd(),
    TEMPLATE_ROOT,
  );
}

export async function templateExists(): Promise<boolean> {
  return filesystemService.pathExists(
    getTemplatePath(),
  );
}

export async function copyTemplate(
  projectId: string,
): Promise<string> {
  const templatePath = getTemplatePath();

  if (!(await templateExists())) {
    throw new NotFoundError(
      "Project template not found.",
    );
  }

  if (
    !(await workspaceService.workspaceExists(
      projectId,
    ))
  ) {
    throw new NotFoundError(
      "Workspace not found.",
    );
  }

  const workspacePath =
    workspaceService.getWorkspacePath(
      projectId,
    );

  await filesystemService.copyDirectory(
    templatePath,
    workspacePath,
  );

  return workspacePath;
}