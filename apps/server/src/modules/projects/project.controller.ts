import type { Request, Response } from "express";

import { NotFoundError } from "../lib/http-error.js";
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

  const project =
    await projectService.generateProject(
      req.user.id,
      projectId,
    );

  return res.status(200).json(
    toProjectResponse(project),
  );
}