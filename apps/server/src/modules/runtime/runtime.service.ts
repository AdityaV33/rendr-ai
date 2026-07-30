import {
  RuntimeState,
  RuntimeStatus,
} from "./runtime.types.js";

const runtimeStates = new Map<string, RuntimeState>();

export function getRuntimeState(
  projectId: string,
): RuntimeState | undefined {
  return runtimeStates.get(projectId);
}

export function initializeRuntime(
  projectId: string,
): RuntimeState {
  const runtimeState: RuntimeState = {
    projectId,
    status: RuntimeStatus.IDLE,
  };

  runtimeStates.set(projectId, runtimeState);

  return runtimeState;
}

export function hasRuntime(
  projectId: string,
): boolean {
  return runtimeStates.has(projectId);
}

export function updateRuntimeStatus(
  projectId: string,
  status: RuntimeStatus,
): RuntimeState | undefined {
  const runtime = runtimeStates.get(projectId);

  if (!runtime) {
    return undefined;
  }

  runtime.status = status;

  return runtime;
}

export function updateRuntime(
  projectId: string,
  updates: Partial<RuntimeState>,
): RuntimeState | undefined {
  const runtime = runtimeStates.get(projectId);

  if (!runtime) {
    return undefined;
  }

  Object.assign(runtime, updates);

  return runtime;
}

export function removeRuntime(
  projectId: string,
): boolean {
  return runtimeStates.delete(projectId);
}