import type { Request, Response } from "express";
import path from "node:path";

import { NotFoundError, BadRequestError, ConflictError } from "../lib/http-error.js";
import { toProjectResponse } from "./project.mapper.js";
import * as projectService from "./project.service.js";

export async function createProject(
  req: Request,
  res: Response,
) {
  console.log("[API] Received Create Project Request");

  const project = await projectService.createProject(
    req.user.id,
    req.body,
  );

  return res.status(201).json(
    toProjectResponse(project),
  );
}

export async function getProjects(
  req: Request,
  res: Response,
) {
  const projects = await projectService.getProjects(
    req.user.id,
  );

  return res.status(200).json(
    projects.map(toProjectResponse),
  );
}

export async function getProjectById(
  req: Request,
  res: Response,
) {
  const projectId = req.params.projectId as string;

  const project = await projectService.getProjectById(
    req.user.id,
    projectId,
  );

  if (!project) {
    throw new NotFoundError("Project not found.");
  }

  return res.status(200).json(
    toProjectResponse(project),
  );
}

export async function updateProject(
  req: Request,
  res: Response,
) {
  const projectId = req.params.projectId as string;

  const project = await projectService.updateProject(
    req.user.id,
    projectId,
    req.body,
  );

  if (!project) {
    throw new NotFoundError("Project not found.");
  }

  return res.status(200).json(
    toProjectResponse(project),
  );
}

export async function deleteProject(
  req: Request,
  res: Response,
) {
  const projectId = req.params.projectId as string;

  const project = await projectService.deleteProject(
    req.user.id,
    projectId,
  );

  if (!project) {
    throw new NotFoundError("Project not found.");
  }

  return res.status(204).send();
}

export async function generateProjectController(
  req: Request,
  res: Response,
) {
  const projectId = req.params.projectId as string;

  try {
    const project = await projectService.startGeneration(
      req.user.id,
      projectId
    );

    // Fire and forget the background generation
    projectService.generateProject(project)
      .catch(err => console.error(`Background generation failed for project ${projectId}`, err));

    return res.status(202).json({
      message: "Generation started in the background",
    });
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof BadRequestError || error instanceof ConflictError) {
      throw error;
    }
    throw new BadRequestError(error instanceof Error ? error.message : "Failed to start generation");
  }
}

export async function refineProjectController(
  req: Request,
  res: Response,
) {
  const projectId = req.params.projectId as string;
  const prompt = req.body.prompt as string;

  if (!prompt) {
    throw new BadRequestError("Prompt is required for refinement.");
  }

  try {
    // Atomically transition the state BEFORE returning 202
    const project = await projectService.startRefinement(
      req.user.id,
      projectId
    );

    // Fire and forget
    projectService.refineProject(
      project,
      prompt,
    ).catch(err => console.error(`Background refinement failed for project ${projectId}`, err));

    return res.status(202).json({
      message: "Refinement started in the background",
    });
  } catch (error) {
    throw new BadRequestError(error instanceof Error ? error.message : "Failed to start refinement");
  }
}

export async function applyProjectController(
  req: Request,
  res: Response,
) {
  const projectId = req.params.projectId as string;

  try {
    const project = await projectService.applyProject(
      req.user.id,
      projectId,
    );
    return res.status(200).json(toProjectResponse(project));
  } catch (error) {
    throw new BadRequestError(error instanceof Error ? error.message : "Failed to apply changes");
  }
}

export async function undoProjectController(
  req: Request,
  res: Response,
) {
  const projectId = req.params.projectId as string;

  // We can await undo since it is fast
  const project = await projectService.undoProject(
    req.user.id,
    projectId,
  );

  return res.status(200).json(toProjectResponse(project));
}
import { ZipArchive } from "archiver";

export async function exportProject(req: Request, res: Response) {
  const projectId = req.params.projectId as string;
  const project = await projectService.requireProject(req.user.id, projectId);

  if (project.status !== "ready" || !project.generatedProject?.files) {
    throw new BadRequestError("Project is not ready for export.");
  }

  const safeFilename = project.name.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "project";
  
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}-export.zip"`);

  const archive = new ZipArchive({ zlib: { level: 9 } });
  
  archive.on("error", (err) => {
    console.error(`[Export] Failed to stream ZIP for project ${projectId}:`, err);
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to generate ZIP archive." });
    }
  });

  archive.pipe(res);

  let hasReadme = false;
  const readmeAddendum = `
## Running Locally

This project was exported from RendrAI. To run it locally:

### Using pnpm (Recommended)
\`\`\`bash
# 1. Install dependencies
pnpm install

# 2. If it asks to approve build scripts (like esbuild), run:
pnpm approve-builds

# 3. Start the dev server
pnpm run dev
\`\`\`

### Using npm (Alternative)
If you prefer standard npm:
\`\`\`bash
npm install
npm run dev
\`\`\`

Open the provided local URL (usually http://localhost:5173) in your browser.
`;

  for (const file of project.generatedProject.files) {
    // Security: Normalize path and prevent path traversal
    const normalizedPath = path.posix.normalize(file.path.replace(/\\/g, "/"));
    if (normalizedPath.startsWith("..") || normalizedPath.startsWith("/")) {
      console.warn(`[Export] Skipped unsafe file path in project ${projectId}: ${file.path}`);
      continue;
    }

    let fileContent = file.content;
    if (normalizedPath.toLowerCase() === "readme.md") {
      // Strip out the AI/Template generated getting started instructions to avoid redundancy
      fileContent = fileContent.replace(/## Getting Started[\s\S]*?(?=##|$)/i, "");
      fileContent = fileContent.replace(/## Running Locally[\s\S]*?(?=##|$)/i, "");
      
      fileContent = fileContent.trim() + "\n\n" + readmeAddendum;
      hasReadme = true;
    }

    archive.append(fileContent, { name: normalizedPath });
  }

  if (!hasReadme) {
    archive.append("# " + project.name + "\n\n" + readmeAddendum, { name: "README.md" });
  }

  await archive.finalize();
}