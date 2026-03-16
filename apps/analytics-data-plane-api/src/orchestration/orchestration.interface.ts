import { PassThrough } from "stream";

export interface JobInfo {
  apiVersion?: string;
  kind?: string;
  metadata?: JobMetadata;
  spec?: JobSpec;
  status?: JobStatus;
}

export interface JobMetadata {
  name?: string;
  namespace?: string;
  uid?: string;
  creationTimestamp?: Date;
  labels?: Record<string, string>;
}

export interface JobSpec {
  template?: {
    spec?: {
      containers?: ContainerSpec[];
    };
  };
}

export interface ContainerSpec {
  name?: string;
  image?: string;
  command?: string[];
  env?: EnvVar[];
}

export interface EnvVar {
  name: string;
  value?: string;
}

export interface JobStatus {
  active?: number;
  succeeded?: number;
  failed?: number;
  startTime?: Date;
  completionTime?: Date;
}

export interface PodInfo {
  apiVersion?: string;
  kind?: string;
  metadata?: PodMetadata;
  spec?: PodSpec;
  status?: PodStatus;
}

export interface PodMetadata {
  name?: string;
  namespace?: string;
  uid?: string;
  creationTimestamp?: Date;
  labels?: Record<string, string>;
}

export interface PodSpec {
  containers?: ContainerSpec[];
}

export interface PodStatus {
  phase?: "Pending" | "Running" | "Succeeded" | "Failed" | "Unknown";
  startTime?: Date;
  containerStatuses?: ContainerStatus[];
}

export interface ContainerStatus {
  name?: string;
  ready?: boolean;
  state?: {
    running?: { startedAt?: Date };
    terminated?: { exitCode?: number; finishedAt?: Date; reason?: string };
    waiting?: { reason?: string };
  };
}

export interface PodList {
  apiVersion?: string;
  kind?: string;
  items: PodInfo[];
}

export interface SpawnJobResult {
  token: string;
}

/**
 * Interface for orchestration services.
 * Both Kubernetes and Docker implementations must implement this interface.
 */
export interface IOrchestrationService {
  /**
   * Spawn a new job for an algorithm instance.
   */
  spawnJob(
    algorithmInstanceId: string,
    participantId: string,
    imageName: string,
    command?: string[],
    datasetId?: string
  ): Promise<SpawnJobResult>;

  /**
   * Get all jobs for a specific algorithm instance.
   */
  getJobsForAlgorithmInstance(algorithmInstanceId: string): Promise<JobInfo[]>;

  /**
   * Get all pods (containers) for a specific job.
   */
  getPodsForJob(jobName: string): Promise<PodList>;

  /**
   * Get logs for a specific pod (container).
   */
  getPodLogs(podName: string): Promise<string>;

  watchPodLogs(podName: string, tailLines?: number): Promise<PassThrough>;
}

export const IOrchestrationService = Symbol("IOrchestrationService");
