import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  RawBodyRequest,
} from "@nestjs/common";
import axios, { AxiosInstance } from "axios";
import { RootConfig } from "../config";
import crypto from "crypto";
import { Request, Response } from "express";
import { IncomingHttpHeaders } from "http";
import {
  AgreementDto,
  Catalog,
  CatalogDto,
  Constraint,
  DataPlaneAddressDto,
  DataPlaneCreation,
  DataPlaneDetailsDto,
  DataPlaneRequestResponseDto,
  DataService,
  Dataset,
  DatasetDto,
  Distribution,
  ODRLLeftOperand,
  ODRLOperator,
  Offer,
  Permission,
  Policy,
  Prohibition,
  Reference,
  TransferCompletionMessageDto,
  TransferRequestMessageDto,
  TransferStartMessageDto,
  TransferState,
  TransferSuspensionMessageDto,
  TransferTerminationMessageDto,
  deserialize,
} from "@tsg-dsp/common-dsp";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TransferDao } from "./transfer.dao";
import { DataPlaneStateDao } from "./dataplane.dao";
import { DataPlaneClientError, DataPlaneError } from "../utils/errors/error";
import {
  DatasetConfig,
  PolicyConfig,
  RuleConstraintConfig,
} from "@tsg-dsp/http-data-plane-dtos";
import { AuthClientService } from "../auth/auth.client.service";
import { resolve } from "../utils/didServiceResolver";
import { LoggingService } from "../logging/logging.service";
import { LogEntry } from "../logging/logging.dto";
import { DataPlaneStateDto, TransferDto } from "@tsg-dsp/common-dtos";

@Injectable()
export class DataPlaneService {
  private readonly axiosDataPlane: AxiosInstance;
  private readonly axiosManagement: AxiosInstance;
  constructor(
    private readonly config: RootConfig,
    private readonly loggingService: LoggingService,
    authClient: AuthClientService,
    @InjectRepository(TransferDao)
    private readonly transferRepository: Repository<TransferDao>,
    @InjectRepository(DataPlaneStateDao)
    private readonly stateRepository: Repository<DataPlaneStateDao>,
  ) {
    this.initialized = this.init();
    this.axiosDataPlane = authClient.axiosInstance({
      baseURL: this.config.controlPlane.dataPlaneEndpoint,
    });
    this.axiosManagement = authClient.axiosInstance({
      baseURL: this.config.controlPlane.managementEndpoint,
    });
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
        `Creating new state (after ${this.config.controlPlane.initializationDelay}ms)`,
      );
      setTimeout(async () => {
        await this.registerDataplane();
      }, this.config.controlPlane.initializationDelay);
    }
  }

  async registerDataplane() {
    const managementToken = ""; // TODO: should be removed, due to move towards oAuth
    const dataPlaneCreation: DataPlaneCreation = {
      identifier: this.state?.identifier,
      dataplaneType: "dspace:HTTP",
      endpointPrefix: `${this.config.server.publicAddress}/data`,
      callbackAddress: this.config.server.publicAddress,
      managementAddress: this.config.server.publicAddress,
      managementToken: managementToken,
      catalogSynchronization: "push",
      role: this.config.dataset ? "both" : "consumer",
    };
    const details = await this.axiosDataPlane.post<DataPlaneDetailsDto>(
      `/init`,
      dataPlaneCreation,
    );
    let datasets: Dataset[] = [];
    if (this.config.dataset) {
      datasets = await this.createDatasets(
        this.state?.datasetConfig || this.config.dataset,
      );

      const catalog: Catalog = new Catalog({
        dataset: datasets,
      });
      await this.axiosDataPlane.post<DataPlaneDetailsDto>(
        `/${details.data.identifier}/catalog`,
        await catalog.serialize(),
      );
    }
    const state = await this.stateRepository.save({
      identifier: details.data.identifier,
      managementToken: managementToken,
      details: details.data,
      datasetConfig: this.state?.datasetConfig || this.config.dataset,
      dataset: await Promise.all(datasets.map((d) => d.serialize())),
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
        err,
      ).andLog(this.logger);
    }
  }

  private constructConstraint(constraint: RuleConstraintConfig): Constraint {
    switch (constraint.type) {
      case "CredentialType":
        return new Constraint({
          leftOperand: "dspace:credentialType",
          operator: ODRLOperator.EQ,
          rightOperand: constraint.value,
        });
      case "Recipient":
        return new Constraint({
          leftOperand: ODRLLeftOperand.RECIPIENT,
          operator: ODRLOperator.EQ,
          rightOperand: constraint.value,
        });
      case "License":
        return new Constraint({
          leftOperand: "dspace:license",
          operator: ODRLOperator.EQ,
          rightOperand: constraint.value,
        });
      default:
        return new Constraint({
          leftOperand: constraint.type,
          operator: ODRLOperator.EQ,
          rightOperand: constraint.value,
        });
    }
  }

  private async constructOffer(
    datasetId: string,
    policyConfig?: PolicyConfig,
  ): Promise<Policy[] | undefined> {
    if (!policyConfig) return;
    if (policyConfig.type === "default") return;
    if (policyConfig.type === "manual") {
      if (!policyConfig.raw) {
        throw new DataPlaneError(
          `Property "raw" must be provided for policy configs with type "manual"`,
          HttpStatus.BAD_REQUEST,
        );
      } else {
        try {
          const deserialized = await deserialize<Offer>(policyConfig.raw);
          return [deserialized];
        } catch (err) {
          throw new DataPlaneError(
            `Could not deserialize "raw" into a ODRL Policy`,
            HttpStatus.BAD_REQUEST,
            err,
          );
        }
      }
    }

    let catalog: CatalogDto | undefined = undefined;
    try {
      catalog = await this.getControlPlaneCatalog();
    } catch (err) {
      this.logger.warn(
        "Catalog could not be fetched from control plane, therefore, assigner fields in ODRL offers will be empty.",
      );
    }

    return [
      new Offer({
        assigner: catalog?.["dct:creator"] || catalog?.["dct:publisher"] || "",
        permission: policyConfig.permissions?.map((permission) => {
          return new Permission({
            action: permission.action,
            target: datasetId,
            constraint: permission.constraints?.map((constraint) =>
              this.constructConstraint(constraint),
            ),
          });
        }),
        prohibition: policyConfig.prohibitions?.map((prohibition) => {
          return new Prohibition({
            action: prohibition.action,
            target: datasetId,
            constraint: prohibition.constraints?.map((constraint) =>
              this.constructConstraint(constraint),
            ),
          });
        }),
      }),
    ];
  }

  async updateDatasetConfig(datasetConfig: DatasetConfig) {
    const currentState = this.getState();

    if (currentState.details.role === "consumer") {
      currentState.details.role = "both";
      await this.axiosDataPlane.post<DataPlaneDetailsDto>(
        `/init`,
        currentState.details,
      );
    }

    const datasets = await this.createDatasets(datasetConfig);

    const catalog: Catalog = new Catalog({
      dataset: datasets,
    });
    await this.axiosDataPlane.post<DataPlaneDetailsDto>(
      `/${currentState.identifier}/catalog`,
      await catalog.serialize(),
    );
    const state = await this.stateRepository.save({
      ...currentState,
      datasetConfig: datasetConfig,
      dataset: await Promise.all(datasets.map((d) => d.serialize())),
    });

    this.state = state;
    return state;
  }

  private async createDatasets(datasetConfig: DatasetConfig) {
    const id =
      datasetConfig.id ||
      this.state?.dataset?.[0]?.["@id"] ||
      `urn:uuid:${crypto.randomUUID()}`;

    const baseDataset = new Dataset({
      id: id,
      title: datasetConfig.title,
      conformsTo: datasetConfig.conformsTo
        ? [datasetConfig.conformsTo]
        : undefined,
      hasVersion: datasetConfig.versions.map(
        (v) => new Reference(`${id}:${v.version}`),
      ),
      hasCurrentVersion: new Reference(
        `${id}:${datasetConfig.versions[0].version}`,
      ),
      distribution: [
        new Distribution({
          id: `${id}:http`,
          format: "dspace:HTTP",
          title: datasetConfig.title,
          conformsTo: datasetConfig.versions[0].openApiSpec
            ? [datasetConfig.versions[0].openApiSpec]
            : undefined,
          accessService: [
            new DataService({
              endpointURL:
                datasetConfig.versions[0].backend ||
                this.config.controlPlane.controlEndpoint,
            }),
          ],
        }),
      ],
      hasPolicy: await this.constructOffer(id, datasetConfig.policy),
    });
    const versions = datasetConfig.versions.map((v, idx) => {
      return {
        ...v,
        previous: datasetConfig.versions.at(idx + 1),
      };
    });
    const datasets = [baseDataset];
    for (const v of versions) {
      datasets.push(
        new Dataset({
          id: `${id}:${v.version}`,
          title: `${datasetConfig.title} (${v.version})`,
          version: `${v.version}`,
          isVersionOf: new Reference(id),
          previousVersion: v.previous
            ? new Reference(`${id}:${v.previous.version}`)
            : undefined,
          conformsTo: v.openApiSpec ? [v.openApiSpec] : undefined,
          distribution: [
            new Distribution({
              id: `${id}:${v.version}:http`,
              format: "dspace:HTTP",
              title: datasetConfig.title,
              conformsTo: v.openApiSpec ? [v.openApiSpec] : undefined,
              accessService: [
                new DataService({
                  endpointURL:
                    v.backend || this.config.controlPlane.controlEndpoint,
                }),
              ],
            }),
          ],
          hasPolicy: await this.constructOffer(id, datasetConfig.policy),
        }),
      );
    }
    return datasets;
  }

  private getState(): DataPlaneStateDao {
    if (!this.state) {
      throw new DataPlaneError(
        "No state available yet",
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return this.state;
  }

  async getStateDto(): Promise<DataPlaneStateDto> {
    return this.getState();
  }

  async getDatasetConfig(): Promise<DatasetConfig> {
    const datasetConfig = this.getState().datasetConfig;
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
    id: string,
  ): Promise<{ agreement: AgreementDto; dataset: DatasetDto }> {
    const transfer = await this.getTransferById(id);
    let agreement: AgreementDto;
    try {
      const response = await this.axiosManagement.get<AgreementDto>(
        `/agreements/${transfer.request["dspace:agreementId"]}`,
      );
      agreement = response.data;
    } catch (err) {
      throw new DataPlaneClientError(
        `Fetching agreement ${transfer.request["dspace:agreementId"]} failed`,
        err,
      ).andLog(this.logger);
    }
    const did = await resolve(transfer.remoteParty);
    const connectorService = did.service?.find(
      (s) => s.type === "connector" && typeof s.serviceEndpoint === "string",
    );
    if (!connectorService) {
      throw new DataPlaneError(
        `No connector service defined in DID document for ${transfer.remoteParty}`,
        HttpStatus.BAD_REQUEST,
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
            audience: transfer.remoteParty,
          },
        },
      );
      dataset = response.data;
    } catch (err) {
      throw new DataPlaneClientError(
        `Fetching dataset ${agreement["odrl:target"]} at ${connectorService.serviceEndpoint} (${transfer.remoteParty}) failed`,
        err,
      ).andLog(this.logger);
    }

    return {
      agreement: agreement,
      dataset: dataset,
    };
  }

  async handleTransferRequest(
    transferRequestMessage: TransferRequestMessageDto,
    role: "provider" | "consumer",
    processId: string,
    remoteParty: string,
    datasetId: string,
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
            value: `Bearer ${secret}`,
          },
        ],
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
        dataAddress: dataAddress,
      },
    });

    return transfer.response;
  }

  async transferStart(id: string) {
    const transfer = await this.getTransferById(id);
    try {
      const response = await this.axiosManagement.post(
        `/transfers/${transfer.processId}/start`,
      );
      return response.data;
    } catch (err) {
      throw new DataPlaneClientError(
        `Error starting transfer ${id}`,
        err,
      ).andLog(this.logger);
    }
  }

  async transferComplete(id: string) {
    const transfer = await this.getTransferById(id);
    try {
      const response = await this.axiosManagement.post(
        `/transfers/${transfer.processId}/complete`,
      );
      return response.data;
    } catch (err) {
      throw new DataPlaneClientError(
        `Error starting transfer ${id}`,
        err,
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
          reason: reason,
        },
      );
      return response.data;
    } catch (err) {
      throw new DataPlaneClientError(
        `Error starting transfer ${id}`,
        err,
      ).andLog(this.logger);
    }
  }

  async transferSuspend(id: string, reason: string) {
    const transfer = await this.getTransferById(id);
    try {
      const response = await this.axiosManagement.post(
        `/transfers/${transfer.processId}/suspend`,
        {
          reason: reason,
        },
      );
      return response.data;
    } catch (err) {
      throw new DataPlaneClientError(
        `Error starting transfer ${id}`,
        err,
      ).andLog(this.logger);
    }
  }

  async handleTransferStart(
    transferStartMessage: TransferStartMessageDto,
    processId: string,
  ) {
    const transfer = await this.transferRepository.findOneBy({ id: processId });
    if (!transfer) {
      throw new HttpException(
        `Transfer ${processId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }
    transfer.state = TransferState.STARTED;
    if (transfer.role === "consumer") {
      if (transferStartMessage["dspace:dataAddress"] === undefined) {
        throw new HttpException(
          `Expected dataAddress in TransferStartMessage`,
          HttpStatus.BAD_REQUEST,
        );
      }
      transfer.dataAddress = transferStartMessage["dspace:dataAddress"];
    }
    await this.transferRepository.save(transfer);
  }

  async handleTransferComplete(
    transferCompletionMessage: TransferCompletionMessageDto,
    processId: string,
  ) {
    const transfer = await this.transferRepository.findOneBy({ id: processId });
    if (!transfer) {
      throw new HttpException(
        `Transfer ${processId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }
    transfer.state = TransferState.COMPLETED;
    await this.transferRepository.save(transfer);
  }

  async handleTransferTerminate(
    transferTerminationMessage: TransferTerminationMessageDto,
    processId: string,
  ) {
    const transfer = await this.transferRepository.findOneBy({ id: processId });
    if (!transfer) {
      throw new HttpException(
        `Transfer ${processId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }
    transfer.state = TransferState.TERMINATED;
    await this.transferRepository.save(transfer);
  }

  async handleTransferSuspend(
    transferSuspensionMessage: TransferSuspensionMessageDto,
    processId: string,
  ) {
    const transfer = await this.transferRepository.findOneBy({ id: processId });
    if (!transfer) {
      throw new HttpException(
        `Transfer ${processId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }
    transfer.state = TransferState.SUSPENDED;
    await this.transferRepository.save(transfer);
  }

  async executeProxyRequest(
    processId: string,
    path: string,
    request: RawBodyRequest<Request>,
    response: Response,
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  ): Promise<any> {
    const transfer = await this.transferRepository.findOneBy({ id: processId });
    if (!transfer) {
      throw new HttpException(
        `Transfer ${processId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }
    if (transfer.state !== TransferState.STARTED) {
      this.logger.warn(
        `Transfer process ${processId} is in ${transfer.state} state, accessing is not allowed`,
      );
      throw new HttpException(
        `Transfer process ${processId} is in ${transfer.state} state, accessing is not allowed`,
        HttpStatus.FORBIDDEN,
      );
    }
    if (transfer.dataAddress === undefined) {
      throw new HttpException(
        `Transfer ${processId} does not have a data address present`,
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const newUrl =
        `${transfer.dataAddress["dspace:endpoint"]}/${path}`.replace(
          /([^:]\/)\/+/g,
          "$1",
        );
      const headers = request.headers;
      headers["authorization"] = transfer.dataAddress[
        "dspace:endpointProperties"
      ].find((p) => p["dspace:name"] === "Authorization")?.["dspace:value"];

      let bodyLength = -1;
      if (this.config.logging.debug && request.rawBody) {
        bodyLength = Buffer.byteLength(request.rawBody);
      }

      await this.proxy(
        request.method,
        newUrl,
        headers,
        request.rawBody,
        request.query,
        response,
        false,
      );
      const logEntry: LogEntry = {
        date: new Date(),
        remoteParty: transfer.remoteParty,
        transferId: transfer.id,
        datasetId: transfer.datasetId,
        path: path,
        method: request.method,
        status: response.statusCode,
      };
      if (this.config.logging.debug) {
        logEntry.debug = {
          request: {
            headers: headers,
            query: request.query,
            bodyLength: bodyLength,
          },
          response: {
            headers: response.getHeaders(),
          },
        };
      }
      await this.loggingService.insertEgressLog(logEntry);
    } catch (e) {
      this.logger.log(`Error in executing transfer: ${e}`);
      throw new HttpException(
        `Error in executing transfer: ${e}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async handleProxyRequest(
    processId: string,
    authorization: string,
    path: string,
    request: RawBodyRequest<Request>,
    response: Response,
  ) {
    const transfer = await this.transferRepository.findOneBy({ id: processId });
    if (!transfer) {
      this.logger.warn(`Transfer ${processId} not found`);
      throw new HttpException(
        `Transfer ${processId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }
    const state = await this.getState();
    let dataset = state.dataset?.find((d) => d["@id"] === transfer.datasetId);
    if (!dataset) {
      throw new HttpException(
        `Dataset ${transfer.datasetId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }
    if (!dataset["dcat:version"] && dataset["dcat:hasCurrentVersion"]) {
      dataset = state.dataset?.find(
        (d) => d["@id"] === dataset?.["dcat:hasCurrentVersion"]?.["@id"],
      );
      if (!dataset) {
        throw new HttpException(
          `Dataset of current version ${dataset?.["dcat:hasCurrentVersion"]?.["@id"]} not found`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }

    if (transfer.state !== TransferState.STARTED) {
      this.logger.warn(
        `Transfer process ${processId} is in ${transfer.state} state, accessing is not allowed`,
      );
      throw new HttpException(
        `Transfer process ${processId} is in ${transfer.state} state, accessing is not allowed`,
        HttpStatus.FORBIDDEN,
      );
    }
    if (authorization !== `Bearer ${transfer.secret}`) {
      this.logger.warn(
        `Incorrect authorization header ${authorization} vs ${`Bearer ${transfer.secret}`}`,
      );
      throw new HttpException(
        `Incorrect authorization header`,
        HttpStatus.UNAUTHORIZED,
      );
    }

    this.logger.log(`Request for data for ${processId}`);
    this.logger.log(`Request: ${request.method} ${request.path}`);

    try {
      const headers = request.headers;
      const version = state.datasetConfig?.versions?.find(
        (v) => v.version === dataset["dcat:version"],
      );
      if (!version) {
        throw new HttpException(
          `Version configuration not found`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      if (version.authorization) {
        headers["authorization"] = version.authorization;
      }
      const newUrl = `${version.backend}/${path}`.replace(/([^:]\/)\/+/g, "$1");
      this.logger.log(`Rewrite: ${newUrl}`);
      this.logger.log(`Headers: ${JSON.stringify(headers)}`);
      let bodyLength = -1;
      if (this.config.logging.debug && request.rawBody) {
        bodyLength = Buffer.byteLength(request.rawBody);
      }
      await this.proxy(
        request.method,
        newUrl,
        headers,
        request.rawBody,
        request.query,
        response,
        version.authorization !== undefined,
      );
      const logEntry: LogEntry = {
        date: new Date(),
        remoteParty: transfer.remoteParty,
        transferId: transfer.id,
        datasetId: transfer.datasetId,
        path: path,
        method: request.method,
        status: response.statusCode,
      };
      if (this.config.logging.debug) {
        logEntry.debug = {
          request: {
            headers: headers,
            query: request.query,
            bodyLength: bodyLength,
          },
          response: {
            headers: response.getHeaders(),
          },
        };
      }
      await this.loggingService.insertIngressLog(logEntry);
    } catch (e) {
      this.logger.log(`Error in executing transfer: ${e}`);
      throw new HttpException(
        `Error in executing transfer: ${e}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async proxy(
    method: string,
    url: string,
    headers: IncomingHttpHeaders,
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    body: Buffer | undefined,
    query: qs.ParsedQs,
    response: Response,
    removeAuth: boolean,
  ) {
    delete headers["transfer-encoding"];
    delete headers["keep-alive"];
    delete headers["connection"];
    delete headers["accept-ranges"];
    delete headers["content-length"];
    delete headers["host"];
    delete headers["cookie"];
    if (removeAuth) {
      delete headers["authorization"];
    }
    try {
      this.logger.log(
        `Proxying request ${method} ${url} (${JSON.stringify(headers)})`,
      );
      const proxyResponse = await axios({
        method: method,
        url: url,
        headers: headers,
        data: body,
        params: query,
        responseType: "stream",
        validateStatus: () => true,
      });
      Object.entries(proxyResponse.headers).forEach(([name, value]) => {
        if (value) {
          response.setHeader(name, value);
        }
      });
      response.status(proxyResponse.status);
      proxyResponse.data.pipe(response);
    } catch (e) {
      this.logger.warn(`Error proxying call to ${url}: ${e}`);
    }
  }
}
