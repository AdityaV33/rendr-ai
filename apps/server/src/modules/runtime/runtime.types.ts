import type { ChildProcess } from "node:child_process";

export enum RuntimeStatus {
  IDLE = "idle",
  GENERATING = "generating",
  WRITING = "writing",
  INSTALLING = "installing",
  BUILDING = "building",
  STARTING = "starting",
  READY = "ready",
  FAILED = "failed",
  STOPPED = "stopped",
}

export interface WorkspaceInfo {
  projectId: string;
  workspacePath: string;
}

export interface PreviewInfo {
  port: number;
  url: string;
  process: ChildProcess;
}

export interface BuildResult {
  success: boolean;
  logs: string[];
  errors: string[];
}

export interface RuntimeState {
  projectId: string;
  status: RuntimeStatus;
  workspace?: WorkspaceInfo;
  preview?: PreviewInfo;
  build?: BuildResult;
}