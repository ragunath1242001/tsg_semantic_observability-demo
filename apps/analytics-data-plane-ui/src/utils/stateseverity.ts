export const stateSeverity = (state: string) => {
  switch (state) {
    case "STARTED":
      return "primary";
    case "COMPLETED":
      return "success";
    case "REQUESTED":
      return "info";
    case "TERMINATED":
      return "danger";
    case "SUSPENDED":
      return "warn";
  }
};
