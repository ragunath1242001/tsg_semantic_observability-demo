import {
  BatchV1Api,
  CoreV1Api,
  KubeConfig,
  Log,
  V1EnvVar,
  V1Job,
  V1Volume,
  V1VolumeMount
} from "@kubernetes/client-node";
import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { hostname } from "os";
import { Writable } from "stream";

import { AlgorithmInstancesService } from "../algorithm-instances/algorithm-instances.service.js";
import { RootConfig } from "../config.js";
import { FilesService } from "../files/files.service.js";
import { DataPlaneError } from "../utils/errors/error.js";

@Injectable()
export class OrchestrationService {
  private readonly batchV1Api: BatchV1Api;
  private readonly coreV1Api: CoreV1Api;
  private kubeConfig: KubeConfig;
  private containerName: string;

  constructor(
    private readonly config: RootConfig,
    private readonly filesService: FilesService,
    private readonly algorithmInstancesService: AlgorithmInstancesService
  ) {
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

  async getJobsForAlgorithmInstance(
    algorithmInstanceId: string
  ): Promise<V1Job[]> {
    const namespace = this.config.kubernetesConfig.namespace;

    const jobList = await this.batchV1Api.listNamespacedJob({
      namespace,
      labelSelector: `algorithmInstanceId=${algorithmInstanceId}`
    });

    return jobList.items;
  }

  @OnEvent("job.spawn")
  async handleJobSpawnEvent(event: {
    algorithmInstanceId: string;
    imageName: string;
    command?: string[];
    fileId?: string;
  }) {
    const { algorithmInstanceId, imageName, command, fileId } = event;

    this.logger.log(
      `Spawning job for algorithm instance ${algorithmInstanceId} with image ${imageName}`
    );

    return await this.spawnJob(algorithmInstanceId, imageName, command, fileId);
  }

  async spawnJob(
    algorithmInstanceId: string,
    imageName: string,
    command?: string[],
    fileId?: string
  ) {
    const jobName = `adp-job-${algorithmInstanceId}-${new Date().getTime()}`;
    const namespace = this.config.kubernetesConfig.namespace;

    // Get the algorithm instance to retrieve participant information
    const algorithmInstance =
      await this.algorithmInstancesService.getAlgorithmInstance(
        algorithmInstanceId
      );

    const dataplaneAddress = process.env["POD_IP"] ?? hostname();
    const localDataPlaneAddress = `http://${dataplaneAddress}:${this.config.server.port}${process.env["SUBPATH"] ?? ""}${process.env["EMBEDDED_FRONTEND"] ? "/api" : ""}`;

    const eventsAccessToken =
      await this.algorithmInstancesService.createAccessToken(
        algorithmInstanceId
      );

    const env: V1EnvVar[] = [
      {
        name: "ALGORITHM_INSTANCE_ID",
        value: algorithmInstanceId
      },
      {
        name: "CALLBACK_URL",
        value: localDataPlaneAddress
      },
      {
        name: "EVENTS_ACCESS_TOKEN",
        value: eventsAccessToken
      },
      {
        name: "PARTICIPANTS",
        value: JSON.stringify(
          algorithmInstance.participants.map((p) => p.didId)
        )
      }
    ];

    const volumeMounts: V1VolumeMount[] = [];
    const volumes: V1Volume[] = [];
    if (fileId) {
      const fileMetadata = await this.filesService.getFileMetadata(fileId);
      if (!fileMetadata) {
        throw new DataPlaneError(
          `File with ID ${fileId} not found`,
          HttpStatus.NOT_FOUND
        );
      }
      if (this.config.files.pvcName) {
        volumeMounts.push({
          mountPath: `/data/${fileMetadata.fileName}`,
          subPath: fileMetadata.fileName,
          name: "data-volume"
        });
        volumes.push({
          name: "data-volume",
          persistentVolumeClaim: {
            claimName: this.config.files.pvcName,
            readOnly: true
          }
        });
        env.push({
          name: "DATA_TYPE",
          value: "file"
        });
        env.push({
          name: "DATA_FILE",
          value: `/data/${fileMetadata.fileName}`
        });
      } else {
        const dataAccessToken =
          await this.filesService.createAccessToken(fileId);

        env.push({
          name: "DATA_TYPE",
          value: "url"
        });
        env.push({
          name: "DATA_URL",
          value: `${localDataPlaneAddress}/files/${fileMetadata.identifier}`
        });
        env.push({
          name: "DATA_ACCESS_TOKEN",
          value: dataAccessToken
        });
      }
    }

    // Filter out empty command elements and use undefined if no valid commands
    const validCommand = command?.filter((cmd) => cmd && cmd.trim().length > 0);
    const finalCommand =
      validCommand && validCommand.length > 0 ? validCommand : undefined;

    const jobManifest: V1Job = {
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
              algorithmInstanceId
            }
          },
          spec: {
            restartPolicy: "Never",
            containers: [
              {
                name: this.containerName,
                image: imageName,
                env,
                command: finalCommand,
                volumeMounts
              }
            ],
            volumes
          }
        }
      }
    };

    await this.batchV1Api.createNamespacedJob({
      namespace,
      body: jobManifest
    });

    return {
      token: eventsAccessToken
    };
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

    const write = (
      chunk: any,
      _encoding: BufferEncoding,
      callback: (error?: Error | null) => void
    ) => {
      this.logger.log(chunk.toString()); // Output the log data
      callback();
    };

    // Create a readable stream for logs
    const logStreamWritable = new Writable({
      write
    });

    await logStream.log(
      this.config.kubernetesConfig.namespace,
      podName,
      this.containerName,
      logStreamWritable,
      streamOptions
    );

    logStreamWritable.on("finish", () => {
      this.logger.log(`Log stream for pod ${podName} finished.`);
    });
    return logStreamWritable;
  }
}
