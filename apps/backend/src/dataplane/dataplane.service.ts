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
import bcrypt from "bcrypt";
import { Request, Response } from "express";
import { IncomingHttpHeaders } from "http";
import {
  AgreementDto,
  DataPlaneAddressDto,
  DataPlaneCreation,
  DataPlaneDetailsDto,
  DataPlaneRequestResponseDto,
  DataServiceDto,
  DatasetDto,
  DistributionDto,
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
    this.init();
    this.axiosDataPlane = authClient.axiosInstance({
      baseURL: this.config.controlPlane.dataPlaneEndpoint,
    });
    this.axiosManagement = authClient.axiosInstance({
      baseURL: this.config.controlPlane.managementEndpoint,
    });
  }
  private readonly logger = new Logger(this.constructor.name);
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
        const accessService: DataServiceDto = {
          "@id": `urn:uuid:${crypto.randomUUID()}`,
          "@type": "dcat:DataService",
          "dcat:endpointURL": this.config.controlPlane.controlEndpoint,
        };
        const dataset: DatasetDto = {
          "@context": "https://w3id.org/dspace/v0.8/context.json",
          "@id": this.config.dataset.id || `urn:uuid:${crypto.randomUUID()}`,
          "@type": "dcat:Dataset",
          "dct:title": this.config.dataset.title,
          "dcat:distribution": this.config.dataset.distributions.map(
            (distributionConfig) => {
              const distribution: DistributionDto = {
                "@id":
                  distributionConfig.id || `urn:uuid:${crypto.randomUUID()}`,
                "@type": "dcat:Distribution",
                "dct:format": "dspace:HTTP",
                "dct:title": `Version ${distributionConfig.version}`,
                "dct:conformsTo": distributionConfig.openApiSpec
                  ? { "@id": distributionConfig.openApiSpec }
                  : undefined,
                "dcat:accessService": [accessService],
              };
              return distribution;
            },
          ),
        };
        await this.axiosDataPlane.post<DataPlaneDetailsDto>(
          `/${details.data.identifier}/catalog`,
          dataset,
        );
        const state = await this.stateRepository.save({
          identifier: details.data.identifier,
          managementToken: managementToken,
          details: details.data,
          dataset: dataset,
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
    version: string,
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
        `${transfer.dataAddress["dspace:endpoint"]}/${version}/${path}`.replace(
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
    version: string,
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
    const distribution = this.config.dataset.distributions.find(
      (distribution) => distribution.version === version,
    );
    if (distribution === undefined) {
      this.logger.warn(`No distribution for version ${version} found`);
      throw new HttpException(
        `No distribution for version ${version} found`,
        HttpStatus.NOT_FOUND,
      );
    }
    try {
      const headers = request.headers;
      if (distribution.authorization) {
        headers["authorization"] = distribution.authorization;
      }
      const newUrl = `${distribution.backend}/${path}`.replace(
        /([^:]\/)\/+/g,
        "$1",
      );
      this.logger.log(`Rewrite: ${newUrl}`);
      this.logger.log(`Headers: ${JSON.stringify(headers)}`);

      await this.proxy(
        request.method,
        newUrl,
        headers,
        request.rawBody,
        request.query,
        response,
        distribution.authorization !== undefined,
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
