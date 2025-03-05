export interface ErrorContext {
  error: any;
  summary: string;
  defaultMessage?: string;
  severity?: "success" | "info" | "warn" | "error" | "secondary" | "contrast";
  life?: number;
  maxMessageLength?: number;
}

export const toastError = (context: ErrorContext) => {
  let message =
    context.error?.response?.data?.message ??
    context.defaultMessage ??
    context.error?.message;
  if (context.error?.errors) {
    message = context.error?.message;
  }
  if (message.length > (context.maxMessageLength ?? 768)) {
    message = message.slice(0, context.maxMessageLength ?? 768) + "...";
  }
  return {
    severity: context.severity ?? "warn",
    summary: context.summary,
    detail: message,
    life: context.life ?? 10000
  };
};
