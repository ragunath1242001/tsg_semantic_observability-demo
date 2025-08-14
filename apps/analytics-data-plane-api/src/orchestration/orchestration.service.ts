import {
  AppsV1Api,
  BatchV1Api,
  CoreV1Api,
  KubeConfig,
  Log,
  V1EnvVar,
  V1Job,
  V1OwnerReference,
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
  private readonly appsV1Api: AppsV1Api;
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
      this.appsV1Api = this.kubeConfig.makeApiClient(AppsV1Api);
      this.logger.debug("KubeConfig loaded successfully");
    } catch (error) {
      this.logger.error("Failed to load kubeconfig", error);
      throw error;
    }
  }
  private readonly logger = new Logger(this.constructor.name);

  private deploymentOwnerRef: V1OwnerReference | null = null;

  async getJobsForAlgorithmInstance(
    algorithmInstanceId: string
  ): Promise<V1Job[]> {
    const namespace = this.config.kubernetesConfig.namespace;

    const jobList = await this.batchV1Api.listNamespacedJob({
      namespace,
      labelSelector: `adp.tsg.app/algorithm-instance-id=${algorithmInstanceId}`
    });

    return jobList.items;
  }

  @OnEvent("job.spawn")
  async handleJobSpawnEvent(event: {
    algorithmInstanceId: string;
    participantId: string;
    imageName: string;
    command?: string[];
    fileId?: string;
  }) {
    const { algorithmInstanceId, participantId, imageName, command, fileId } =
      event;

    this.logger.log(
      `Spawning job for algorithm instance ${algorithmInstanceId} with image ${imageName}`
    );

    return await this.spawnJob(
      algorithmInstanceId,
      participantId,
      imageName,
      command,
      fileId
    );
  }

  async spawnJob(
    algorithmInstanceId: string,
    participantId: string,
    imageName: string,
    command?: string[],
    fileId?: string
  ) {
    const time = new Date().getTime();
    const jobName = `adp-job-${algorithmInstanceId}-${time}`;
    const configMapName = `adp-config-${algorithmInstanceId}-${time}`;
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

    // Store ConfigMap data for later creation
    const algorithmInstanceData = {
      id: algorithmInstance.id,
      algorithmDefinition: algorithmInstance.algorithmDefinition,
      participants: algorithmInstance.participants,
      createdDate: algorithmInstance.createdDate,
      status: algorithmInstance.status
    };

    const env: V1EnvVar[] = [
      {
        name: "CALLBACK_URL",
        value: localDataPlaneAddress
      },
      {
        name: "EVENTS_ACCESS_TOKEN",
        value: eventsAccessToken
      },
      {
        name: "PARTICIPANT_ID",
        value: participantId
      },
      {
        name: "ALGORITHM_INSTANCE_FILE",
        value: "/config/algorithm-instance.json"
      }
    ];

    const volumeMounts: V1VolumeMount[] = [
      {
        mountPath: "/config",
        name: "algorithm-instance-config",
        readOnly: true
      }
    ];
    const volumes: V1Volume[] = [
      {
        name: "algorithm-instance-config",
        configMap: {
          name: configMapName
        }
      }
    ];
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

    // Get deployment information for ownerReference
    const deploymentOwnerRef = await this.getDeploymentOwnerReference();

    const jobManifest: V1Job = {
      apiVersion: "batch/v1",
      kind: "Job",
      metadata: {
        name: jobName,
        namespace,
        labels: {
          "adp.tsg.app/component": "analytics-job",
          "adp.tsg.app/algorithm-instance-id": algorithmInstanceId
        },
        ...(deploymentOwnerRef && {
          ownerReferences: [deploymentOwnerRef]
        })
      },
      spec: {
        backoffLimit: 3,
        template: {
          metadata: {
            labels: {
              app: jobName,
              algorithmInstanceId,
              "adp.tsg.app/component": "analytics-job",
              "adp.tsg.app/algorithm-instance-id": algorithmInstanceId
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

    // Create the job first to get its UID for ownerReferences
    const createdJob = await this.batchV1Api.createNamespacedJob({
      namespace,
      body: jobManifest
    });

    const jobUid = createdJob.metadata?.uid;
    if (!jobUid) {
      throw new Error("Failed to get job UID for ConfigMap ownerReference");
    }

    // Create ConfigMap with ownerReferences to the job for automatic cleanup
    await this.coreV1Api.createNamespacedConfigMap({
      namespace,
      body: {
        apiVersion: "v1",
        kind: "ConfigMap",
        metadata: {
          name: configMapName,
          namespace,
          labels: {
            "adp.tsg.app/component": "analytics-job-config",
            "adp.tsg.app/algorithm-instance-id": algorithmInstanceId,
            "adp.tsg.app/job-name": jobName
          },
          ownerReferences: [
            {
              apiVersion: "batch/v1",
              kind: "Job",
              name: jobName,
              uid: jobUid,
              controller: true,
              blockOwnerDeletion: true
            }
          ]
        },
        data: {
          "algorithm-instance.json": JSON.stringify(
            algorithmInstanceData,
            null,
            2
          )
        }
      }
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
      chunk: Buffer | string,
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

  private async getDeploymentOwnerReference(): Promise<V1OwnerReference | null> {
    if (this.deploymentOwnerRef) {
      return this.deploymentOwnerRef;
    }

    try {
      const namespace = this.config.kubernetesConfig.namespace;
      const podName = process.env["HOSTNAME"]; // Kubernetes sets this to the pod name

      if (!podName) {
        this.logger.warn(
          "Could not determine current pod name - jobs will not have deployment owner reference"
        );
        return null;
      }

      // Get current pod information
      const currentPod = await this.coreV1Api.readNamespacedPod({
        name: podName,
        namespace
      });

      // Find the ReplicaSet owner reference
      const replicaSetOwnerRef = currentPod.metadata?.ownerReferences?.find(
        (owner) => owner.kind === "ReplicaSet"
      );

      if (!replicaSetOwnerRef) {
        this.logger.warn(
          "Current pod has no ReplicaSet owner - jobs will not have deployment owner reference"
        );
        return null;
      }

      // Get the ReplicaSet to find its Deployment owner
      // TODO: Fix if not allowed
      const replicaSet = await this.appsV1Api.readNamespacedReplicaSet({
        name: replicaSetOwnerRef.name,
        namespace
      });

      // Find the Deployment owner reference
      const deploymentOwnerRef = replicaSet.metadata?.ownerReferences?.find(
        (owner) => owner.kind === "Deployment"
      );

      if (!deploymentOwnerRef) {
        this.logger.warn(
          "ReplicaSet has no Deployment owner - jobs will not have deployment owner reference"
        );
        return null;
      }

      // Cache the result
      this.deploymentOwnerRef = {
        apiVersion: deploymentOwnerRef.apiVersion,
        kind: deploymentOwnerRef.kind,
        name: deploymentOwnerRef.name,
        uid: deploymentOwnerRef.uid,
        controller: false, // Jobs should not be controlled by the deployment directly
        blockOwnerDeletion: false // Allow deployment deletion even if jobs exist
      };

      this.logger.debug(
        `Found deployment owner reference: ${deploymentOwnerRef.name}`
      );
      return this.deploymentOwnerRef;
    } catch (error) {
      this.logger.warn(
        "Failed to get deployment owner reference - jobs will not have deployment owner",
        error
      );
      return null;
    }
  }
}
