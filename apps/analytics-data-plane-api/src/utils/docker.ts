import { Logger } from "@nestjs/common";
import Dockerode from "dockerode";
import { Readable } from "stream";
import tarStream from "tar-stream";

import { JobInfo, PodInfo } from "../orchestration/orchestration.interface.js";

export type ContainerStatus = "running" | "succeeded" | "failed";
export type PodPhase =
  | "Pending"
  | "Running"
  | "Succeeded"
  | "Failed"
  | "Unknown";

export async function pullImage({
  docker,
  imageRef,
  platform,
  logger
}: {
  docker: Dockerode;
  imageRef: string;
  platform?: string;
  logger: Logger;
}): Promise<void> {
  const pullStream = await docker.pull(imageRef, {
    platform
  } as unknown as Record<string, unknown>);

  await new Promise<void>((resolve, reject) => {
    docker.modem.followProgress(
      pullStream,
      (err: unknown) => {
        if (err) reject(err);
        else resolve();
      },
      (event: unknown) => {
        const maybeError = (event as { error?: string } | null)?.error;
        if (maybeError) {
          logger.warn(`Image pull error: ${maybeError}`);
        }
      }
    );
  });
}

/**
 * Convert Docker container info to Kubernetes-like Job format.
 */
export function containerToJob(
  container: Dockerode.ContainerInfo,
  opts: { containerName: string }
): JobInfo {
  const status = getContainerStatus(container);

  return {
    apiVersion: "batch/v1",
    kind: "Job",
    metadata: {
      name: container.Names?.[0]?.replace(/^\//, "") ?? container.Id,
      uid: container.Id,
      creationTimestamp: new Date((container.Created ?? 0) * 1000),
      labels: container.Labels ?? {}
    },
    spec: {
      template: {
        spec: {
          containers: [
            {
              name: opts.containerName,
              image: container.Image
            }
          ]
        }
      }
    },
    status: {
      active: status === "running" ? 1 : 0,
      succeeded: status === "succeeded" ? 1 : 0,
      failed: status === "failed" ? 1 : 0,
      startTime: new Date((container.Created ?? 0) * 1000)
    }
  };
}

/**
 * Convert Docker container info to Kubernetes-like Pod format.
 */
export function containerToPod(
  container: Dockerode.ContainerInfo,
  opts: { containerName: string }
): PodInfo {
  const phase = getContainerPhase(container);
  const name = container.Names?.[0]?.replace(/^\//, "") ?? container.Id;

  return {
    apiVersion: "v1",
    kind: "Pod",
    metadata: {
      name,
      uid: container.Id,
      creationTimestamp: new Date((container.Created ?? 0) * 1000),
      labels: {
        ...(container.Labels ?? {}),
        app: container.Labels?.["adp.tsg.app/job-name"] ?? name
      }
    },
    spec: {
      containers: [
        {
          name: opts.containerName,
          image: container.Image
        }
      ]
    },
    status: {
      phase,
      startTime: new Date((container.Created ?? 0) * 1000),
      containerStatuses: [
        {
          name: opts.containerName,
          ready: container.State === "running",
          state: getContainerState(container)
        }
      ]
    }
  };
}

/**
 * Map Docker container state to Kubernetes-like status.
 */
export function getContainerStatus(container: {
  State?: string;
  Status?: string;
}): ContainerStatus {
  const state = (container.State ?? "").toLowerCase();

  if (state === "running") {
    return "running";
  }

  if (state === "exited") {
    // Status contains exit code like "Exited (0) 5 minutes ago"
    const exitCodeMatch = container.Status?.match(/Exited \((\d+)\)/);
    if (exitCodeMatch) {
      const exitCode = parseInt(exitCodeMatch[1], 10);
      return exitCode === 0 ? "succeeded" : "failed";
    }
  }

  if (state === "dead" || state === "removing") {
    return "failed";
  }

  // created, paused, restarting states
  return "running";
}

/**
 * Map Docker container state to Kubernetes Pod phase.
 */
export function getContainerPhase(container: {
  State?: string;
  Status?: string;
}): PodPhase {
  const state = (container.State ?? "").toLowerCase();

  if (state === "running") {
    return "Running";
  }

  if (state === "created" || state === "restarting") {
    return "Pending";
  }

  if (state === "exited") {
    const exitCodeMatch = container.Status?.match(/Exited \((\d+)\)/);
    if (exitCodeMatch) {
      const exitCode = parseInt(exitCodeMatch[1], 10);
      return exitCode === 0 ? "Succeeded" : "Failed";
    }
  }

  if (state === "dead" || state === "removing") {
    return "Failed";
  }

  if (state === "paused") {
    return "Running";
  }

  return "Unknown";
}

/**
 * Get container state in Kubernetes format.
 */
export function getContainerState(container: {
  State?: string;
  Status?: string;
  Created?: number;
}): {
  running?: { startedAt?: Date };
  terminated?: { exitCode?: number; finishedAt?: Date; reason?: string };
  waiting?: { reason?: string };
} {
  const state = (container.State ?? "").toLowerCase();

  if (state === "running") {
    return {
      running: {
        startedAt: new Date((container.Created ?? 0) * 1000)
      }
    };
  }

  if (state === "exited") {
    const exitCodeMatch = container.Status?.match(/Exited \((\d+)\)/);
    const exitCode = exitCodeMatch ? parseInt(exitCodeMatch[1], 10) : undefined;
    return {
      terminated: {
        exitCode,
        reason: exitCode === 0 ? "Completed" : "Error"
      }
    };
  }

  if (state === "created" || state === "restarting") {
    return {
      waiting: {
        reason: state === "created" ? "ContainerCreating" : "CrashLoopBackOff"
      }
    };
  }

  return {};
}

/**
 * Create a minimal tar archive containing a single file at the given path.
 * Docker expects an uncompressed tar stream for PutContainerArchive.
 */
export function createSingleFileTarArchive(
  filePath: string,
  content: Buffer
): Readable {
  const normalizedPath = filePath.replace(/^\/+/, "");
  const dir = normalizedPath.includes("/")
    ? normalizedPath.slice(0, normalizedPath.lastIndexOf("/") + 1)
    : "";

  const pack = tarStream.pack();
  const mtime = new Date();

  const errorHandler = (err: unknown) => {
    if (err) {
      pack.destroy(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  };

  if (dir) {
    pack.entry(
      {
        name: dir,
        type: "directory",
        mode: 0o755,
        mtime
      },
      errorHandler
    );
  }

  pack.entry(
    {
      name: normalizedPath,
      type: "file",
      mode: 0o644,
      mtime
    },
    content,
    errorHandler
  );

  pack.finalize();
  return pack;
}
