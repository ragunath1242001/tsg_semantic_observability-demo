import { Box, Text, useInput, useStdout } from "ink";
import { useState } from "react";

interface MainMenuProps {
  baseUrl: string;
  userName: string | null;
  onSelect: (choice: "files" | "instances" | "quit") => void;
}

const MENU_ITEMS = [
  {
    label: "Files",
    value: "files" as const,
    description: "Browse, upload, delete and preview data files"
  },
  {
    label: "Algorithm Instances",
    value: "instances" as const,
    description: "View running and completed algorithm instances"
  },
  {
    label: "Quit",
    value: "quit" as const,
    description: "Exit the TUI"
  }
];

export function MainMenu({ baseUrl, userName, onSelect }: MainMenuProps) {
  const [cursor, setCursor] = useState(0);
  const { stdout } = useStdout();
  const cols = stdout?.columns ?? 80;

  useInput((input, key) => {
    if (key.upArrow || input === "k") {
      setCursor((c) => Math.max(0, c - 1));
    }
    if (key.downArrow || input === "j") {
      setCursor((c) => Math.min(MENU_ITEMS.length - 1, c + 1));
    }
    if (key.return) {
      onSelect(MENU_ITEMS[cursor].value);
    }
    if (input === "q") {
      onSelect("quit");
    }
  });

  const separator = "─".repeat(Math.min(60, cols - 2));

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Title */}
      <Box marginTop={1}>
        <Text bold color="cyan">
          Analytics Data Plane
        </Text>
        <Text dimColor> · Client TUI</Text>
      </Box>

      {/* Connection info */}
      <Box marginTop={1} flexDirection="column">
        <Text>
          <Text dimColor>endpoint </Text>
          <Text>{baseUrl}</Text>
        </Text>
        <Text>
          <Text dimColor>user </Text>
          {userName ? (
            <Text color="green">{userName}</Text>
          ) : (
            <Text dimColor italic>
              auth disabled
            </Text>
          )}
        </Text>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>{separator}</Text>
      </Box>

      {/* Menu items */}
      <Box flexDirection="column" marginTop={1}>
        {MENU_ITEMS.map((item, i) => {
          const selected = i === cursor;
          return (
            <Box key={item.value} flexDirection="column">
              <Text>
                <Text color={selected ? "cyan" : undefined} bold={selected}>
                  {selected ? "❯ " : "  "}
                  {item.label}
                </Text>
              </Text>
              {selected && <Text dimColor> {item.description}</Text>}
            </Box>
          );
        })}
      </Box>

      {/* Help */}
      <Box marginTop={1}>
        <Text dimColor>{separator}</Text>
      </Box>
      <Box>
        <Text dimColor>↑↓ navigate · enter select · q quit</Text>
      </Box>
    </Box>
  );
}
