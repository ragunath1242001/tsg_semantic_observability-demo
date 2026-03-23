export const severitySeverity = (severity: string) => {
  switch (severity) {
    case "debug":
      return "secondary";
    case "info":
      return "info";
    case "warning":
      return "warn";
    case "error":
    case "critical":
      return "danger";
    default:
      return "secondary";
  }
};

export const actionSeverity = (action: string) => {
  switch (action) {
    case "read":
    case "execute":
      return "info";
    case "create":
      return "success";
    case "update":
    case "manage":
      return "warning";
    case "delete":
      return "danger";
    default:
      if (action.startsWith("read")) return "info";
      if (action.startsWith("write") || action.startsWith("delete")) {
        return "warning";
      }
      return "secondary";
  }
};

export const resultSeverity = (allowed: boolean) => {
  return allowed ? "success" : "danger";
};

export const resultLabel = (allowed: boolean) => {
  return allowed ? "Allowed" : "Denied";
};

export const callerTypeIcon = (type: string) => {
  switch (type) {
    case "user":
      return "pi pi-user";
    case "service":
      return "pi pi-server";
    case "machine":
      return "pi pi-code";
    default:
      return "pi pi-question";
  }
};

export const callerToolTip = (type: string) => {
  switch (type) {
    case "user":
      return "User";
    case "service":
      return "Service";
    case "machine":
      return "Internal process";
    default:
      return "Unknown caller type";
  }
};
