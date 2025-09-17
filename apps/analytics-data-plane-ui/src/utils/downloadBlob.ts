export const triggerBlobDownload = (blob: Blob, filename: string) => {
  if (!(blob instanceof Blob)) {
    console.warn("triggerBlobDownload called without a valid Blob instance");
    return;
  }
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
};
