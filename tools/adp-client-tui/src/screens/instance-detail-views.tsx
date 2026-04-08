import { Box, Text } from "ink";

import { Spinner } from "../components/spinner.js";
import type { AlgorithmInstanceDto, JobInfo, PodInfo } from "../types.js";
import {
  determineJobStatus,
  formatTime,
  jobStatusColor,
  truncateStr
} from "../utils.js";
import type {
  EventFilter,
  InstanceInfoRow,
  LatestInternalEventValue,
  MergedEvent
} from "./instance-detail-model.js";

interface InfoViewProps {
  currentInstance: AlgorithmInstanceDto;
  infoRows: InstanceInfoRow[];
  initialLoad: boolean;
  separator: string;
  latestInternalEventValues: LatestInternalEventValue[];
  eventCount: { algorithm: number; internal: number };
  allEventsCount: number;
  termCols: number;
}

export function InstanceInfoView({
  currentInstance,
  infoRows,
  initialLoad,
  separator,
  latestInternalEventValues,
  eventCount,
  allEventsCount,
  termCols
}: InfoViewProps) {
  return (
    <Box flexDirection="column">
      <Box paddingX={1}>
        <Text bold color="cyan">
          {currentInstance.algorithmDefinition?.title || "Instance Detail"}
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

      <Box flexDirection="column" paddingX={1} marginTop={1}>
        {infoRows.map((row) => (
          <Text key={row.label}>
            <Text dimColor>{row.label.padEnd(12)}</Text>
            <Text color={row.color}>{row.value}</Text>
          </Text>
        ))}
      </Box>

      <Box paddingX={1} marginTop={1}>
        <Text bold>Participants</Text>
      </Box>
      <Box flexDirection="column" paddingX={1}>
        {(currentInstance.participants || []).length === 0 ? (
          <Text dimColor>No participants</Text>
        ) : (
          (currentInstance.participants || []).map((participant, index) => (
            <Text key={`${participant.didId}-${participant.role}-${index}`}>
              <Text dimColor>{(index + 1 + ".").padEnd(4)}</Text>
              <Text bold>{participant.role}</Text>
              <Text dimColor> · </Text>
              <Text>{truncateStr(participant.didId, termCols - 30)}</Text>
              {participant.dataset ? (
                <Text>
                  <Text dimColor> · </Text>
                  <Text>{participant.dataset}</Text>
                </Text>
              ) : null}
            </Text>
          ))
        )}
      </Box>

      <Box paddingX={1} marginTop={1}>
        <Text bold>Latest internal events</Text>
      </Box>
      <Box flexDirection="column" paddingX={1}>
        {latestInternalEventValues.length === 0 ? (
          <Text dimColor>No internal events with data</Text>
        ) : (
          latestInternalEventValues.map((event, index) => (
            <Text key={`${event.name}-${index}`}>
              <Text dimColor>{(index + 1 + ".").padEnd(4)}</Text>
              <Text bold>{event.name}</Text>
              <Text dimColor> · </Text>
              <Text>{truncateStr(event.value, termCols - 30)}</Text>
            </Text>
          ))
        )}
      </Box>

      <Box paddingX={1} marginTop={1}>
        <Text dimColor>{allEventsCount} event(s) total - </Text>
        <Text color="magenta">{eventCount.algorithm} algorithm</Text>
        <Text dimColor> · </Text>
        <Text color="cyan">{eventCount.internal} internal</Text>
      </Box>

      <Box paddingX={1} marginTop={1}>
        <Text dimColor>{separator}</Text>
      </Box>
      <Box paddingX={1}>
        <Text dimColor>e events · l logs · r refresh · b back</Text>
      </Box>
    </Box>
  );
}

interface EventsViewProps {
  currentInstance: AlgorithmInstanceDto;
  separator: string;
  eventFilter: EventFilter;
  filteredEvents: MergedEvent[];
  visibleEvents: MergedEvent[];
  initialOffset: number;
  cursor: number;
  initialLoad: boolean;
  statusMsg: string;
  termCols: number;
}

export function InstanceEventsView({
  currentInstance,
  separator,
  eventFilter,
  filteredEvents,
  visibleEvents,
  initialOffset,
  cursor,
  initialLoad,
  statusMsg,
  termCols
}: EventsViewProps) {
  const filterLabel =
    eventFilter === "all"
      ? "all"
      : eventFilter === "algorithm"
        ? "algorithm"
        : "internal";

  return (
    <Box flexDirection="column">
      <Box paddingX={1}>
        <Text bold color="cyan">
          Events
        </Text>
        <Text dimColor>
          {" "}
          · {currentInstance.algorithmDefinition?.title || "Instance"} ·
          filter:{" "}
        </Text>
        <Text color="cyan">{filterLabel}</Text>
      </Box>
      <Box paddingX={1}>
        <Text dimColor>{separator}</Text>
      </Box>

      <Box flexDirection="column" paddingX={1}>
        {filteredEvents.length === 0 && !initialLoad ? (
          <Text dimColor>No events.</Text>
        ) : (
          visibleEvents.map((event, index) => {
            const absoluteIndex = initialOffset + index;
            const isSelected = absoluteIndex === cursor;
            const typeColor = event.type === "algorithm" ? "magenta" : "cyan";
            const typeLabel =
              event.type === "algorithm" ? "algorithm" : "internal";

            return (
              <Box
                key={`${event.type}-${event.number}-${event.timestamp}`}
                flexDirection="column">
                <Text>
                  <Text
                    color={isSelected ? "cyan" : undefined}
                    bold={isSelected}>
                    {isSelected ? "❯ " : "  "}
                    {event.name}
                  </Text>
                  <Text> </Text>
                  <Text color={typeColor}>{typeLabel}</Text>
                  <Text dimColor> #{event.number}</Text>
                </Text>
                <Text dimColor>
                  {"    "}
                  {formatTime(event.timestamp)}
                  {event.details
                    ? ` · ${truncateStr(event.details, termCols - 30)}`
                    : ""}
                </Text>
              </Box>
            );
          })
        )}
      </Box>

      <Box paddingX={1}>
        <Text dimColor>{separator}</Text>
      </Box>
      <Box paddingX={1}>
        <Text dimColor>
          ↑↓ navigate · enter view · s save · a/i/* filter · t info · r refresh
          · b back
        </Text>
        {statusMsg ? (
          <Text>
            <Text> </Text>
            <Text dimColor>| {statusMsg}</Text>
          </Text>
        ) : null}
      </Box>
    </Box>
  );
}

interface JobsViewProps {
  currentInstance: AlgorithmInstanceDto;
  jobs: JobInfo[];
  jobsCursor: number;
  jobsOffset: number;
  logsLoading: boolean;
  separator: string;
  statusMsg: string;
}

export function InstanceJobsView({
  currentInstance,
  jobs,
  jobsCursor,
  jobsOffset,
  logsLoading,
  separator,
  statusMsg
}: JobsViewProps) {
  return (
    <Box flexDirection="column">
      <Box paddingX={1}>
        <Text bold color="cyan">
          Jobs
        </Text>
        <Text dimColor>
          {" "}
          · {currentInstance.algorithmDefinition?.title || "Instance"}
        </Text>
        {logsLoading && (
          <Text>
            {" "}
            <Spinner />
          </Text>
        )}
      </Box>
      <Box paddingX={1}>
        <Text dimColor>{separator}</Text>
      </Box>
      <Box flexDirection="column" paddingX={1}>
        {jobs.length === 0 && !logsLoading ? (
          <Text dimColor>No jobs found.</Text>
        ) : (
          jobs.map((job, index) => {
            const name = job.metadata?.name ?? `job-${jobsOffset + index}`;
            const active = job.status?.active ?? 0;
            const succeeded = job.status?.succeeded ?? 0;
            const failed = job.status?.failed ?? 0;
            const status = determineJobStatus(job.status);
            const isSelected = jobsOffset + index === jobsCursor;

            return (
              <Box key={name} flexDirection="column">
                <Text>
                  <Text
                    color={isSelected ? "cyan" : undefined}
                    bold={isSelected}>
                    {isSelected ? "❯ " : "  "}
                    {name}
                  </Text>
                  <Text> </Text>
                  <Text color={jobStatusColor(status)}>[{status}]</Text>
                </Text>
                <Text dimColor>
                  {"    "}active:{active} · succeeded:{succeeded} · failed:
                  {failed}
                </Text>
              </Box>
            );
          })
        )}
      </Box>
      <Box paddingX={1}>
        <Text dimColor>{separator}</Text>
      </Box>
      <Box paddingX={1}>
        <Text dimColor>↑↓ navigate · enter pods · r refresh · b back</Text>
        {statusMsg ? (
          <Text>
            <Text> </Text>
            <Text dimColor>| {statusMsg}</Text>
          </Text>
        ) : null}
      </Box>
    </Box>
  );
}

interface PodsViewProps {
  selectedJobName: string;
  pods: PodInfo[];
  podsCursor: number;
  podsOffset: number;
  logsLoading: boolean;
  separator: string;
  logAll: boolean;
}

export function InstancePodsView({
  selectedJobName,
  pods,
  podsCursor,
  podsOffset,
  logsLoading,
  separator,
  logAll
}: PodsViewProps) {
  return (
    <Box flexDirection="column">
      <Box paddingX={1}>
        <Text bold color="cyan">
          Pods
        </Text>
        <Text dimColor> · {selectedJobName}</Text>
        {logsLoading && (
          <Text>
            {" "}
            <Spinner />
          </Text>
        )}
      </Box>
      <Box paddingX={1}>
        <Text dimColor>{separator}</Text>
      </Box>
      <Box flexDirection="column" paddingX={1}>
        {pods.length === 0 && !logsLoading ? (
          <Text dimColor>No pods found.</Text>
        ) : (
          pods.map((pod, index) => {
            const name = pod.metadata?.name ?? `pod-${podsOffset + index}`;
            const phase = pod.status?.phase ?? "Unknown";
            const isSelected = podsOffset + index === podsCursor;
            const phaseColor =
              phase === "Running" || phase === "Succeeded"
                ? "green"
                : phase === "Failed"
                  ? "red"
                  : "yellow";

            return (
              <Text key={name}>
                <Text color={isSelected ? "cyan" : undefined} bold={isSelected}>
                  {isSelected ? "❯ " : "  "}
                  {name}
                </Text>
                <Text dimColor> · </Text>
                <Text color={phaseColor}>{phase}</Text>
              </Text>
            );
          })
        )}
      </Box>
      <Box paddingX={1}>
        <Text dimColor>{separator}</Text>
      </Box>
      <Box paddingX={1}>
        <Text dimColor>↑↓ navigate · enter view logs · </Text>
        <Text color={logAll ? "green" : undefined}>
          a {logAll ? "all logs" : "tail 1000"}
        </Text>
        <Text dimColor> · b back</Text>
      </Box>
    </Box>
  );
}
