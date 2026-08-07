export type ModelStatus = "available" | "coolingDown";

export interface ModelMetrics {
  name: string;
  priority: number;
  status: ModelStatus;
  activeRequests: number;
  successCount: number;
  failureCount: number;
  timeoutCount: number;
  rateLimitCount: number;
  averageLatencyMs: number;
  averageAcquireTimeMs: number;
  acquireCalls: number;
  consecutiveFailures: number;
  cooldownExpiryTimestamp: number | null;
}

export interface ModelSelectionResult {
  model: string;
}
