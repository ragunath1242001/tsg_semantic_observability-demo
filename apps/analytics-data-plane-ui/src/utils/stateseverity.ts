export const stateSeverity = (state: string) => {
  switch (state) {
    case "dspace:STARTED":
      return "primary";
    case "dspace:COMPLETED":
      return "success";
    case "dspace:REQUESTED":
      return "info";
    case "dspace:TERMINATED":
      return "danger";
    case "dspace:SUSPENDED":
      return "warn";
  }
};
