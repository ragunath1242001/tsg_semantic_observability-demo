import { writeFileSync } from "node:fs";
import type { IncomingMessage } from "node:http";
import { join } from "node:path";

import { useInput, useStdout } from "ink";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ApiClient } from "../api/client.js";
import { ScrollableView } from "../components/scrollable-view.js";
import type {
  AlgorithmEventDto,
  AlgorithmInstanceDto,
  InternalEventDto,
  JobInfo,
  PodInfo
} from "../types.js";
import { getErrorMessage, getSessionErrorMessage } from "../utils.js";
import {
  algorithmEventToMerged,
  appendMergedEvent,
  type DetailView,
  type EventFilter,
  getEventCount,
  getInstanceInfoRows,
  getLatestInternalEventValues,
  internalEventToMerged,
  isTerminalStatus,
  mergeAndSortEvents,
  type MergedEvent
} from "./instance-detail-model.js";
import {
  InstanceEventsView,
  InstanceInfoView,
  InstanceJobsView,
  InstancePodsView
} from "./instance-detail-views.js";

interface InstanceDetailScreenProps {
  client: ApiClient;
  instance: AlgorithmInstanceDto;
  onBack: () => void;
}

export function InstanceDetailScreen({
  client,
  instance,
  onBack
}: InstanceDetailScreenProps) {
  const [currentInstance, setCurrentInstance] =
    useState<AlgorithmInstanceDto>(instance);
  const [allEvents, setAllEvents] = useState<MergedEvent[]>([]);
  const [eventFilter, setEventFilter] = useState<EventFilter>("all");
  const [cursor, setCursor] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [initialLoad, setInitialLoad] = useState(true);
  const [view, setView] = useState<DetailView>("info");
  const [dataContent, setDataContent] = useState<string | null>(null);
  const [dataLabel, setDataLabel] = useState("");
  const scrollRef = useRef(0);

  const [jobs, setJobs] = useState<JobInfo[]>([]);
  const [pods, setPods] = useState<PodInfo[]>([]);
  const [logContent, setLogContent] = useState("");
  const [logLabel, setLogLabel] = useState("");
  const [jobsCursor, setJobsCursor] = useState(0);
  const [podsCursor, setPodsCursor] = useState(0);
  const [logsSubView, setLogsSubView] = useState<"jobs" | "pods" | "log">(
    "jobs"
  );
  const [logsLoading, setLogsLoading] = useState(false);
  const [logStreaming, setLogStreaming] = useState(false);
  const [logAll, setLogAll] = useState(false);
  const logStreamRef = useRef<IncomingMessage | null>(null);
  const currentInstanceRef = useRef(currentInstance);

  const { stdout } = useStdout();
  const termRows = stdout?.rows ?? 24;
  const termCols = stdout?.columns ?? 80;
  const separator = "─".repeat(Math.min(termCols - 2, 120));

  useEffect(() => {
    currentInstanceRef.current = currentInstance;
  }, [currentInstance]);

  const filteredEvents = useMemo(
    () =>
      eventFilter === "all"
        ? allEvents
        : allEvents.filter((event) => event.type === eventFilter),
    [allEvents, eventFilter]
  );
  const eventCount = useMemo(() => getEventCount(allEvents), [allEvents]);
  const latestInternalEventValues = useMemo(
    () => getLatestInternalEventValues(allEvents),
    [allEvents]
  );
  const infoRows = useMemo(
    () => getInstanceInfoRows(currentInstance),
    [currentInstance]
  );

  useEffect(() => {
    setCursor((currentCursor) =>
      Math.min(currentCursor, Math.max(0, filteredEvents.length - 1))
    );
  }, [filteredEvents.length]);

  useEffect(() => {
    setJobsCursor((currentCursor) =>
      Math.min(currentCursor, Math.max(0, jobs.length - 1))
    );
  }, [jobs.length]);

  useEffect(() => {
    setPodsCursor((currentCursor) =>
      Math.min(currentCursor, Math.max(0, pods.length - 1))
    );
  }, [pods.length]);

  const refreshInstance = useCallback(async () => {
    try {
      const [nextInstance, events] = await Promise.all([
        client.getAlgorithmInstance(instance.id),
        client.getEventsForInstance(instance.id)
      ]);
      const mergedEvents = mergeAndSortEvents(
        Array.isArray(events.algorithmEvents) ? events.algorithmEvents : [],
        Array.isArray(events.internalEvents) ? events.internalEvents : []
      );

      setCurrentInstance(nextInstance);
      setAllEvents(mergedEvents);
      setStatusMsg(`${mergedEvents.length} event(s)`);
    } catch (error: unknown) {
      setStatusMsg(
        `error: ${getSessionErrorMessage(error, "Failed to refresh")}`
      );
    } finally {
      setInitialLoad(false);
    }
  }, [client, instance.id]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isTerminalStatus(currentInstanceRef.current.status)) {
        refreshInstance();
      }
    }, 60_000);

    return () => clearInterval(interval);
  }, [refreshInstance]);

  useEffect(() => {
    refreshInstance();

    let socket: ReturnType<typeof client.connectSocket> | undefined;
    try {
      socket = client.connectSocket();

      const refreshCurrentInstance = () => {
        if (!isTerminalStatus(currentInstanceRef.current.status)) {
          client
            .getAlgorithmInstance(instance.id)
            .then(setCurrentInstance)
            .catch(() => {});
        }
      };

      const onInternal = (event: InternalEventDto) => {
        if (event.algorithmInstanceId !== instance.id) {
          return;
        }

        setAllEvents((previousEvents) => {
          const nextEvents = appendMergedEvent(
            previousEvents,
            internalEventToMerged(event)
          );

          if (nextEvents !== previousEvents) {
            setStatusMsg(`${nextEvents.length} event(s)`);
          }

          return nextEvents;
        });

        refreshCurrentInstance();
      };

      const onAlgorithm = (event: AlgorithmEventDto) => {
        if (event.algorithmInstanceId !== instance.id) {
          return;
        }

        setAllEvents((previousEvents) => {
          const nextEvents = appendMergedEvent(
            previousEvents,
            algorithmEventToMerged(event)
          );

          if (nextEvents !== previousEvents) {
            setStatusMsg(`${nextEvents.length} event(s)`);
          }

          return nextEvents;
        });

        refreshCurrentInstance();
      };

      socket.on("event:internal:create", onInternal);
      socket.on("event:algorithm:create", onAlgorithm);

      return () => {
        socket?.off("event:internal:create", onInternal);
        socket?.off("event:algorithm:create", onAlgorithm);
        client.disconnectSocket();
      };
    } catch {
      // WebSocket not available – fall back to polling.
    }

    const interval = setInterval(() => {
      if (!isTerminalStatus(currentInstanceRef.current.status)) {
        refreshInstance();
      }
    }, 5_000);

    return () => clearInterval(interval);
  }, [client, instance.id, refreshInstance]);

  const loadJobs = useCallback(async () => {
    setLogsLoading(true);
    setLogContent("");

    try {
      const nextJobs = await client.getJobsForInstance(instance.id);
      setJobs(nextJobs);
      setJobsCursor(0);
      setLogsSubView("jobs");
      setStatusMsg(
        nextJobs.length === 0
          ? "No jobs found for this instance"
          : `${nextJobs.length} job(s)`
      );
    } catch (error: unknown) {
      setStatusMsg(`error loading jobs: ${getErrorMessage(error, "unknown")}`);
      setJobs([]);
    } finally {
      setLogsLoading(false);
    }
  }, [client, instance.id]);

  const loadPods = useCallback(
    async (jobName: string) => {
      setLogsLoading(true);

      try {
        const nextPods = await client.getPodsForJob(jobName);
        setPods(nextPods);
        setPodsCursor(0);
        setLogsSubView("pods");
        setStatusMsg(
          nextPods.length === 0
            ? "No pods found for this job"
            : `${nextPods.length} pod(s)`
        );
      } catch (error: unknown) {
        setStatusMsg(
          `error loading pods: ${getErrorMessage(error, "unknown")}`
        );
        setPods([]);
      } finally {
        setLogsLoading(false);
      }
    },
    [client]
  );

  const stopLogStream = useCallback(() => {
    if (logStreamRef.current) {
      logStreamRef.current.destroy();
      logStreamRef.current = null;
    }

    setLogStreaming(false);
  }, []);

  const loadPodLogs = useCallback(
    async (podName: string) => {
      stopLogStream();
      setLogsLoading(true);
      setLogLabel(podName);
      setLogContent("Connecting to log stream…");
      setLogsSubView("log");

      try {
        const stream = await client.streamPodLogs(
          podName,
          logAll ? Number.MAX_SAFE_INTEGER : 1000
        );
        logStreamRef.current = stream;
        setLogContent("");
        setLogStreaming(true);
        setLogsLoading(false);

        stream.on("data", (chunk: Buffer) => {
          setLogContent(
            (previousContent) => previousContent + chunk.toString()
          );
        });
        stream.on("end", () => {
          setLogStreaming(false);
          logStreamRef.current = null;
          setLogContent((previousContent) => previousContent || "(no output)");
        });
        stream.on("error", () => {
          setLogStreaming(false);
          logStreamRef.current = null;
          setLogContent(
            (previousContent) => previousContent || "Error loading log stream"
          );
        });
      } catch (error: unknown) {
        setLogContent(
          `Error loading logs: ${getErrorMessage(error, "unknown")}`
        );
        setLogsLoading(false);
      }
    },
    [client, logAll, stopLogStream]
  );

  useEffect(() => stopLogStream, [stopLogStream]);

  const viewEventData = useCallback(async () => {
    if (cursor < 0 || cursor >= filteredEvents.length) {
      return;
    }

    const event = filteredEvents[cursor];

    if (event.type === "internal" && event.data !== undefined) {
      setDataLabel(`${event.name} #${event.number}`);
      setDataContent(JSON.stringify(event.data, null, 2));
      setView("data");
      return;
    }

    if (event.type === "algorithm" && event.eventId) {
      setStatusMsg("Downloading event data…");

      try {
        const data = await client.downloadEventData(
          currentInstance.id,
          event.eventId
        );
        setDataLabel(`${event.name} #${event.number}`);
        setDataContent(data.toString("utf-8").slice(0, 10_000));
        setView("data");
      } catch (error: unknown) {
        setStatusMsg(`error: ${getErrorMessage(error, "Download failed")}`);
      }
    }
  }, [client, currentInstance.id, cursor, filteredEvents]);

  const saveEventData = useCallback(async () => {
    if (cursor < 0 || cursor >= filteredEvents.length) {
      return;
    }

    const event = filteredEvents[cursor];

    if (event.type === "algorithm" && event.eventId) {
      setStatusMsg("Saving event data…");

      try {
        const data = await client.downloadEventData(
          currentInstance.id,
          event.eventId
        );
        const filePath = join(
          process.cwd(),
          `event-${event.name}-${event.number}.bin`
        );
        writeFileSync(filePath, data);
        setStatusMsg(`Saved to ${filePath}`);
      } catch (error: unknown) {
        setStatusMsg(`error: ${getErrorMessage(error, "Save failed")}`);
      }

      return;
    }

    if (event.type === "internal" && event.data !== undefined) {
      const filePath = join(
        process.cwd(),
        `event-${event.name}-${event.number}.json`
      );
      writeFileSync(filePath, JSON.stringify(event.data, null, 2));
      setStatusMsg(`Saved to ${filePath}`);
    }
  }, [client, currentInstance.id, cursor, filteredEvents]);

  const eventsViewport = Math.max(2, Math.floor((termRows - 5) / 2));
  {
    const count = filteredEvents.length;
    let offset = scrollRef.current;
    if (cursor < offset) offset = cursor;
    if (cursor >= offset + eventsViewport) {
      offset = cursor - eventsViewport + 1;
    }
    offset = Math.max(0, Math.min(offset, Math.max(0, count - eventsViewport)));
    scrollRef.current = offset;
  }

  const logsViewport = Math.max(4, termRows - 4);
  const jobsOffset = Math.max(
    0,
    Math.min(
      jobsCursor - logsViewport + 1,
      Math.max(0, jobs.length - logsViewport)
    )
  );
  const podsOffset = Math.max(
    0,
    Math.min(
      podsCursor - logsViewport + 1,
      Math.max(0, pods.length - logsViewport)
    )
  );

  useInput(
    (input, key) => {
      if (input === "e") {
        setView("events");
      } else if (input === "l") {
        setView("logs");
        void loadJobs();
      } else if (input === "r") {
        void refreshInstance();
      } else if (key.escape || input === "b") {
        onBack();
      }
    },
    { isActive: view === "info" }
  );

  useInput(
    (input, key) => {
      if (key.upArrow || input === "k") {
        setCursor((currentCursor) => Math.max(0, currentCursor - 1));
      } else if (key.downArrow || input === "j") {
        setCursor((currentCursor) =>
          Math.min(filteredEvents.length - 1, currentCursor + 1)
        );
      } else if (key.return) {
        void viewEventData();
      } else if (input === "s") {
        void saveEventData();
      } else if (input === "a") {
        setEventFilter("algorithm");
        setCursor(0);
        scrollRef.current = 0;
      } else if (input === "i") {
        setEventFilter("internal");
        setCursor(0);
        scrollRef.current = 0;
      } else if (input === "*" || input === "8") {
        setEventFilter("all");
        setCursor(0);
        scrollRef.current = 0;
      } else if (input === "r") {
        void refreshInstance();
      } else if (input === "t") {
        setView("info");
      } else if (key.escape || input === "b") {
        onBack();
      }
    },
    { isActive: view === "events" }
  );

  useInput(
    (input, key) => {
      if (logsSubView === "jobs") {
        if (key.upArrow || input === "k") {
          setJobsCursor((currentCursor) => Math.max(0, currentCursor - 1));
        } else if (key.downArrow || input === "j") {
          setJobsCursor((currentCursor) =>
            Math.min(Math.max(0, jobs.length - 1), currentCursor + 1)
          );
        } else if (key.return) {
          const jobName = jobs[jobsCursor]?.metadata?.name;
          if (jobName) {
            void loadPods(jobName);
          }
        } else if (input === "r") {
          void loadJobs();
        } else if (key.escape || input === "b") {
          stopLogStream();
          setView("info");
        }

        return;
      }

      if (logsSubView === "pods") {
        if (key.upArrow || input === "k") {
          setPodsCursor((currentCursor) => Math.max(0, currentCursor - 1));
        } else if (key.downArrow || input === "j") {
          setPodsCursor((currentCursor) =>
            Math.min(Math.max(0, pods.length - 1), currentCursor + 1)
          );
        } else if (key.return) {
          const podName = pods[podsCursor]?.metadata?.name;
          if (podName) {
            void loadPodLogs(podName);
          }
        } else if (input === "a") {
          setLogAll((value) => !value);
        } else if (key.escape || input === "b") {
          setLogsSubView("jobs");
        }
      }
    },
    { isActive: view === "logs" && logsSubView !== "log" }
  );

  if (view === "data" && dataContent !== null) {
    return (
      <ScrollableView
        content={dataContent}
        title="event data"
        label={dataLabel}
        isActive={view === "data"}
        onClose={() => {
          setDataContent(null);
          setView("events");
        }}
      />
    );
  }

  if (view === "logs") {
    if (logsSubView === "jobs") {
      return (
        <InstanceJobsView
          currentInstance={currentInstance}
          jobs={jobs.slice(jobsOffset, jobsOffset + logsViewport)}
          jobsCursor={jobsCursor}
          jobsOffset={jobsOffset}
          logsLoading={logsLoading}
          separator={separator}
          statusMsg={statusMsg}
        />
      );
    }

    if (logsSubView === "pods") {
      return (
        <InstancePodsView
          selectedJobName={jobs[jobsCursor]?.metadata?.name ?? ""}
          pods={pods.slice(podsOffset, podsOffset + logsViewport)}
          podsCursor={podsCursor}
          podsOffset={podsOffset}
          logsLoading={logsLoading}
          separator={separator}
          logAll={logAll}
        />
      );
    }

    return (
      <ScrollableView
        content={logContent}
        title="logs"
        label={logLabel}
        isActive={logsSubView === "log"}
        follow={logStreaming}
        onClose={() => {
          stopLogStream();
          setLogsSubView("pods");
        }}
      />
    );
  }

  if (view === "info") {
    return (
      <InstanceInfoView
        currentInstance={currentInstance}
        infoRows={infoRows}
        initialLoad={initialLoad}
        separator={separator}
        latestInternalEventValues={latestInternalEventValues}
        eventCount={eventCount}
        allEventsCount={allEvents.length}
        termCols={termCols}
      />
    );
  }

  const offset = scrollRef.current;
  const visibleEvents = filteredEvents.slice(offset, offset + eventsViewport);

  return (
    <InstanceEventsView
      currentInstance={currentInstance}
      separator={separator}
      eventFilter={eventFilter}
      filteredEvents={filteredEvents}
      visibleEvents={visibleEvents}
      initialOffset={offset}
      cursor={cursor}
      initialLoad={initialLoad}
      statusMsg={statusMsg}
      termCols={termCols}
    />
  );
}
