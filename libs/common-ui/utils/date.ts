import dayjs, { Dayjs } from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

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

export function formatRelative(
  date: string | number | Date | Dayjs,
  withoutSuffix: boolean = false
): string {
  return dayjs(date).fromNow(withoutSuffix);
}
