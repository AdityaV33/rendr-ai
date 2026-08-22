import { Schema, model, Types } from "mongoose";
import type { ProjectPlan } from "../ai/types/project-plan.types.js";
import type { ArchitecturePlan } from "../ai/types/architecture-plan.types.js";
import type { GeneratedProject } from "../ai/types/generated-project.types.js";

export type ProjectStatus =
  | "draft"
  | "planning"
  | "generating"
  | "building"
  | "repairing"
  | "ready"
  | "failed"
  | "refining"
  | "pending_changes";

export type ProjectFramework =
  | "react-vite";

export interface Snapshot {
  refinementId: string;
  prompt: string;
  createdAt: Date;
  files: {
    path: string;
    content: string;
  }[];
}

export interface Project {
  owner: Types.ObjectId;
  name: string;
  prompt: string;
  framework: ProjectFramework | null;
  status: ProjectStatus;
  aiPlan: ProjectPlan | null;
  architecturePlan: ArchitecturePlan | null;
  generatedProject: GeneratedProject | null;
  pendingProject: GeneratedProject | null;
  files: string[];
  pipelineStage: string | null;
  pipelineTimestamps: {
    planningStartedAt?: Date;
    architectStartedAt?: Date;
    generationStartedAt?: Date;
    previewStartedAt?: Date;
    completedAt?: Date;
  } | null;
  history: Snapshot[];

  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<Project>(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    prompt: {
      type: String,
      required: true,
      trim: true,
    },

    framework: {
      type: String,
      enum: ["react-vite"],
      default: null,
    },

    status: {
      type: String,
      enum: [
        "draft",
        "planning",
        "generating",
        "building",
        "repairing",
        "ready",
        "failed",
        "refining",
        "pending_changes"
      ],
      default: "draft",
    },

    aiPlan: {
      type: Schema.Types.Mixed,
      default: null,
    },

    architecturePlan: {
      type: Schema.Types.Mixed,
      default: null,
    },

    generatedProject: {
      type: Schema.Types.Mixed,
      default: null,
    },

    pendingProject: {
      type: Schema.Types.Mixed,
      default: null,
    },

    files: {
      type: [String],
      default: [],
    },

    pipelineStage: {
      type: String,
      default: null,
    },

    pipelineTimestamps: {
      type: Schema.Types.Mixed,
      default: null,
    },
    
    history: {
       
      type: [Schema.Types.Mixed] as any,
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

projectSchema.index({ owner: 1, updatedAt: -1 });

export const ProjectModel = model<Project>(
  "Project",
  projectSchema,
);