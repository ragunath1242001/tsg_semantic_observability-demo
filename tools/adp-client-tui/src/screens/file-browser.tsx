import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { Box, Text, useInput, useStdout } from "ink";
import { useRef, useState } from "react";

import { TextInput } from "../components/text-input.js";
import { formatFileSize } from "../utils.js";

interface FileBrowserProps {
  onSelect: (filePath: string) => void;
  onCancel: () => void;
}

interface DirEntry {
  name: string;
  fullPath: string;
  isDirectory: boolean;
  size: number;
}

function resolvePath(inputPath: string): string {
  let resolved = inputPath.trim();
  if (resolved.startsWith("~")) {
    resolved = resolved.replace("~", os.homedir());
  }
  return path.resolve(resolved);
}

function truncatePath(fullPath: string, maxWidth: number): string {
  if (fullPath.length <= maxWidth) return fullPath;
  const ellipsis = "…/";
  const available = maxWidth - ellipsis.length;
  if (available <= 0) return fullPath.slice(-maxWidth);
  const parts = fullPath.split(path.sep);
  let result = "";
  for (let i = parts.length - 1; i >= 0; i--) {
    const candidate =
      i === parts.length - 1 ? parts[i] : parts[i] + path.sep + result;
    if (candidate.length > available && result.length > 0) break;
    result = candidate;
  }
  return ellipsis + result;
}

function readDirectory(dirPath: string, showHidden: boolean): DirEntry[] {
  try {
    const dirEntries = fs.readdirSync(dirPath, { withFileTypes: true });
    const result: DirEntry[] = [];

    for (const entry of dirEntries) {
      if (!showHidden && entry.name.startsWith(".")) continue;

      const fullPath = path.join(dirPath, entry.name);
      let size = 0;
      const isDir = entry.isDirectory();

      if (!isDir) {
        try {
          size = fs.statSync(fullPath).size;
        } catch {
          // ignore stat errors
        }
      }

      result.push({ name: entry.name, fullPath, isDirectory: isDir, size });
    }

    result.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    return result;
  } catch {
    return [];
  }
}

export function FileBrowser({ onSelect, onCancel }: FileBrowserProps) {
  const [currentDir, setCurrentDir] = useState(process.cwd());
  const [showHidden, setShowHidden] = useState(false);
  const [mode, setMode] = useState<"browse" | "input">("browse");
  const [pathValue, setPathValue] = useState("");
  const [cursor, setCursor] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const scrollRef = useRef(0);

  const { stdout } = useStdout();
  const termRows = stdout?.rows ?? 24;
  const termCols = stdout?.columns ?? 80;

  const entries = readDirectory(currentDir, showHidden);
  // +1 for the ".." parent entry
  const totalItems = entries.length + 1;

  // Reserve: path(1) + input(1) + separator(1) + help(1) = 4
  const viewportHeight = Math.max(4, termRows - 4);

  // Scroll logic
  let off = scrollRef.current;
  if (cursor < off) off = cursor;
  if (cursor >= off + viewportHeight) off = cursor - viewportHeight + 1;
  off = Math.max(0, Math.min(off, Math.max(0, totalItems - viewportHeight)));
  scrollRef.current = off;

  function navigateToDir(dirPath: string) {
    try {
      fs.accessSync(dirPath, fs.constants.R_OK);
      setCurrentDir(dirPath);
      setCursor(0);
      scrollRef.current = 0;
      setStatusMsg("");
    } catch {
      setStatusMsg(`Cannot access: ${dirPath}`);
    }
  }

  function selectItem() {
    if (cursor === 0) {
      navigateToDir(path.dirname(currentDir));
      return;
    }
    const entry = entries[cursor - 1];
    if (!entry) return;
    if (entry.isDirectory) {
      navigateToDir(entry.fullPath);
    } else {
      onSelect(entry.fullPath);
    }
  }

  function handlePathSubmit() {
    if (!pathValue || !pathValue.trim()) {
      setMode("browse");
      return;
    }
    const resolved = resolvePath(pathValue);
    try {
      const stat = fs.statSync(resolved);
      if (stat.isDirectory()) {
        navigateToDir(resolved);
        setMode("browse");
      } else if (stat.isFile()) {
        onSelect(resolved);
      }
    } catch {
      setStatusMsg(`Path not found: ${resolved}`);
      setMode("browse");
    }
  }

  // ─── Key handling: browse mode ──────────────────────────────────────────────

  useInput(
    (input, key) => {
      if (key.upArrow || input === "k") {
        setCursor((c) => Math.max(0, c - 1));
      } else if (key.downArrow || input === "j") {
        setCursor((c) => Math.min(totalItems - 1, c + 1));
      } else if (key.return) {
        selectItem();
      } else if (key.backspace) {
        navigateToDir(path.dirname(currentDir));
      } else if (key.tab) {
        setPathValue("");
        setMode("input");
      } else if (input === ".") {
        setShowHidden((h) => !h);
      } else if (input === "~") {
        navigateToDir(os.homedir());
      } else if (key.escape) {
        onCancel();
      }
    },
    { isActive: mode === "browse" }
  );

  // ─── Render ─────────────────────────────────────────────────────────────────

  const displayPath = truncatePath(currentDir, termCols - 12);
  const separator = "─".repeat(Math.min(termCols - 2, 120));

  // Build visible item rows
  const visibleItems: { key: string; content: React.ReactElement }[] = [];
  for (let i = off; i < Math.min(totalItems, off + viewportHeight); i++) {
    const isSelected = i === cursor && mode === "browse";

    if (i === 0) {
      visibleItems.push({
        key: "..",
        content: (
          <Text>
            <Text color={isSelected ? "cyan" : undefined} bold={isSelected}>
              {isSelected ? "❯ " : "  "}
            </Text>
            <Text color="cyan" bold={isSelected}>
              ..
            </Text>
            <Text dimColor> (parent)</Text>
          </Text>
        )
      });
    } else {
      const entry = entries[i - 1];
      const dirSlash = entry.isDirectory ? "/" : "";
      const size = entry.isDirectory ? "" : " " + formatFileSize(entry.size);

      visibleItems.push({
        key: entry.fullPath,
        content: (
          <Text>
            <Text color={isSelected ? "cyan" : undefined} bold={isSelected}>
              {isSelected ? "❯ " : "  "}
            </Text>
            <Text
              color={entry.isDirectory ? "cyan" : undefined}
              bold={isSelected}>
              {entry.name + dirSlash}
            </Text>
            <Text dimColor>{size}</Text>
          </Text>
        )
      });
    }
  }

  return (
    <Box flexDirection="column">
      {/* Path + input */}
      <Box paddingX={1}>
        <Text dimColor>path </Text>
        {mode === "input" ? (
          <TextInput
            value={pathValue}
            onChange={setPathValue}
            onSubmit={handlePathSubmit}
            onCancel={() => setMode("browse")}
            isActive={true}
            placeholder="type a path and press enter…"
          />
        ) : (
          <Text bold>{displayPath}</Text>
        )}
      </Box>

      <Box paddingX={1}>
        <Text dimColor>{separator}</Text>
      </Box>

      {/* File list */}
      <Box flexDirection="column" paddingX={1}>
        {visibleItems.map((item) => (
          <Box key={item.key}>{item.content}</Box>
        ))}
      </Box>

      {/* Help bar */}
      <Box paddingX={1}>
        <Text dimColor>{separator}</Text>
      </Box>
      <Box paddingX={1}>
        <Text dimColor>
          enter open · bksp up · tab path · . hidden · ~ home · esc cancel
        </Text>
        {statusMsg ? (
          <Text>
            <Text> </Text>
            <Text color="red">| {statusMsg}</Text>
          </Text>
        ) : null}
      </Box>
    </Box>
  );
}
