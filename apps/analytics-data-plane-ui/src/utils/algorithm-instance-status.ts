export type Severity = "warn" | "success" | "danger" | "secondary" | "info";

// Maps algorithm instance statuses to PrimeVue severity tokens.
export const getStatusSeverity = (status?: string): Severity => {
  switch (status) {
    case "pending":
      return "secondary";
    case "running":
      return "warn";
    case "completed":
      return "success";
    case "failed":
      return "danger";
    default:
      return "secondary";
  }
};

/**
 * Maps instance-wide orchestration statuses to PrimeVue severity tokens.
 * Orchestration status reflects the overall outcome across all participants,
 * which is distinct from the local job status.
 */
export const getOrchestrationStatusSeverity = (status?: string): Severity => {
  switch (status) {
    case "pending":
      return "secondary";
    case "running":
      return "info";
    case "completed":
      return "success";
    case "error":
      return "danger";
    default:
      return "secondary";
  }
};

/**
 * Returns a human-readable label for orchestration statuses.
 */
export const getOrchestrationStatusLabel = (status?: string): string => {
  switch (status) {
    case "error":
      return "error (participant failed)";
    default:
      return status ?? "-";
  }
};
