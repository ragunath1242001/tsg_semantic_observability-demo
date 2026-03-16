import { Box, Text, useInput, useStdout } from "ink";
import { useCallback, useEffect, useRef, useState } from "react";

import type { ApiClient } from "../api/client.js";
import { ScrollableView } from "../components/scrollable-view.js";
import { Spinner } from "../components/spinner.js";
import type { FileMetadataDto } from "../types.js";
import {
  formatFileSize,
  getErrorMessage,
  getSessionErrorMessage,
  metadataStatusColor,
  truncateStr
} from "../utils.js";
import { FileBrowser } from "./file-browser.js";

type SubView = "list" | "preview" | "file-browser" | "confirm-delete";

interface FilesScreenProps {
  client: ApiClient;
  onBack: () => void;
}

export function FilesScreen({ client, onBack }: FilesScreenProps) {
  const [files, setFiles] = useState<FileMetadataDto[]>([]);
  const [cursor, setCursor] = useState(0);
  const [subView, setSubView] = useState<SubView>("list");
  const [statusMsg, setStatusMsg] = useState("");
  const [previewContent, setPreviewContent] = useState("");
  const [previewFile, setPreviewFile] = useState("");
  const [initialLoad, setInitialLoad] = useState(true);
  const scrollRef = useRef(0);

  const { stdout } = useStdout();
  const termRows = stdout?.rows ?? 24;
  const termCols = stdout?.columns ?? 80;
  // Reserve: header(1) + separator(1) + help(1) + separator(1) + status(1) = 5
  const listViewport = Math.max(4, termRows - 5);

  useEffect(() => {
    setCursor((currentCursor) =>
      Math.min(currentCursor, Math.max(0, files.length - 1))
    );
  }, [files.length]);

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const refreshFiles = useCallback(
    async (isBackground = false) => {
      if (!isBackground) {
        setStatusMsg("Loading files…");
      }
      try {
        const data = await client.listFiles();
        const list = Array.isArray(data) ? data : [];
        setFiles(list);
        setStatusMsg(`${list.length} file(s)`);
      } catch (error: unknown) {
        setStatusMsg(
          `error: ${getSessionErrorMessage(error, "Failed to load files")}`
        );
      }
      setInitialLoad(false);
    },
    [client]
  );

  useEffect(() => {
    refreshFiles(false);
    const interval = setInterval(() => {
      if (subView === "list") refreshFiles(true);
    }, 600_000);
    return () => clearInterval(interval);
  }, [refreshFiles, subView]);

  // ─── Actions ────────────────────────────────────────────────────────────────

  const doPreview = useCallback(async () => {
    if (cursor < 0 || cursor >= files.length) return;
    const file = files[cursor];

    setPreviewFile(file.originalFileName);
    setPreviewContent("Loading preview…");
    setSubView("preview");

    try {
      const content = await client.previewFile(file.id);
      setPreviewContent(content);
    } catch (error: unknown) {
      setPreviewContent(
        `Error loading preview: ${getErrorMessage(error, "Unknown error")}`
      );
    }
  }, [client, cursor, files]);

  const doDelete = useCallback(async () => {
    if (cursor < 0 || cursor >= files.length) return;
    const file = files[cursor];

    setStatusMsg(`Deleting ${file.originalFileName}…`);
    setSubView("list");
    try {
      await client.deleteFile(file.id);
      setStatusMsg(`Deleted ${file.originalFileName}`);
      await refreshFiles(false);
    } catch (error: unknown) {
      setStatusMsg(`error: ${getErrorMessage(error, "Delete failed")}`);
    }
  }, [client, cursor, files, refreshFiles]);

  const handleUpload = useCallback(
    async (filePath: string) => {
      setSubView("list");
      setStatusMsg(`Uploading ${filePath}…`);
      try {
        await client.uploadFile(filePath.trim());
        setStatusMsg("Upload successful!");
        await refreshFiles(false);
        setTimeout(() => refreshFiles(true), 5000);
      } catch (error: unknown) {
        setStatusMsg(
          `Upload error: ${getErrorMessage(error, "Failed to upload")}`
        );
      }
    },
    [client, refreshFiles]
  );

  // ─── Scroll logic for file list ─────────────────────────────────────────────

  {
    let off = scrollRef.current;
    if (cursor < off) off = cursor;
    if (cursor >= off + listViewport) off = cursor - listViewport + 1;
    off = Math.max(0, Math.min(off, Math.max(0, files.length - listViewport)));
    scrollRef.current = off;
  }

  // ─── Key handling ───────────────────────────────────────────────────────────

  // File list keys
  useInput(
    (input, key) => {
      if (key.upArrow || input === "k") {
        setCursor((c) => Math.max(0, c - 1));
      } else if (key.downArrow || input === "j") {
        setCursor((c) => Math.min(files.length - 1, c + 1));
      } else if (input === "u") {
        setSubView("file-browser");
      } else if (input === "d") {
        if (files.length > 0) setSubView("confirm-delete");
      } else if (input === "p" || key.return) {
        doPreview();
      } else if (input === "r") {
        refreshFiles(false);
      } else if (key.escape || input === "b") {
        onBack();
      }
    },
    { isActive: subView === "list" }
  );

  // Confirm delete keys
  useInput(
    (input, key) => {
      if (input === "y") {
        doDelete();
      } else if (input === "n" || key.escape) {
        setSubView("list");
      }
    },
    { isActive: subView === "confirm-delete" }
  );

  // ─── Render: file browser ──────────────────────────────────────────────────

  if (subView === "file-browser") {
    return (
      <FileBrowser
        onSelect={handleUpload}
        onCancel={() => setSubView("list")}
      />
    );
  }

  // ─── Render: preview ───────────────────────────────────────────────────────

  if (subView === "preview") {
    return (
      <ScrollableView
        content={previewContent}
        title="preview"
        label={previewFile}
        isActive={subView === "preview"}
        onClose={() => setSubView("list")}
      />
    );
  }

  // ─── Render: confirm delete ────────────────────────────────────────────────

  if (subView === "confirm-delete" && cursor >= 0 && cursor < files.length) {
    const file = files[cursor];
    return (
      <Box flexDirection="column" paddingX={1} paddingY={1}>
        <Text>
          <Text color="red" bold>
            Delete{" "}
          </Text>
          <Text bold>{file.originalFileName}</Text>
          <Text>?</Text>
        </Text>
        <Text> </Text>
        <Text dimColor>y confirm · n/esc cancel</Text>
      </Box>
    );
  }

  // ─── Render: file list ─────────────────────────────────────────────────────

  const off = scrollRef.current;
  const separator = "─".repeat(Math.min(termCols - 2, 120));

  // Render a single file row
  function renderRow(file: FileMetadataDto, idx: number) {
    const isSelected = idx === cursor;
    const msColor = metadataStatusColor(file.metadataStatus);
    const nameW = Math.max(20, termCols - 40);
    const name = truncateStr(file.originalFileName, nameW);
    const size = formatFileSize(file.fileSizeInBytes);
    const present = file.presentInLastCheck ? "✓" : "✗";
    const presentColor = file.presentInLastCheck ? "green" : "red";

    return (
      <Box key={file.id} flexDirection="column">
        <Text>
          <Text color={isSelected ? "cyan" : undefined} bold={isSelected}>
            {isSelected ? "❯ " : "  "}
            {name}
          </Text>
        </Text>
        <Text>
          <Text dimColor>
            {"    "}
            {size} · {file.mediaType || "unknown"} ·{" "}
          </Text>
          <Text color={presentColor}>{present}</Text>
          <Text dimColor> · </Text>
          <Text color={msColor}>{file.metadataStatus}</Text>
        </Text>
      </Box>
    );
  }

  const visibleFiles = files.slice(off, off + Math.ceil(listViewport / 2));

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box paddingX={1}>
        <Text bold color="cyan">
          Files
        </Text>
        {initialLoad && (
          <Text>
            <Text> </Text>
            <Spinner />
          </Text>
        )}
      </Box>
      <Box paddingX={1}>
        <Text dimColor>{separator}</Text>
      </Box>

      {/* File rows */}
      <Box flexDirection="column" paddingX={1}>
        {files.length === 0 && !initialLoad ? (
          <Text dimColor>No files found.</Text>
        ) : (
          visibleFiles.map((f, i) => renderRow(f, off + i))
        )}
      </Box>

      {/* Bottom bar */}
      <Box paddingX={1}>
        <Text dimColor>{separator}</Text>
      </Box>
      <Box paddingX={1}>
        <Text dimColor>
          ↑↓ navigate · enter/p preview · u upload · d delete · r refresh · b
          back
        </Text>
        <Text> </Text>
        <Text dimColor>| {statusMsg}</Text>
      </Box>
    </Box>
  );
}
