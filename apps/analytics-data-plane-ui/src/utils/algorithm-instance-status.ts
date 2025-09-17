export type Severity = "warn" | "success" | "danger" | "secondary";

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
