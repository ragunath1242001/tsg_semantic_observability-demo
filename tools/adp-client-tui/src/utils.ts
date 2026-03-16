// ─── Shared utility functions ─────────────────────────────────────────────────

export interface ErrorWithResponse extends Error {
  response?: {
    status?: number;
    data?: unknown;
  };
}

function responseMessage(data: unknown): string | undefined {
  if (
    typeof data === "object" &&
    data !== null &&
    "message" in data &&
    typeof (data as { message?: unknown }).message === "string"
  ) {
    return (data as { message: string }).message;
  }

  return undefined;
}

export function asErrorWithResponse(error: unknown): ErrorWithResponse {
  if (error instanceof Error) {
    return error as ErrorWithResponse;
  }

  return new Error(typeof error === "string" ? error : "Unknown error");
}

export function isUnauthorizedError(error: unknown): boolean {
  return asErrorWithResponse(error).response?.status === 401;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  const typedError = asErrorWithResponse(error);

  return (
    responseMessage(typedError.response?.data) ?? typedError.message ?? fallback
  );
}

export function getSessionErrorMessage(
  error: unknown,
  fallback: string
): string {
  return isUnauthorizedError(error)
    ? "Session expired – please restart and log in again"
    : getErrorMessage(error, fallback);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export type InkColor =
  | "green"
  | "cyan"
  | "yellow"
  | "red"
  | "white"
  | "magenta"
  | "blue"
  | "gray"
  | "grey";

export function instanceStatusColor(status: string): InkColor {
  switch (status?.toUpperCase()) {
    case "RUNNING":
    case "STARTED":
      return "green";
    case "FINISHED":
    case "COMPLETED":
      return "cyan";
    case "PENDING":
    case "CREATED":
      return "yellow";
    case "FAILED":
    case "TERMINATED":
    case "ERROR":
      return "red";
    default:
      return "white";
  }
}

export function metadataStatusColor(status: string): InkColor {
  switch (status?.toLowerCase()) {
    case "complete":
      return "green";
    case "generating":
    case "pending":
      return "yellow";
    case "error":
      return "red";
    default:
      return "white";
  }
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function formatDateWithSeconds(dateStr?: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

export function formatTime(dateStr?: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

export function truncateStr(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + "…";
}
