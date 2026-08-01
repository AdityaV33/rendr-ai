import { Schema, model, Types } from "mongoose";
import type { ProjectPlan } from "../ai/types/project-plan.types.js";
import type { ArchitecturePlan } from "../ai/types/architecture-plan.types.js";

export type ProjectStatus =
  | "draft"
  | "planning"
  | "generating"
  | "building"
  | "ready"
  | "failed";

export type ProjectFramework =
  | "react-ts"
  | "react-js"
  | "vanilla";

export interface Project {
  owner: Types.ObjectId;
  name: string;
  prompt: string;
  framework: ProjectFramework | null;
  status: ProjectStatus;
  aiPlan: ProjectPlan | null;
  architecturePlan: ArchitecturePlan | null;
  files: string[];

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
      enum: ["react-ts", "react-js", "vanilla"],
      default: null,
    },

    status: {
      type: String,
      enum: [
        "draft",
        "planning",
        "generating",
        "building",
        "ready",
        "failed",
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

    files: {
      type: [String],
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