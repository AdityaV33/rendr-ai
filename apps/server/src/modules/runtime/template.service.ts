import path from "node:path";

import { NotFoundError } from "../lib/http-error.js";

import { TEMPLATES_ROOT } from "./runtime.constants.js";

import * as filesystemService from "./filesystem.service.js";
import * as workspaceService from "./workspace.service.js";

const TEMPLATE_REGISTRY: Record<string, string> = {
  "react-vite": "react",
  "vanilla": "vanilla",
};

export function getTemplatePath(
  framework: string,
): string {
  const templateName = TEMPLATE_REGISTRY[framework] ?? framework;

  return path.join(
    process.cwd(),
    TEMPLATES_ROOT,
    templateName,
  );
}

export async function templateExists(
  framework: string,
): Promise<boolean> {
  return filesystemService.pathExists(
    getTemplatePath(framework),
  );
}

export async function copyTemplate(
  projectId: string,
  framework: string,
): Promise<string> {
  const templatePath = getTemplatePath(
    framework,
  );


  if (
    !(await templateExists(framework))
  ) {
    throw new NotFoundError(
      `Project template '${framework}' not found.`,
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

export async function copyValidationTemplate(
  projectId: string,
  framework: string,
): Promise<string> {
  const templatePath = getTemplatePath(framework);

  if (!(await templateExists(framework))) {
    throw new NotFoundError(`Project template '${framework}' not found.`);
  }

  if (!(await workspaceService.validationWorkspaceExists(projectId))) {
    await workspaceService.createValidationWorkspace(projectId);
  }

  const workspacePath = workspaceService.getValidationWorkspacePath(projectId);
  
  await filesystemService.copyDirectory(templatePath, workspacePath);

  return workspacePath;
}