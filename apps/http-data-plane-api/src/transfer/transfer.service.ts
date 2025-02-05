import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  RawBodyRequest
} from "@nestjs/common";
import axios, { AxiosInstance } from "axios";
import { RootConfig } from "../config.js";
import crypto from "crypto";
import { Request, Response } from "express";
import { IncomingHttpHeaders } from "http";
import {
  AgreementDto,
  ContractNegotiationDto,
  DataPlaneAddressDto,
  DataPlaneRequestResponseDto,
  DatasetDto,
  OfferDto,
  TransferCompletionMessageDto,
  TransferRequestMessageDto,
  TransferStartMessageDto,
  TransferState,
  TransferSuspensionMessageDto,
  TransferTerminationMessageDto,
  defaultContext
} from "@tsg-dsp/common-dsp";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DataPlaneClientError, DataPlaneError } from "../utils/errors/error.js";
import { resolveControlPlaneServiceUrl } from "../utils/didServiceResolver.js";
import { LoggingService } from "../logging/logging.service.js";
import { LogEntry } from "../logging/logging.dto.js";
import { NegotiationDetailDto, TransferDto } from "@tsg-dsp/common-dtos";
import { AuthClientService } from "@tsg-dsp/common-api";
import { DataPlaneService } from "../dataplane/dataplane.service.js";
import { TransferDao } from "./transfer.dao.js";

@Injectable()
export class TransferService {
  private readonly axiosManagement: AxiosInstance;
  constructor(
    private readonly config: RootConfig,
    private readonly loggingService: LoggingService,
    private readonly dataPlaneService: DataPlaneService,
    authClient: AuthClientService,
    @InjectRepository(TransferDao)
    readonly transferRepository: Repository<TransferDao>
  ) {
    this.axiosManagement = authClient.axiosInstance({
      baseURL: this.config.controlPlane.managementEndpoint
    });
  }
  logger = new Logger(this.constructor.name);

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

  async getDataset(
    did: string,
    datasetId: string,
    cpAddress?: string
  ): Promise<DatasetDto> {
    const address = cpAddress ?? (await resolveControlPlaneServiceUrl(did));

    try {
      const response = await this.axiosManagement.get<DatasetDto>(
        `/catalog/dataset`,
        {
          params: {
            address: address,
            id: datasetId,
            audience: did
          }
        }
      );
      return response.data;
    } catch (err) {
      throw new DataPlaneClientError(
        `Fetching dataset ${datasetId} at ${address} (${did}) failed`,
        err
      ).andLog(this.logger);
    }
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

    const dataset = await this.getDataset(
      transfer.remoteParty,
      agreement["odrl:target"]
    );

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
    const transfer = await this.getTransferById(processId);
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
    transferCompletionMessage: TransferCompletionMessageDto,
    processId: string
  ) {
    const transfer = await this.getTransferById(processId);
    transfer.state = TransferState.COMPLETED;
    await this.transferRepository.save(transfer);
  }

  async handleTransferTerminate(
    transferTerminationMessage: TransferTerminationMessageDto,
    processId: string
  ) {
    const transfer = await this.getTransferById(processId);
    transfer.state = TransferState.TERMINATED;
    await this.transferRepository.save(transfer);
  }

  async getNegotiation(processId: string): Promise<NegotiationDetailDto> {
    try {
      const response = await this.axiosManagement.get<NegotiationDetailDto>(
        `/negotiations/${processId}`
      );
      return response.data;
    } catch (err) {
      throw new DataPlaneClientError(
        `Fetching negotiation ${processId} failed`,
        err
      ).andLog(this.logger);
    }
  }

  async checkForFinalizedNegotiation(
    negotiationId: string
  ): Promise<NegotiationDetailDto | undefined> {
    const negotiation = await this.getNegotiation(negotiationId);
    if (negotiation.state === "dspace:FINALIZED") {
      return negotiation;
    }
    return undefined;
  }

  async getNegotiationWithBackoff(
    negotiationId: string,
    maxRetries: number = 5,
    initialDelay: number = 500
  ): Promise<NegotiationDetailDto> {
    let retries = 0;
    let delay = initialDelay;

    while (retries < maxRetries) {
      try {
        const negotiation =
          await this.checkForFinalizedNegotiation(negotiationId);
        if (negotiation) {
          return negotiation;
        }
      } catch (err) {
        this.logger.debug(
          `Negotiation ${negotiationId} did not finalize after ${retries} retries`
        );
      }

      retries++;
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }

    throw new Error(
      `Negotiation ${negotiationId} did not finalize after ${maxRetries} retries`
    );
  }

  async obtainNegotiation(
    datasetId: string,
    address: string,
    audience: string
  ): Promise<NegotiationDetailDto> {
    const dataset = await this.getDataset(audience, datasetId, address);
    const offer = dataset["odrl:hasPolicy"]?.[0] as OfferDto;
    if (offer) {
      offer["@context"] = defaultContext();
    }
    const response = await this.axiosManagement.post<ContractNegotiationDto>(
      "negotiations/request",
      offer,
      {
        params: {
          dataSet: datasetId,
          address: address,
          audience: audience
        }
      }
    );
    this.logger.debug(
      `Contract negotiation requested for ${datasetId} at address ${address} with audience ${audience}.`
    );
    return await this.getNegotiationWithBackoff(
      response.data?.["dspace:providerPid"]
    );
  }

  async handleTransferSuspend(
    transferSuspensionMessage: TransferSuspensionMessageDto,
    processId: string
  ) {
    const transfer = await this.getTransferById(processId);
    transfer.state = TransferState.SUSPENDED;
    await this.transferRepository.save(transfer);
  }

  async requestTransfer(
    negotiation: NegotiationDetailDto,
    address: string,
    audience: string,
    datasetId: string
  ) {
    try {
      const agreementId = negotiation?.agreement?.["@id"];
      if (!agreementId) {
        throw new DataPlaneError(
          `No agreement ID found for negotiation ${negotiation.localId}`,
          HttpStatus.BAD_REQUEST
        );
      }
      await this.axiosManagement.post("transfers/request", null, {
        params: {
          address: address,
          agreementId: agreementId,
          audience: audience
        }
      });

      this.logger.debug(
        `Transfer requested for dataset ${datasetId} with agreement ${agreementId} at address ${address} with audience ${audience}.`
      );
    } catch (err) {
      throw new DataPlaneClientError("Transfer request failed", err).andLog(
        this.logger
      );
    }
  }
  async retryFindTransfer(
    datasetId: string,
    maxRetries: number = 5,
    initialDelay: number = 500
  ): Promise<TransferDao | null> {
    let retries = 0;
    let delay = initialDelay;

    while (retries < maxRetries) {
      try {
        const transfer = await this.transferRepository.findOne({
          where: { datasetId: datasetId },
          order: { createdDate: "DESC" }
        });
        if (transfer) {
          return transfer;
        }
      } catch (err) {
        this.logger.warn(
          `Attempt ${
            retries + 1
          } failed to find transfer for dataset ${datasetId}: ${err}`
        );
      }

      retries++;
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }

    this.logger.error(
      `Failed to find transfer for dataset ${datasetId} after ${maxRetries} retries`
    );
    return null;
  }

  async determineTransferId(
    datasetId: string,
    audience: string,
    controlPlaneAddress?: string
  ): Promise<string> {
    let transfer: TransferDao | null;
    let negotiation: NegotiationDetailDto | null;
    transfer = await this.transferRepository.findOne({
      where: { datasetId: datasetId, state: TransferState.STARTED },
      order: { createdDate: "DESC" }
    });
    const address =
      controlPlaneAddress ?? (await resolveControlPlaneServiceUrl(audience));
    if (!transfer) {
      this.logger.debug(
        `Did not find active transfer for dataset ${datasetId}, checking for negotiation.`
      );

      try {
        const resp = await this.axiosManagement.get<NegotiationDetailDto>(
          `negotiations/dataset/${datasetId}`,
          {
            params: {
              remoteParty: audience
            }
          }
        );
        negotiation = resp.data;
      } catch (err) {
        this.logger.debug(
          `No negotiation found for dataset ${datasetId}, requesting new negotiation.`
        );
        negotiation = await this.obtainNegotiation(
          datasetId,
          address,
          audience
        );
      }

      await this.requestTransfer(negotiation, address, audience, datasetId);
      transfer = await this.retryFindTransfer(datasetId);
    }

    if (!transfer) {
      throw new DataPlaneClientError(
        `No transfer found for dataset ${datasetId}`,
        HttpStatus.BAD_REQUEST
      );
    }

    return transfer.id;
  }

  async executeProxyRequest(
    processId: string,
    path: string,
    request: RawBodyRequest<Request>,
    response: Response
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  ): Promise<any> {
    const transfer = await this.getTransferById(processId);

    if (transfer.state !== TransferState.STARTED) {
      this.logger.warn(
        `Transfer process ${processId} is in ${transfer.state} state, accessing is not allowed`
      );
      throw new HttpException(
        `Transfer process ${processId} is in ${transfer.state} state, accessing is not allowed`,
        HttpStatus.FORBIDDEN
      );
    }
    if (transfer.dataAddress === undefined) {
      throw new HttpException(
        `Transfer ${processId} does not have a data address present`,
        HttpStatus.BAD_REQUEST
      );
    }

    try {
      const newUrl =
        `${transfer.dataAddress["dspace:endpoint"]}/${path}`.replace(
          /([^:]\/)\/+/g,
          "$1"
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
        false
      );
      const logEntry: LogEntry = {
        date: new Date(),
        remoteParty: transfer.remoteParty,
        transferId: transfer.id,
        datasetId: transfer.datasetId,
        path: path,
        method: request.method,
        status: response.statusCode
      };
      if (this.config.logging.debug) {
        logEntry.debug = {
          request: {
            headers: headers,
            query: request.query,
            bodyLength: bodyLength
          },
          response: {
            headers: response.getHeaders()
          }
        };
      }
      await this.loggingService.insertEgressLog(logEntry);
    } catch (e) {
      this.logger.log(`Error in executing transfer: ${e}`);
      throw new HttpException(
        `Error in executing transfer: ${e}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async handleProxyRequest(
    processId: string,
    authorization: string,
    path: string,
    request: RawBodyRequest<Request>,
    response: Response
  ) {
    const transfer = await this.getTransferById(processId);
    const dataset = await this.dataPlaneService.getDataset(transfer.datasetId);

    if (transfer.state !== TransferState.STARTED) {
      this.logger.warn(
        `Transfer process ${processId} is in ${transfer.state} state, accessing is not allowed`
      );
      throw new HttpException(
        `Transfer process ${processId} is in ${transfer.state} state, accessing is not allowed`,
        HttpStatus.FORBIDDEN
      );
    }
    if (authorization !== `Bearer ${transfer.secret}`) {
      this.logger.warn(
        `Incorrect authorization header ${authorization} vs ${`Bearer ${transfer.secret}`}`
      );
      throw new HttpException(
        `Incorrect authorization header`,
        HttpStatus.UNAUTHORIZED
      );
    }

    this.logger.log(`Request for data for ${processId}`);
    this.logger.log(`Request: ${request.method} ${request.path}`);

    try {
      const headers = request.headers;
      const backendConfig =
        await this.dataPlaneService.getBackendConfig(dataset);
      if (backendConfig.authorization) {
        headers["authorization"] = backendConfig.authorization;
      }
      const newUrl = `${backendConfig.backendUrl}/${path}`.replace(
        /([^:]\/)\/+/g,
        "$1"
      );
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
        backendConfig.authorization !== undefined
      );
      const logEntry: LogEntry = {
        date: new Date(),
        remoteParty: transfer.remoteParty,
        transferId: transfer.id,
        datasetId: transfer.datasetId,
        path: path,
        method: request.method,
        status: response.statusCode
      };
      if (this.config.logging.debug) {
        logEntry.debug = {
          request: {
            headers: headers,
            query: request.query,
            bodyLength: bodyLength
          },
          response: {
            headers: response.getHeaders()
          }
        };
      }
      await this.loggingService.insertIngressLog(logEntry);
    } catch (e) {
      this.logger.log(`Error in executing transfer: ${e}`);
      throw new HttpException(
        `Error in executing transfer: ${e}`,
        HttpStatus.INTERNAL_SERVER_ERROR
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
    removeAuth: boolean
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
        `Proxying request ${method} ${url} (${JSON.stringify(headers)})`
      );
      const proxyResponse = await axios({
        method: method,
        url: url,
        headers: headers,
        data: body,
        params: query,
        responseType: "stream",
        validateStatus: () => true
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
