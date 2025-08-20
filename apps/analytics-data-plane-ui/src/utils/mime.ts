export const mimeToUrl = (mimeType: string): string => {
  const icon = mimeToIcon(mimeType);
  return `https://api.iconify.design/fa7-regular/${icon}.svg?color=%23d4d4d8`;
};

export const mimeToIcon = (mimeType: string): string => {
  const mimeTypeMatch = mimeType.match(/^(.*?)\/(.*?)(;\s*.*)?$/);
  let type = "unknown";
  let subtype = "unknown";

  if (mimeTypeMatch) {
    type = mimeTypeMatch[1];
    subtype = mimeTypeMatch[2];
  } else {
    return "file";
  }

  switch (type) {
    case "video":
      return "file-video";
    case "audio":
      return "file-audio";
    case "text":
      switch (subtype) {
        case "plain":
          return "file-text";
        case "html":
          return "file-code";
        case "css":
          return "file-code";
        case "javascript":
          return "file-code";
        default:
          return "file-text";
      }
    case "application":
      switch (subtype) {
        case "json":
          return "file-code";
        case "xml":
          return "file-code";
        case "pdf":
          return "file-pdf";
        case "zip":
          return "file-archive";
        case "x-zip-compressed":
          return "file-archive";
        case "gzip":
          return "file-archive";
        case "x-gzip":
          return "file-archive";
        case "x-tar":
          return "file-archive";
        case "7z":
          return "file-archive";

        default:
          return "file";
      }
    default:
      return "file";
  }
};
