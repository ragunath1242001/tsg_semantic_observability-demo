import {
  BatchV1Api,
  CoreV1Api,
  KubeConfig,
  Log,
  V1Job
} from "@kubernetes/client-node";
import { Injectable, Logger } from "@nestjs/common";
import { Writable } from "stream";

import { RootConfig } from "../config.js";

@Injectable()
export class OrchestrationService {
  private readonly batchV1Api: BatchV1Api;
  private readonly coreV1Api: CoreV1Api;
  private kubeConfig: KubeConfig;
  private containerName: string;

  constructor(private readonly config: RootConfig) {
    this.kubeConfig = new KubeConfig();
    this.containerName = "analytics-dp-container";
    try {
      // Load the kubeconfig from the default location (e.g. ~/.kube/config) or within cluster
      this.kubeConfig.loadFromDefault();
      this.coreV1Api = this.kubeConfig.makeApiClient(CoreV1Api);
      this.batchV1Api = this.kubeConfig.makeApiClient(BatchV1Api);
      this.logger.debug("KubeConfig loaded successfully");
    } catch (error) {
      this.logger.error("Failed to load kubeconfig", error);
      throw error;
    }
  }
  private readonly logger = new Logger(this.constructor.name);

  async getJobsForTransfer(transferId: string): Promise<V1Job[]> {
    const namespace = this.config.kubernetesConfig.namespace;

    const jobList = await this.batchV1Api.listNamespacedJob({
      namespace,
      labelSelector: `transferId=${transferId}`
    });

    return jobList.items;
  }

  async spawnJob(transferId: string, imageName: string, command: string[]) {
    const jobName = `adp-job-${transferId}-${new Date().getTime()}`;
    const namespace = this.config.kubernetesConfig.namespace;

    const jobManifest = {
      apiVersion: "batch/v1",
      kind: "Job",
      metadata: {
        name: jobName,
        namespace
      },
      spec: {
        backoffLimit: 3,
        template: {
          metadata: {
            labels: {
              app: jobName,
              transferId: transferId
            }
          },
          spec: {
            restartPolicy: "Never",
            containers: [
              {
                name: this.containerName,
                image: imageName,
                command
              }
            ]
          }
        }
      }
    };

    await this.batchV1Api.createNamespacedJob({
      namespace,
      body: jobManifest
    });
  }

  async getPodsForJob(jobName: string) {
    return await this.coreV1Api.listNamespacedPod({
      namespace: this.config.kubernetesConfig.namespace,
      labelSelector: `app=${jobName}`
    });
  }

  async getPodLogs(podName: string) {
    return await this.coreV1Api.readNamespacedPodLog({
      name: podName,
      namespace: this.config.kubernetesConfig.namespace,
      container: this.containerName,
      tailLines: 1000
    });
  }

  async watchPodLogs(jobName: string) {
    const podList = await this.coreV1Api.listNamespacedPod({
      namespace: this.config.kubernetesConfig.namespace,
      labelSelector: `app=${jobName}`
    });

    const podNames = podList.items.map((pod) => pod.metadata?.name);

    if (podNames.length === 0) {
      throw new Error(`No pods found for job ${jobName}`);
    }

    if (podNames.length > 1) {
      throw new Error(`Multiple pods found for job ${jobName}`);
    }

    const podName = podNames[0]!;
    // Set up a stream to the Pod's logs
    const logStream = new Log(this.kubeConfig);

    // Stream options
    const streamOptions = {
      follow: true, // Stream logs in real-time
      pretty: true, // Avoid extra formatting
      tailLines: 10 // Optional: Start with the last 10 lines of logs
    };

    // Create a readable stream for logs
    const logStreamWritable = new Writable({
      write(chunk, _encoding, callback) {
        console.log(chunk.toString()); // Output the log data
        callback();
      }
    });

    await logStream.log(
      this.config.kubernetesConfig.namespace,
      podName,
      this.containerName,
      logStreamWritable,
      streamOptions
    );

    logStreamWritable.on("finish", () => {
      console.log("Log stream finished.");
    });
    return logStreamWritable;
  }
}
