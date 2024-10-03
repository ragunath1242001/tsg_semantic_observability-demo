export function formatDate(
  dateString: Date | string | undefined,
  milliseconds: boolean = false
) {
  if (!dateString) {
    return `-`;
  }
  const date = new Date(dateString);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}${
    milliseconds ? "." + String(date.getMilliseconds()).padStart(3, "0") : ""
  }`;
}
