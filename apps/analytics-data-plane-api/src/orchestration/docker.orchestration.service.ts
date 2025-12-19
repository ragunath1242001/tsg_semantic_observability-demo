import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { Cron, CronExpression } from "@nestjs/schedule";
import Dockerode from "dockerode";
import { once } from "events";
import { resolve } from "path";
import { Readable, Writable } from "stream";

import { AlgorithmInstancesService } from "../algorithm-instances/algorithm-instances.service.js";
import { DockerConfig, RootConfig } from "../config.js";
import { FilesService } from "../files/files.service.js";
import {
  containerToJob,
  containerToPod,
  createSingleFileTarArchive,
  pullImage
} from "../utils/docker.js";
import {
  IOrchestrationService,
  JobInfo,
  PodList,
  SpawnJobResult
} from "./orchestration.interface.js";

@Injectable()
export class DockerOrchestrationService
  implements IOrchestrationService, OnModuleInit
{
  private docker?: Dockerode;
  private readonly containerName = "analytics-dp-container";
  private readonly logger = new Logger(this.constructor.name);
  private followingJobStatus: Array<string> = [];

  constructor(
    private readonly config: RootConfig,
    private readonly dockerConfig: DockerConfig,
    private readonly filesService: FilesService,
    private readonly algorithmInstancesService: AlgorithmInstancesService
  ) {}

  private getClientOrThrow(): Dockerode {
    if (!this.docker) {
      throw new Error("Docker client not initialized");
    }
    return this.docker;
  }

  private createClient(): Dockerode {
    return new Dockerode({
      socketPath: this.dockerConfig.socketPath
    });
  }

  async onModuleInit() {
    try {
      this.docker = this.createClient();
      const info = await this.docker.info();
      this.logger.log(
        `Connected to Docker: ${info.Name ?? info.ServerVersion}`
      );
    } catch (error) {
      this.logger.error("Failed to connect to Docker daemon", error);
      throw error;
    }
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleCron() {
    const newFollowingJobs = await Promise.all(
      this.followingJobStatus.map(async (algorithmInstanceId) => {
        this.logger.debug(
          `Checking status for algorithm instance ${algorithmInstanceId}`
        );
        const jobs =
          await this.getJobsForAlgorithmInstance(algorithmInstanceId);
        if (jobs.length > 0) {
          const succeeded = jobs[0].status?.succeeded ?? 0;
          const failed = jobs[0].status?.failed ?? 0;
          if (succeeded > 0) {
            this.logger.debug(
              `Algorithm instance ${algorithmInstanceId} succeeded`
            );
            await this.algorithmInstancesService.updateStatus(
              algorithmInstanceId,
              "completed"
            );
            return null;
          }
          if (failed > 0) {
            this.logger.debug(
              `Algorithm instance ${algorithmInstanceId} failed`
            );
            await this.algorithmInstancesService.updateStatus(
              algorithmInstanceId,
              "failed"
            );
            return null;
          }
          this.logger.debug(
            `Algorithm instance ${algorithmInstanceId} still running`
          );
          return algorithmInstanceId;
        }
        return algorithmInstanceId;
      })
    );
    this.followingJobStatus = newFollowingJobs.filter(
      (id): id is string => id !== null
    );
  }

  @OnEvent("job.spawn")
  async handleJobSpawnEvent(event: {
    algorithmInstanceId: string;
    participantId: string;
    imageName: string;
    command?: string[];
    datasetId?: string;
  }) {
    const {
      algorithmInstanceId,
      participantId,
      imageName,
      command,
      datasetId
    } = event;

    this.logger.log(
      `Spawning Docker container for algorithm instance ${algorithmInstanceId} with image ${imageName}, for participant ${participantId} and dataset ${datasetId}`
    );

    return await this.spawnJob(
      algorithmInstanceId,
      participantId,
      imageName,
      command,
      datasetId
    );
  }

  async spawnJob(
    algorithmInstanceId: string,
    participantId: string,
    imageName: string,
    command?: string[],
    datasetId?: string
  ): Promise<SpawnJobResult> {
    const docker = this.getClientOrThrow();
    const time = new Date().getTime();
    const containerNameForJob = `adp-job-${algorithmInstanceId}-${time}`;

    // Get the algorithm instance to retrieve participant information
    const algorithmInstance =
      await this.algorithmInstancesService.getAlgorithmInstance(
        algorithmInstanceId
      );

    const dataplaneAddress = process.env["POD_IP"] ?? "host.docker.internal";
    const localDataPlaneAddress = `http://${dataplaneAddress}:${this.config.server.port}${process.env["SUBPATH"] ?? ""}${process.env["EMBEDDED_FRONTEND"] ? "/api" : ""}`;

    const eventsAccessToken =
      await this.algorithmInstancesService.createAccessToken(
        algorithmInstanceId
      );

    // Prepare algorithm instance data
    const algorithmInstanceData = {
      id: algorithmInstance.id,
      algorithmDefinition: algorithmInstance.algorithmDefinition,
      participants: algorithmInstance.participants,
      createdDate: algorithmInstance.createdDate,
      status: algorithmInstance.status
    };

    // Prepare environment variables
    const env: string[] = [
      `CALLBACK_URL=${localDataPlaneAddress}`,
      `EVENTS_ACCESS_TOKEN=${eventsAccessToken}`,
      `PARTICIPANT_ID=${participantId}`,
      `ALGORITHM_INSTANCE_FILE=/algorithm-instance.json`
    ];

    // Prepare binds/mounts
    const binds: string[] = [];

    const fileMetadata = datasetId
      ? await this.filesService.getFileByDatasetId(datasetId)
      : null;

    if (fileMetadata) {
      if (this.dockerConfig.mountFiles) {
        const hostPath = resolve(
          `${this.config.files.path}/${fileMetadata.fileName}`
        );
        binds.push(`${hostPath}:/data/${fileMetadata.fileName}:ro`);
        env.push("DATA_TYPE=file");
        env.push(`DATA_FILE=/data/${fileMetadata.fileName}`);
      } else {
        const dataAccessToken = await this.filesService.createAccessToken(
          fileMetadata.identifier
        );
        env.push("DATA_TYPE=url");
        env.push(
          `DATA_URL=${localDataPlaneAddress}/files/${fileMetadata.identifier}`
        );
        env.push(`DATA_ACCESS_TOKEN=${dataAccessToken}`);
      }
    }

    // Filter out empty command elements
    const validCommand = command?.filter((cmd) => cmd && cmd.trim().length > 0);
    const finalCommand =
      validCommand && validCommand.length > 0 ? validCommand : undefined;

    // Pull the image first (if not available locally)
    try {
      this.logger.debug(`Pulling image ${imageName}...`);

      await pullImage({
        docker,
        imageRef: imageName,
        platform: this.dockerConfig.platform,
        logger: this.logger
      });
    } catch (_error) {
      this.logger.warn(
        `Failed to pull image ${imageName}, will try to use local image`
      );
    }

    // Create container
    const created = await docker.createContainer({
      platform: this.dockerConfig.platform,
      name: containerNameForJob,
      Image: imageName,
      Cmd: finalCommand,
      Env: env,
      Labels: {
        "adp.tsg.app/component": "analytics-job",
        "adp.tsg.app/algorithm-instance-id": algorithmInstanceId,
        "adp.tsg.app/job-name": containerNameForJob,
        "adp.tsg.app/participant-id": participantId
      },
      HostConfig: {
        Binds: binds.length > 0 ? binds : undefined,
        AutoRemove: false,
        NetworkMode: this.dockerConfig.network ?? "bridge"
      }
    });

    // Inject algorithm instance file into the container filesystem BEFORE start, so that it is available when the container starts.
    await this.injectAlgorithmInstanceFile(
      created,
      algorithmInstanceData,
      containerNameForJob
    );

    await created.start();

    this.followingJobStatus.push(algorithmInstanceId);
    this.logger.log(
      `Docker container ${containerNameForJob} started for algorithm instance ${algorithmInstanceId}`
    );

    return {
      token: eventsAccessToken
    };
  }

  async getJobsForAlgorithmInstance(
    algorithmInstanceId: string
  ): Promise<JobInfo[]> {
    const docker = this.getClientOrThrow();
    const containers = await docker.listContainers({
      all: true,
      filters: {
        label: [`adp.tsg.app/algorithm-instance-id=${algorithmInstanceId}`]
      }
    });

    return containers.map((container) =>
      containerToJob(container, { containerName: this.containerName })
    );
  }

  async getPodsForJob(jobName: string): Promise<PodList> {
    // In Docker, a job is essentially a single container, so we return that container as a pod
    const docker = this.getClientOrThrow();
    const containers = await docker.listContainers({
      all: true,
      filters: {
        label: [`adp.tsg.app/job-name=${jobName}`]
      }
    });

    // If no exact match, try to find by container name
    if (containers.length === 0) {
      const allContainers = await docker.listContainers({
        all: true,
        filters: {
          name: [jobName]
        }
      });
      return {
        apiVersion: "v1",
        kind: "PodList",
        items: allContainers.map((container) =>
          containerToPod(container, { containerName: this.containerName })
        )
      };
    }

    return {
      apiVersion: "v1",
      kind: "PodList",
      items: containers.map((container) =>
        containerToPod(container, { containerName: this.containerName })
      )
    };
  }

  async getPodLogs(podName: string): Promise<string> {
    const docker = this.getClientOrThrow();
    try {
      const container = docker.getContainer(podName);
      const logsResult = await container.logs({
        follow: false,
        stdout: true,
        stderr: true,
        tail: 1000
      });

      let output = "";
      const collectWritable = new Writable({
        write(chunk, _encoding, callback) {
          output += chunk.toString();
          callback();
        }
      });

      const inspect = await container.inspect();
      const isTty = Boolean(inspect?.Config?.Tty);

      if (isTty) {
        return logsResult.toString("utf8");
      }

      const stream = Readable.from(logsResult);
      const endPromise = this.waitForStreamToEnd(stream);
      await this.demuxDockerLogsStream(container, stream, collectWritable, {
        isTty
      });
      stream.resume();
      await endPromise;
      return output;
    } catch (error) {
      throw new Error(
        `Failed to get logs for container ${podName}: ${String(error)}`
      );
    }
  }

  async watchPodLogs(jobName: string): Promise<Writable> {
    const pods = await this.getPodsForJob(jobName);

    if (pods.items.length === 0) {
      throw new Error(`No pods found for job ${jobName}`);
    }

    if (pods.items.length > 1) {
      throw new Error(`Multiple pods found for job ${jobName}`);
    }

    const podName = pods.items[0].metadata?.name;
    if (!podName) {
      throw new Error(`Pod name not found for job ${jobName}`);
    }

    const docker = this.getClientOrThrow();

    const logStreamWritable = new Writable({
      write: (chunk, _encoding, callback) => {
        this.logger.log(chunk.toString());
        callback();
      }
    });

    const container = docker.getContainer(podName);
    void (async () => {
      try {
        const logsResult = await container.logs({
          follow: true,
          stdout: true,
          stderr: true,
          tail: 10
        });

        const stream = Buffer.isBuffer(logsResult)
          ? Readable.from(logsResult)
          : (logsResult as unknown as NodeJS.ReadableStream);

        if (!stream) {
          throw new Error("Docker logs stream missing");
        }

        stream.on("end", () => {
          this.logger.log(`Log stream for container ${podName} finished.`);
          logStreamWritable.end();
        });
        stream.on("error", (error: unknown) => {
          this.logger.warn(
            `Log stream for container ${podName} failed: ${String(error)}`
          );
          logStreamWritable.end();
        });

        await this.demuxDockerLogsStream(container, stream, logStreamWritable);
        stream.resume();
      } catch (error) {
        this.logger.warn(
          `Log stream for container ${podName} failed: ${String(error)}`
        );
        logStreamWritable.end();
      }
    })();

    return logStreamWritable;
  }

  private async demuxDockerLogsStream(
    container: Dockerode.Container,
    stream: NodeJS.ReadableStream,
    destination: Writable,
    options?: { isTty?: boolean }
  ): Promise<void> {
    // Docker's logs stream is multiplexed (stdout/stderr) unless the container was created with TTY.
    // For TTY containers, the stream is plain and should not be demuxed.
    let isTty = options?.isTty ?? false;
    if (options?.isTty === undefined) {
      try {
        const inspect = await container.inspect();
        isTty = Boolean(inspect?.Config?.Tty);
      } catch {
        // If inspect fails, fall back to demuxing; worst case logs might be slightly garbled.
        isTty = false;
      }
    }

    if (isTty) {
      stream.pipe(destination, { end: false });
      return;
    }

    container.modem.demuxStream(stream, destination, destination);
  }

  private async waitForStreamToEnd(
    stream: NodeJS.ReadableStream
  ): Promise<void> {
    // Race 'end' vs 'error' so callers get a rejection on stream errors.
    await Promise.race([
      once(stream, "end").then(() => undefined),
      once(stream, "error").then(([error]) => {
        throw error;
      })
    ]);
  }

  private async injectAlgorithmInstanceFile(
    container: Dockerode.Container,
    algorithmInstanceData: unknown,
    containerNameForJob: string
  ): Promise<void> {
    try {
      const algorithmInstanceJson = JSON.stringify(algorithmInstanceData);
      const tarStream = createSingleFileTarArchive(
        "algorithm-instance.json",
        Buffer.from(algorithmInstanceJson, "utf8")
      );
      await container.putArchive(tarStream, {
        path: "/",
        noOverwriteDirNonDir: true
      });
    } catch (error) {
      try {
        await container.remove({ force: true });
      } catch {
        // ignore cleanup failures
      }
      throw new Error(
        `Failed to inject algorithm instance file into container ${containerNameForJob}: ${String(error)}`
      );
    }
  }
}
