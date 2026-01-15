export type TransferAction = "start" | "complete" | "terminate" | "suspend";

export type EndpointAction =
  | "start"
  | "completion"
  | "termination"
  | "suspension";

export function endpointFor(action: TransferAction): EndpointAction {
  switch (action) {
    case "start":
      return "start";
    case "complete":
      return "completion";
    case "terminate":
      return "termination";
    case "suspend":
      return "suspension";
  }
}
