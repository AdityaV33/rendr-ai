export type ModelStatus = "available" | "coolingDown";

export interface ModelMetrics {
  name: string;
  priority: number;
  status: ModelStatus;
  activeRequests: number;
  successCount: number;
  failureCount: number;
  averageLatencyMs: number;
  consecutiveFailures: number;
  cooldownExpiryTimestamp: number | null;
}

export interface ModelSelectionResult {
  model: string;
}
