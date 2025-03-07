import {
  BatchV1Api,
  CoreV1Api,
  KubeConfig,
  Log
} from "@kubernetes/client-node";
import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AuthClientService, promiseMap } from "@tsg-dsp/common-api";
import {
  AgreementDto,
  Catalog,
  CatalogDto,
  DataPlaneAddressDto,
  DataPlaneCreation,
  DataPlaneDetailsDto,
  DataPlaneRequestResponseDto,
  Dataset,
  DatasetDto,
  deserialize,
  TransferCompletionMessageDto,
  TransferRequestMessageDto,
  TransferStartMessageDto,
  TransferState,
  TransferSuspensionMessageDto,
  TransferTerminationMessageDto
} from "@tsg-dsp/common-dsp";
import { DataPlaneStateDto, TransferDto } from "@tsg-dsp/common-dtos";
import { AxiosInstance } from "axios";
import crypto from "crypto";
import { Writable } from "stream";
import { Repository } from "typeorm";

import { RootConfig } from "../config.js";
import { LoggingService } from "../logging/logging.service.js";
import { resolve } from "../utils/didServiceResolver.js";
import { DataPlaneClientError, DataPlaneError } from "../utils/errors/error.js";
import { DataPlaneStateDao } from "./dataplane.dao.js";
import { TransferDao } from "./transfer.dao.js";

@Injectable()
export class DataPlaneService {
  private readonly axiosDataPlane: AxiosInstance;
  private readonly axiosManagement: AxiosInstance;
  private readonly batchV1Api: BatchV1Api;
  private readonly coreV1Api: CoreV1Api;
  private kubeConfig: KubeConfig;

  constructor(
    private readonly config: RootConfig,
    private readonly loggingService: LoggingService,
    authClient: AuthClientService,
    @InjectRepository(TransferDao)
    private readonly transferRepository: Repository<TransferDao>,
    @InjectRepository(DataPlaneStateDao)
    private readonly stateRepository: Repository<DataPlaneStateDao>
  ) {
    this.initialized = this.init();
    this.axiosDataPlane = authClient.axiosInstance({
      baseURL: this.config.controlPlane.dataPlaneEndpoint
    });
    this.axiosManagement = authClient.axiosInstance({
      baseURL: this.config.controlPlane.managementEndpoint
    });

    this.kubeConfig = new KubeConfig();
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
  initialized: Promise<void>;
  private state?: DataPlaneStateDao;

  async init() {
    const state = await this.stateRepository.findOneBy([]);
    if (state) {
      this.logger.log("Loading state from database");
      this.state = state;
    } else {
      this.logger.log(
        `Creating new state (after ${this.config.controlPlane.initializationDelay}ms)`
      );
      setTimeout(async () => {
        await this.registerDataplane();
      }, this.config.controlPlane.initializationDelay);
    }
  }

  async registerDataplane() {
    const dataPlaneCreation: DataPlaneCreation = {
      identifier: this.state?.identifier,
      dataplaneType: "tsg:analytics",
      endpointPrefix: `${this.config.server.publicAddress}/data`,
      callbackAddress: this.config.server.publicAddress,
      managementAddress: this.config.server.publicAddress,
      managementToken: "",
      catalogSynchronization: "push",
      role: this.config.dataset ? "both" : "consumer"
    };
    const details = await this.axiosDataPlane.post<DataPlaneDetailsDto>(
      `/init`,
      dataPlaneCreation
    );
    const datasets: Dataset[] = await promiseMap(
      this.state?.dataset ?? this.config.dataset,
      async (datasetDto) => deserialize<Dataset>(datasetDto)
    );
    const catalog: Catalog = new Catalog({
      dataset: datasets
    });
    await this.axiosDataPlane.post<DataPlaneDetailsDto>(
      `/${details.data.identifier}/catalog`,
      await catalog.serialize()
    );
    const state = await this.stateRepository.save({
      identifier: details.data.identifier,
      details: details.data,
      dataset: this.state?.dataset ?? this.config.dataset ?? []
    });
    this.state = state;
    return state;
  }

  async getControlPlaneCatalog(): Promise<CatalogDto> {
    try {
      const response =
        await this.axiosManagement.get<CatalogDto>("/catalog/request");
      return response.data;
    } catch (err) {
      throw new DataPlaneClientError(
        "Fetching own catalog from control plane failed",
        err
      ).andLog(this.logger);
    }
  }

  async addDataset(dataset: DatasetDto) {
    const currentState = this.getState();

    const newDatasets = [...currentState.dataset, dataset];

    const catalog: Catalog = new Catalog({
      dataset: await promiseMap(newDatasets, async (datasetDto) =>
        deserialize<Dataset>(datasetDto)
      )
    });
    await this.axiosDataPlane.post<DataPlaneDetailsDto>(
      `/${currentState.identifier}/catalog`,
      await catalog.serialize()
    );
    const state = await this.stateRepository.save({
      ...currentState,
      dataset: newDatasets
    });

    this.state = state;
    return state;
  }

  async updateDataset(datasetId: string, updatedDataset: DatasetDto) {
    const currentState = this.getState();

    if (!currentState.dataset.find((dataset) => dataset["@id"] === datasetId)) {
      throw new DataPlaneError(
        `Could not find dataset with id ${datasetId}`,
        HttpStatus.NOT_FOUND
      );
    }
    const newDatasets = currentState.dataset.map((dataset) =>
      dataset["@id"] === datasetId ? updatedDataset : dataset
    );

    const catalog: Catalog = new Catalog({
      dataset: await promiseMap(newDatasets, async (datasetDto) =>
        deserialize<Dataset>(datasetDto)
      )
    });
    await this.axiosDataPlane.post<DataPlaneDetailsDto>(
      `/${currentState.identifier}/catalog`,
      await catalog.serialize()
    );
    const state = await this.stateRepository.save({
      ...currentState,
      dataset: newDatasets
    });

    this.state = state;
    return state;
  }

  async deleteDataset(datasetId: string) {
    const currentState = this.getState();
    if (!currentState.dataset.find((dataset) => dataset["@id"] === datasetId)) {
      throw new DataPlaneError(
        `Could not find dataset with id ${datasetId}`,
        HttpStatus.NOT_FOUND
      );
    }
    const newDatasets = currentState.dataset.filter(
      (dataset) => dataset["@id"] !== datasetId
    );

    const catalog: Catalog = new Catalog({
      dataset: await promiseMap(newDatasets, async (datasetDto) =>
        deserialize<Dataset>(datasetDto)
      )
    });
    await this.axiosDataPlane.post<DataPlaneDetailsDto>(
      `/${currentState.identifier}/catalog`,
      await catalog.serialize()
    );
    const state = await this.stateRepository.save({
      ...currentState,
      dataset: newDatasets
    });

    this.state = state;
    return state;
  }

  async updateDatasets(datasets: DatasetDto[]) {
    const currentState = this.getState();

    const catalog: Catalog = new Catalog({
      dataset: await promiseMap(datasets, async (datasetDto) =>
        deserialize<Dataset>(datasetDto)
      )
    });
    await this.axiosDataPlane.post<DataPlaneDetailsDto>(
      `/${currentState.identifier}/catalog`,
      await catalog.serialize()
    );
    const state = await this.stateRepository.save({
      ...currentState,
      dataset: datasets
    });

    this.state = state;
    return state;
  }

  private getState(): DataPlaneStateDao {
    if (!this.state) {
      throw new DataPlaneError(
        "No state available yet",
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
    return this.state;
  }

  async getStateDto(): Promise<DataPlaneStateDto> {
    return this.getState();
  }

  async getDatasets(): Promise<DatasetDto[]> {
    const datasetConfig = this.getState().dataset;
    if (datasetConfig) {
      return datasetConfig;
    } else {
      throw new DataPlaneError("No dataset configured", HttpStatus.NOT_FOUND);
    }
  }

  async getTransfers(): Promise<TransferDto[]> {
    return await this.transferRepository.find({});
  }

  async getTransferById(id: string) {
    const transfer = await this.transferRepository.findOneBy({ id: id });
    if (!transfer) {
      throw new HttpException(`Transfer ${id} not found`, HttpStatus.NOT_FOUND);
    }
    return transfer;
  }

  async getMetadata(
    id: string
  ): Promise<{ agreement: AgreementDto; dataset: DatasetDto }> {
    const transfer = await this.getTransferById(id);
    let agreement: AgreementDto;
    try {
      const response = await this.axiosManagement.get<AgreementDto>(
        `/agreements/${transfer.request["dspace:agreementId"]}`
      );
      agreement = response.data;
    } catch (err) {
      throw new DataPlaneClientError(
        `Fetching agreement ${transfer.request["dspace:agreementId"]} failed`,
        err
      ).andLog(this.logger);
    }
    const did = await resolve(transfer.remoteParty);
    const connectorService = did.service?.find(
      (s) => s.type === "connector" && typeof s.serviceEndpoint === "string"
    );
    if (!connectorService) {
      throw new DataPlaneError(
        `No connector service defined in DID document for ${transfer.remoteParty}`,
        HttpStatus.BAD_REQUEST
      ).andLog(new Logger("DidResolver"), "log");
    }

    let dataset: DatasetDto;
    try {
      const response = await this.axiosManagement.get<DatasetDto>(
        `/catalog/dataset`,
        {
          params: {
            address: connectorService.serviceEndpoint,
            id: agreement["odrl:target"],
            audience: transfer.remoteParty
          }
        }
      );
      dataset = response.data;
    } catch (err) {
      throw new DataPlaneClientError(
        `Fetching dataset ${agreement["odrl:target"]} at ${connectorService.serviceEndpoint} (${transfer.remoteParty}) failed`,
        err
      ).andLog(this.logger);
    }

    return {
      agreement: agreement,
      dataset: dataset
    };
  }

  async handleTransferRequest(
    transferRequestMessage: TransferRequestMessageDto,
    role: "provider" | "consumer",
    processId: string,
    remoteParty: string,
    datasetId: string
  ): Promise<DataPlaneRequestResponseDto> {
    const id = crypto.randomUUID();
    let dataAddress: DataPlaneAddressDto | undefined;
    let secret: string | undefined;
    if (role === "provider") {
      secret = crypto.randomBytes(32).toString("hex");
      dataAddress = {
        endpoint: `${this.config.server.publicAddress}/proxy/${id}`,
        properties: [
          {
            name: "Authorization",
            value: `Bearer ${secret}`
          }
        ]
      };
    }

    const transfer = await this.transferRepository.save({
      role: role,
      id: id,
      processId: processId,
      remoteParty: remoteParty,
      datasetId: datasetId,
      secret: secret,
      state: TransferState.REQUESTED,
      request: transferRequestMessage,
      response: {
        accepted: true,
        identifier: id,
        dataAddress: dataAddress
      }
    });

    return transfer.response;
  }

  async transferStart(id: string) {
    const transfer = await this.getTransferById(id);
    try {
      const response = await this.axiosManagement.post(
        `/transfers/${transfer.processId}/start`
      );
      return response.data;
    } catch (err) {
      throw new DataPlaneClientError(
        `Error starting transfer ${id}`,
        err
      ).andLog(this.logger);
    }
  }

  async transferComplete(id: string) {
    const transfer = await this.getTransferById(id);
    try {
      const response = await this.axiosManagement.post(
        `/transfers/${transfer.processId}/complete`
      );
      return response.data;
    } catch (err) {
      throw new DataPlaneClientError(
        `Error starting transfer ${id}`,
        err
      ).andLog(this.logger);
    }
  }

  async transferTerminate(id: string, code: string, reason: string) {
    const transfer = await this.getTransferById(id);
    try {
      const response = await this.axiosManagement.post(
        `/transfers/${transfer.processId}/terminate`,
        {
          code: code,
          reason: reason
        }
      );
      return response.data;
    } catch (err) {
      throw new DataPlaneClientError(
        `Error starting transfer ${id}`,
        err
      ).andLog(this.logger);
    }
  }

  async transferSuspend(id: string, reason: string) {
    const transfer = await this.getTransferById(id);
    try {
      const response = await this.axiosManagement.post(
        `/transfers/${transfer.processId}/suspend`,
        {
          reason: reason
        }
      );
      return response.data;
    } catch (err) {
      throw new DataPlaneClientError(
        `Error starting transfer ${id}`,
        err
      ).andLog(this.logger);
    }
  }

  async handleTransferStart(
    transferStartMessage: TransferStartMessageDto,
    processId: string
  ) {
    const transfer = await this.transferRepository.findOneBy({ id: processId });
    if (!transfer) {
      throw new HttpException(
        `Transfer ${processId} not found`,
        HttpStatus.NOT_FOUND
      );
    }
    transfer.state = TransferState.STARTED;
    if (transfer.role === "consumer") {
      if (transferStartMessage["dspace:dataAddress"] === undefined) {
        throw new HttpException(
          `Expected dataAddress in TransferStartMessage`,
          HttpStatus.BAD_REQUEST
        );
      }
      transfer.dataAddress = transferStartMessage["dspace:dataAddress"];
    }
    await this.transferRepository.save(transfer);
  }

  async handleTransferComplete(
    _transferCompletionMessage: TransferCompletionMessageDto,
    processId: string
  ) {
    const transfer = await this.transferRepository.findOneBy({ id: processId });
    if (!transfer) {
      throw new HttpException(
        `Transfer ${processId} not found`,
        HttpStatus.NOT_FOUND
      );
    }
    transfer.state = TransferState.COMPLETED;
    await this.transferRepository.save(transfer);
  }

  async handleTransferTerminate(
    _transferTerminationMessage: TransferTerminationMessageDto,
    processId: string
  ) {
    const transfer = await this.transferRepository.findOneBy({ id: processId });
    if (!transfer) {
      throw new HttpException(
        `Transfer ${processId} not found`,
        HttpStatus.NOT_FOUND
      );
    }
    transfer.state = TransferState.TERMINATED;
    await this.transferRepository.save(transfer);
  }

  async handleTransferSuspend(
    _transferSuspensionMessage: TransferSuspensionMessageDto,
    processId: string
  ) {
    const transfer = await this.transferRepository.findOneBy({ id: processId });
    if (!transfer) {
      throw new HttpException(
        `Transfer ${processId} not found`,
        HttpStatus.NOT_FOUND
      );
    }
    transfer.state = TransferState.SUSPENDED;
    await this.transferRepository.save(transfer);
  }

  async watchPodLogs({
    podName,
    containerName
  }: {
    podName: string;
    containerName: string;
  }) {
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
      containerName,
      logStreamWritable,
      streamOptions
    );

    logStreamWritable.on("finish", () => {
      console.log("Log stream finished.");
    });
  }

  async spawnJob() {
    const jobName = `analytics-dp-job-${new Date().getTime()}`;
    const containerName = "analytics-dp-container";
    const namespace = this.config.kubernetesConfig.namespace;
    const image = "busybox";

    const command = [
      "sh",
      "-c",
      "echo Hello from the Kubernetes cluster! && sleep 5"
    ];

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
              app: jobName
            }
          },
          spec: {
            restartPolicy: "Never",
            containers: [
              {
                name: containerName,
                image,
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

    let attempts = 0;
    const maxAttempts = 10;
    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    while (attempts < maxAttempts) {
      try {
        const podList = await this.coreV1Api.listNamespacedPod({
          namespace: namespace,
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

        await this.watchPodLogs({ podName, containerName });
        break; // Exit loop if successful
      } catch (_err) {
        console.log("Error watching pod logs:", _err);
        attempts++;
        if (attempts < maxAttempts) {
          console.log(`Retrying in ${attempts * 500}ms...`);

          await delay(attempts * 500); // Exponential backoff
        } else {
          console.error("Max attempts reached. Could not watch pod logs.");
        }
      }
    }
  }
}
