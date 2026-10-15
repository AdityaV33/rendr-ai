import { AsyncLocalStorage } from "async_hooks";

export interface PipelineRunContext {
  blacklistedModels: Set<string>;
  groqExcludedModels: Set<string>;
  groqModelCooldowns: Map<string, number>;
  abortSignal?: AbortSignal;
}

export const pipelineRunContext = new AsyncLocalStorage<PipelineRunContext>();
