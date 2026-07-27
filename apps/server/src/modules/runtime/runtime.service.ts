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

export function updateRuntimeStatus(
  projectId: string,
  status: RuntimeStatus,
): RuntimeState | undefined {
  const runtimeState = runtimeStates.get(projectId);

  if (!runtimeState) {
    return undefined;
  }

  runtimeState.status = status;

  return runtimeState;
}

export function removeRuntime(
  projectId: string,
): boolean {
  return runtimeStates.delete(projectId);
}

export function hasRuntime(
  projectId: string,
): boolean {
  return runtimeStates.has(projectId);
}