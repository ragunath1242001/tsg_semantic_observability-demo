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
  DataPlaneAddressDto,
  DataPlaneCreation,
  DataPlaneDetailsDto,
  DataPlaneRequestResponseDto,
  DataService,
  Dataset,
  DatasetDto,
  Distribution,
  Reference,
  TransferCompletionMessageDto,
  TransferRequestMessageDto,
  TransferStartMessageDto,
  TransferState,
  TransferSuspensionMessageDto,
  TransferTerminationMessageDto,
} from "@tsg-dsp/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TransferDao } from "./transfer.dao";
import { DataPlaneStateDao } from "./dataplane.dao";
import { DataPlaneClientError, DataPlaneError } from "../utils/errors/error";
import { DataPlaneStateDto, TransferDto } from "@libs/dtos";
import { AuthClientService } from "../auth/auth.client.service";
import { resolve } from "../utils/didServiceResolver";

@Injectable()
export class DataPlaneService {
  private readonly axiosDataPlane: AxiosInstance;
  private readonly axiosManagement: AxiosInstance;
  constructor(
    private readonly config: RootConfig,
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
        const managementToken = ""; // TODO: should be removed, due to move towards oAuth
        const dataPlaneCreation: DataPlaneCreation = {
          dataplaneType: "dspace:HTTP",
          endpointPrefix: `${this.config.server.publicAddress}/data`,
          callbackAddress: this.config.server.publicAddress,
          managementAddress: this.config.server.publicAddress,
          managementToken: managementToken,
          catalogSynchronization: "push",
          role: "both",
        };
        const details = await this.axiosDataPlane.post<DataPlaneDetailsDto>(
          `/init`,
          dataPlaneCreation,
        );
        const accessService = new DataService({
          endpointURL: this.config.controlPlane.controlEndpoint,
        });
        const id = this.config.dataset.id || `urn:uuid:${crypto.randomUUID()}`;
        const baseDataset = new Dataset({
          id: id,
          title: this.config.dataset.title,
          hasVersion: this.config.dataset.versions.map(
            (v) => new Reference(`${id}:${v.version}`),
          ),
          hasCurrentVersion: new Reference(
            `${id}:${this.config.dataset.versions[0].version}`,
          ),
          distribution: [
            new Distribution({
              id: `${id}:http`,
              format: "dspace:HTTP",
              title: this.config.dataset.title,
              conformsTo: this.config.dataset.versions[0].openApiSpec
                ? new Reference(this.config.dataset.versions[0].openApiSpec)
                : undefined,
              accessService: [accessService],
            }),
          ],
        });
        const versions = this.config.dataset.versions.map((v, idx) => {
          return {
            ...v,
            previous: this.config.dataset.versions.at(idx + 1),
          };
        });
        const versionedDatasets = versions.map(
          (v) =>
            new Dataset({
              id: `${id}:${v.version}`,
              title: `${this.config.dataset.title} (${v.version})`,
              version: `${v.version}`,
              isVersionOf: new Reference(id),
              previousVersion: v.previous
                ? new Reference(`${id}:${v.previous.version}`)
                : undefined,
              conformsTo: v.openApiSpec,
              distribution: [
                new Distribution({
                  id: `${id}:${v.version}:http`,
                  format: "dspace:HTTP",
                  title: this.config.dataset.title,
                  conformsTo: v.openApiSpec
                    ? new Reference(v.openApiSpec)
                    : undefined,
                  accessService: [accessService],
                }),
              ],
            }),
        );

        const catalog: Catalog = new Catalog({
          dataset: [baseDataset, ...versionedDatasets],
        });
        await this.axiosDataPlane.post<DataPlaneDetailsDto>(
          `/${details.data.identifier}/catalog`,
          await catalog.serialize(),
        );
        const state = await this.stateRepository.save({
          identifier: details.data.identifier,
          managementToken: managementToken,
          details: details.data,
          dataset: await Promise.all(
            [baseDataset, ...versionedDatasets].map((d) => d.serialize()),
          ),
        });
        this.state = state;
      }, this.config.controlPlane.initializationDelay);
    }
  }

  async getState(): Promise<DataPlaneStateDto> {
    if (!this.state) {
      throw new DataPlaneError(
        "No state available yet",
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return this.state;
  }

  async getTransfers(): Promise<TransferDto[]> {
    return await this.transferRepository.find({});
  }

  private async getTransferById(id: string) {
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
        `/negotiations/agreement/${transfer.request["dspace:agreementId"]}`,
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

      await this.proxy(
        request.method,
        newUrl,
        headers,
        request.rawBody,
        request.query,
        response,
        false,
      );
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
    const state = await this.stateRepository.findOneBy([]);
    let dataset = state?.dataset?.find((d) => d["@id"] === transfer.datasetId);
    if (!dataset) {
      throw new HttpException(
        `Dataset ${transfer.datasetId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }
    if (!dataset["dcat:version"] && dataset["dcat:hasCurrentVersion"]) {
      dataset = state?.dataset?.find(
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
      const version = this.config.dataset.versions.find(
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

      await this.proxy(
        request.method,
        newUrl,
        headers,
        request.rawBody,
        request.query,
        response,
        version.authorization !== undefined,
      );
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
      console.log(e);
      return;
    }
  }
}
