export function formatDate(dateString: Date | string | undefined) {
  if (!dateString) {
    return `-`
  }
  const date = new Date(dateString);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
}