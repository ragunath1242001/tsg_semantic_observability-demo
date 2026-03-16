import { Box, Text, useInput, useStdout } from "ink";
import { useCallback, useEffect, useRef, useState } from "react";

import type { ApiClient } from "../api/client.js";
import { Spinner } from "../components/spinner.js";
import type { AlgorithmInstanceDto } from "../types.js";
import {
  formatDate,
  getSessionErrorMessage,
  instanceStatusColor,
  truncateStr
} from "../utils.js";

interface AlgorithmInstancesScreenProps {
  client: ApiClient;
  onBack: () => void;
  onSelect: (instance: AlgorithmInstanceDto) => void;
}

export function AlgorithmInstancesScreen({
  client,
  onBack,
  onSelect
}: AlgorithmInstancesScreenProps) {
  const [instances, setInstances] = useState<AlgorithmInstanceDto[]>([]);
  const [cursor, setCursor] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [initialLoad, setInitialLoad] = useState(true);
  const scrollRef = useRef(0);

  const { stdout } = useStdout();
  const termRows = stdout?.rows ?? 24;
  const termCols = stdout?.columns ?? 80;
  // Each instance row takes 2 lines (name + details), reserve header(1)+sep(1)+sep(1)+help(1) = 4
  const viewportHeight = Math.max(4, termRows - 4);

  useEffect(() => {
    setCursor((currentCursor) =>
      Math.min(currentCursor, Math.max(0, instances.length - 1))
    );
  }, [instances.length]);

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const refreshInstances = useCallback(async () => {
    try {
      const data = await client.listAlgorithmInstances();
      const list = Array.isArray(data) ? data : [];
      list.sort(
        (a, b) =>
          new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
      );
      setInstances(list);
      setStatusMsg(`${list.length} instance(s)`);
    } catch (error: unknown) {
      setStatusMsg(
        `error: ${getSessionErrorMessage(error, "Failed to load instances")}`
      );
    }
    setInitialLoad(false);
  }, [client]);

  // ─── WebSocket live updates ─────────────────────────────────────────────────

  useEffect(() => {
    refreshInstances();

    // Any algorithm event indicates instance activity – refresh the list.
    let socket: ReturnType<typeof client.connectSocket> | undefined;
    try {
      socket = client.connectSocket();
      const onAnyEvent = () => refreshInstances();
      socket.on("event:algorithm:create", onAnyEvent);
      socket.on("event:internal:create", onAnyEvent);

      return () => {
        socket?.off("event:algorithm:create", onAnyEvent);
        socket?.off("event:internal:create", onAnyEvent);
        client.disconnectSocket();
      };
    } catch {
      // WebSocket unavailable – fall back to a slow poll
    }

    const interval = setInterval(refreshInstances, 15_000);
    return () => clearInterval(interval);
  }, [client, refreshInstances]);

  // ─── Scroll logic ──────────────────────────────────────────────────────────

  // Each item takes ~2 lines, so effective viewport is half
  const itemsInView = Math.max(2, Math.floor(viewportHeight / 2));
  {
    let off = scrollRef.current;
    if (cursor < off) off = cursor;
    if (cursor >= off + itemsInView) off = cursor - itemsInView + 1;
    off = Math.max(
      0,
      Math.min(off, Math.max(0, instances.length - itemsInView))
    );
    scrollRef.current = off;
  }

  // ─── Key handling ──────────────────────────────────────────────────────────

  useInput((input, key) => {
    if (key.upArrow || input === "k") {
      setCursor((c) => Math.max(0, c - 1));
    } else if (key.downArrow || input === "j") {
      setCursor((c) => Math.min(instances.length - 1, c + 1));
    } else if (key.return) {
      if (cursor >= 0 && cursor < instances.length) {
        onSelect(instances[cursor]);
      }
    } else if (input === "r") {
      refreshInstances();
    } else if (key.escape || input === "b") {
      onBack();
    }
  });

  // ─── Render ─────────────────────────────────────────────────────────────────

  const off = scrollRef.current;
  const separator = "─".repeat(Math.min(termCols - 2, 120));

  function renderRow(inst: AlgorithmInstanceDto, idx: number) {
    const isSelected = idx === cursor;
    const title = inst.algorithmDefinition?.title || "Untitled";
    const status = inst.status.toUpperCase();
    const sColor = instanceStatusColor(status);
    const participants = inst.participants?.length || 0;
    const created = formatDate(inst.createdDate);
    const id = inst.id.slice(0, 8);

    return (
      <Box key={inst.id} flexDirection="column">
        <Text>
          <Text color={isSelected ? "cyan" : undefined} bold={isSelected}>
            {isSelected ? "❯ " : "  "}
            {truncateStr(title, termCols - 20)}
          </Text>
          <Text> </Text>
          <Text color={sColor}>{status}</Text>
        </Text>
        <Text dimColor>
          {"    "}
          {id} · {participants} participant(s) · {created}
        </Text>
      </Box>
    );
  }

  const visibleInstances = instances.slice(off, off + itemsInView);

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box paddingX={1}>
        <Text bold color="cyan">
          Algorithm Instances
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

      {/* Instance rows */}
      <Box flexDirection="column" paddingX={1}>
        {instances.length === 0 && !initialLoad ? (
          <Text dimColor>No algorithm instances found.</Text>
        ) : (
          visibleInstances.map((inst, i) => renderRow(inst, off + i))
        )}
      </Box>

      {/* Bottom bar */}
      <Box paddingX={1}>
        <Text dimColor>{separator}</Text>
      </Box>
      <Box paddingX={1}>
        <Text dimColor>↑↓ navigate · enter details · r refresh · b back</Text>
        <Text> </Text>
        <Text dimColor>| {statusMsg}</Text>
      </Box>
    </Box>
  );
}
