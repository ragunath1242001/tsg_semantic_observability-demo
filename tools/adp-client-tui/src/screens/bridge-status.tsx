import { Box, Text, useInput, useStdout } from "ink";
import { useCallback, useEffect, useState } from "react";

import type { ApiClient } from "../api/client.js";
import { Spinner } from "../components/spinner.js";
import type { BridgeClientStatusDto } from "../types.js";
import { formatDate, getSessionErrorMessage } from "../utils.js";

interface BridgeStatusScreenProps {
  client: ApiClient;
  onBack: () => void;
}

function formatDuration(ms?: number): string {
  if (ms === undefined || ms < 0) return "-";

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function statusColor(status: BridgeClientStatusDto["status"]) {
  switch (status) {
    case "connected":
      return "green" as const;
    case "disconnected":
      return "red" as const;
    default:
      return "yellow" as const;
  }
}

function Field({
  label,
  value,
  color
}: {
  label: string;
  value: string;
  color?: "green" | "red" | "yellow" | "cyan" | "white" | "gray" | "grey";
}) {
  return (
    <Text>
      <Text dimColor>{label.padEnd(22, " ")}</Text>
      <Text color={color}>{value}</Text>
    </Text>
  );
}

export function BridgeStatusScreen({
  client,
  onBack
}: BridgeStatusScreenProps) {
  const [bridgeStatus, setBridgeStatus] =
    useState<BridgeClientStatusDto | null>(null);
  const [statusMsg, setStatusMsg] = useState("Loading bridge status…");
  const [initialLoad, setInitialLoad] = useState(true);

  const { stdout } = useStdout();
  const termCols = stdout?.columns ?? 80;
  const separator = "─".repeat(Math.min(termCols - 2, 120));

  const refreshStatus = useCallback(
    async (isBackground = false) => {
      if (!isBackground) {
        setStatusMsg("Loading bridge status…");
      }

      try {
        const nextStatus = await client.getBridgeStatus();
        setBridgeStatus(nextStatus);

        if (nextStatus.status === "connected") {
          setStatusMsg("Bridge connected");
        } else if (nextStatus.status === "disconnected") {
          setStatusMsg("Bridge disconnected");
        } else {
          setStatusMsg("Bridge not configured");
        }
      } catch (error: unknown) {
        setStatusMsg(
          `error: ${getSessionErrorMessage(error, "Failed to load bridge status")}`
        );
      }

      setInitialLoad(false);
    },
    [client]
  );

  useEffect(() => {
    refreshStatus(false);

    const interval = setInterval(() => {
      refreshStatus(true);
    }, 10_000);

    return () => clearInterval(interval);
  }, [refreshStatus]);

  useInput((input, key) => {
    if (input === "r") {
      refreshStatus(false);
    } else if (key.escape || input === "b") {
      onBack();
    }
  });

  return (
    <Box flexDirection="column">
      <Box paddingX={1}>
        <Text bold color="cyan">
          Bridge Status
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

      <Box flexDirection="column" paddingX={1}>
        {!bridgeStatus && !initialLoad ? (
          <Text dimColor>No bridge status available.</Text>
        ) : bridgeStatus ? (
          <>
            <Field label="Mode" value={bridgeStatus.mode} />
            <Field
              label="WebSocket status"
              value={bridgeStatus.status}
              color={statusColor(bridgeStatus.status)}
            />
            <Field label="Server URL" value={bridgeStatus.serverUrl ?? "-"} />
            <Field
              label="OAuth client"
              value={bridgeStatus.oauthClientId ?? "-"}
            />
            <Field
              label="Connected at"
              value={formatDate(bridgeStatus.connectedAt)}
            />
            {bridgeStatus.disconnectedAt !== undefined ? (
              <Field
                label="Disconnected at"
                value={formatDate(bridgeStatus.disconnectedAt)}
              />
            ) : null}
            <Field
              label="Connection uptime"
              value={formatDuration(bridgeStatus.uptimeMs)}
            />
            <Field
              label="Last message sent"
              value={formatDate(bridgeStatus.lastMessageSentAt)}
            />
            <Field
              label="Last message received"
              value={formatDate(bridgeStatus.lastMessageReceivedAt)}
            />
            {bridgeStatus.status !== "connected" ? (
              <Field
                label="Reconnecting"
                value={bridgeStatus.reconnecting ? "yes" : "no"}
                color={bridgeStatus.reconnecting ? "yellow" : "white"}
              />
            ) : null}
            {bridgeStatus.status !== "connected" ? (
              <Field
                label="Reconnect attempts"
                value={String(bridgeStatus.reconnectAttempts)}
              />
            ) : null}
          </>
        ) : null}
      </Box>

      <Box paddingX={1}>
        <Text dimColor>{separator}</Text>
      </Box>
      <Box paddingX={1}>
        <Text dimColor>r refresh · b back</Text>
        <Text> </Text>
        <Text dimColor>| {statusMsg}</Text>
      </Box>
    </Box>
  );
}
