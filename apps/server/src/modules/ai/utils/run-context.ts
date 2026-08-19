import { AsyncLocalStorage } from "async_hooks";

export interface PipelineRunContext {
  blacklistedModels: Set<string>;
  groqExcludedModels: Set<string>;
}

export const pipelineRunContext = new AsyncLocalStorage<PipelineRunContext>();
