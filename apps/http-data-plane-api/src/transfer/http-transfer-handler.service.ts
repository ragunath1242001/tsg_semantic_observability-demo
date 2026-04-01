import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  RawBodyRequest
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AppError } from "@tsg-dsp/common-api";
import {
  CatalogClientService,
  DataPlaneError,
  ITransferHandler,
  NegotiationClientService,
  retryWithBackoff,
  TransferClientService
} from "@tsg-dsp/common-data-plane-api";
import {
  AgreementDto,
  DataPlaneAddressDto,
  DataPlaneRequestResponseDto,
  DatasetDto,
  TransferCompletionMessageDto,
  TransferRequestMessageDto,
  TransferStartMessageDto,
  TransferState,
  TransferSuspensionMessageDto,
  TransferTerminationMessageDto
} from "@tsg-dsp/common-dsp";
import { TransferDto } from "@tsg-dsp/common-dtos";
import axios from "axios";
import crypto from "crypto";
import { Request, Response } from "express";
import { IncomingHttpHeaders } from "http";
import { PassThrough } from "stream";
import { Repository } from "typeorm";

import { RootConfig } from "../config.js";
import { DataPlaneService } from "../dataplane/dataplane.service.js";
import { LogEntry } from "../logging/logging.dto.js";
import { LoggingService } from "../logging/logging.service.js";
import { TransferDao } from "./transfer.dao.js";

@Injectable()
export class HTTPTransferHandler implements ITransferHandler {
  protected readonly logger = new Logger(this.constructor.name);
  constructor(
    private readonly config: RootConfig,
    private readonly loggingService: LoggingService,
    private readonly catalog: CatalogClientService,
    private readonly negotiation: NegotiationClientService,
    private readonly transfer: TransferClientService,
    private readonly dataPlaneService: DataPlaneService,
    @InjectRepository(TransferDao)
    readonly transferRepository: Repository<TransferDao>
  ) {}

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
    const agreement = await this.negotiation.getAgreement(
      transfer.request.agreementId
    );

    const dataset = await this.catalog.getDataset(
      agreement.target,
      transfer.remoteParty
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
            name: this.config.authorizationHeader,
            value: `Bearer ${secret}`
          }
        ]
      };
    }

    const transfer = await this.transferRepository.save(
      this.transferRepository.create({
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
          id: id,
          dataAddress: dataAddress
        }
      })
    );

    return transfer.response;
  }
  async handleTransferStart(
    transferStartMessage: TransferStartMessageDto,
    processId: string
  ): Promise<void> {
    const transfer = await this.getTransferById(processId);
    transfer.state = TransferState.STARTED;
    if (transfer.role === "consumer") {
      if (transferStartMessage.dataAddress === undefined) {
        throw new HttpException(
          `Expected dataAddress in TransferStartMessage`,
          HttpStatus.BAD_REQUEST
        );
      }
      transfer.dataAddress = transferStartMessage.dataAddress;
    }
    await this.transferRepository.save(transfer);
  }
  async handleTransferComplete(
    _transferCompletionMessage: TransferCompletionMessageDto,
    processId: string
  ): Promise<void> {
    const transfer = await this.getTransferById(processId);
    transfer.state = TransferState.COMPLETED;
    await this.transferRepository.save(transfer);
  }
  async handleTransferTerminate(
    _transferTerminationMessage: TransferTerminationMessageDto,
    processId: string
  ): Promise<void> {
    const transfer = await this.getTransferById(processId);
    transfer.state = TransferState.TERMINATED;
    await this.transferRepository.save(transfer);
  }
  async handleTransferSuspend(
    _transferSuspensionMessage: TransferSuspensionMessageDto,
    processId: string
  ): Promise<void> {
    const transfer = await this.getTransferById(processId);
    transfer.state = TransferState.SUSPENDED;
    await this.transferRepository.save(transfer);
  }

  async getStartedTransferWithBackoff(
    datasetId: string,
    maxRetries?: number,
    initialDelay?: number
  ): Promise<TransferDao> {
    return retryWithBackoff(
      () =>
        this.transferRepository.findOne({
          where: { datasetId: datasetId, state: TransferState.STARTED },
          order: { createdDate: "DESC" }
        }),
      `Failed to find transfer for dataset ${datasetId}`,
      maxRetries,
      initialDelay
    );
  }

  async determineTransferId(
    datasetId: string,
    audience: string,
    controlPlaneAddress?: string
  ): Promise<string> {
    let transfer = await this.transferRepository.findOne({
      where: { datasetId: datasetId, state: TransferState.STARTED },
      order: { createdDate: "DESC" }
    });
    if (!transfer) {
      this.logger.debug(
        `Did not find active transfer for dataset ${datasetId}, checking for negotiation.`
      );
      const negotiation = await this.negotiation.requestDefaultNegotiation(
        datasetId,
        audience,
        controlPlaneAddress,
        async () =>
          this.catalog.getDataset(datasetId, audience, controlPlaneAddress)
      );
      if (!negotiation.agreement) {
        throw new DataPlaneError(
          `No agreement found for negotiation ${negotiation.id} for dataset ${datasetId} with participant ${audience}`,
          HttpStatus.BAD_REQUEST
        );
      }
      await this.transfer.requestTransfer(
        negotiation.agreement["@id"],
        audience,
        controlPlaneAddress
      );
      transfer = await this.getStartedTransferWithBackoff(datasetId);
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
      const newUrl = `${transfer.dataAddress.endpoint}/${path}`.replace(
        /([^:]\/)\/+/g,
        "$1"
      );
      const headers = request.headers;
      transfer.dataAddress.endpointProperties?.forEach((p) => {
        headers[p.name.toLowerCase()] = p.value;
      });

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
        "client"
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
    path: string,
    request: RawBodyRequest<Request>,
    response: Response
  ) {
    const transfer = await this.getTransferById(processId);
    const dataset = await this.dataPlaneService.getDataset(transfer.datasetId);
    const authorization =
      request.headers[this.config.authorizationHeader.toLowerCase()];
    request.headers["X-DSP-Transfer-Id"] = transfer.id;
    request.headers["X-DSP-Remote-Party"] = transfer.remoteParty;
    request.headers["X-DSP-Agreement-Id"] = transfer.request.agreementId;

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
        `Incorrect ${this.config.authorizationHeader} header ${authorization} vs ${`Bearer ${transfer.secret}`}`
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
      this.logger.debug(`Rewrite: ${newUrl}`);
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
        backendConfig.authorization !== undefined &&
          this.config.authorizationHeader.toLowerCase() === "authorization",
        "server"
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
    body: Buffer | undefined,
    query: qs.ParsedQs,
    response: Response,
    removeAuth: boolean,
    type: "client" | "server"
  ) {
    delete headers["transfer-encoding"];
    delete headers["keep-alive"];
    delete headers["connection"];
    delete headers["accept-ranges"];
    delete headers["content-length"];
    delete headers["host"];
    delete headers["cookie"];
    if (removeAuth) {
      delete headers[this.config.authorizationHeader.toLowerCase()];
    }

    try {
      this.logger.log(`Proxying request ${method} ${url}`);
      this.logger.debug(`Request headers: ${JSON.stringify(headers)}`);

      const proxyResponse = await axios({
        method: method,
        url: url,
        headers: headers,
        data: body,
        params: query,
        responseType: "stream",
        validateStatus: () => true,
        timeout: 30000 // Add timeout for debugging
      });

      this.logger.log(`Proxy response: ${proxyResponse.status}`);
      this.logger.debug(
        `Response headers: ${JSON.stringify(proxyResponse.headers)}`
      );

      // Copy response headers
      Object.entries(proxyResponse.headers).forEach(([name, value]) => {
        if (value) {
          response.setHeader(name, value);
        }
      });

      response.status(proxyResponse.status);
      const logging =
        type === "server"
          ? this.config.logging.serverLogging
          : this.config.logging.clientLogging;
      if (
        logging === "always" ||
        (logging === "onClientError" && proxyResponse.status >= 400) ||
        (logging === "onServerError" && proxyResponse.status >= 500)
      ) {
        const debugStream = new PassThrough();
        let totalBytes = 0;
        const maxPreviewBytes = 1024; // First 1KB for preview
        let previewData = Buffer.alloc(0);

        debugStream.on("data", (chunk: Buffer) => {
          totalBytes += chunk.length;
          if (previewData.length < maxPreviewBytes) {
            const remainingSpace = maxPreviewBytes - previewData.length;
            const chunkToAdd = chunk.slice(0, remainingSpace);
            previewData = Buffer.concat([previewData, chunkToAdd]);
          }
        });

        debugStream.on("end", () => {
          this.logger.debug(`Proxy completed: ${totalBytes} bytes transferred`);
          if (previewData.length > 0) {
            this.logger.debug(
              `Response preview: ${previewData.toString("utf8")}${totalBytes > maxPreviewBytes ? "..." : ""}`
            );
          }
        });

        debugStream.on("error", (err) => {
          this.logger.error(`Stream error: ${err.message}`);
        });

        return proxyResponse.data.pipe(debugStream).pipe(response);
      } else {
        return proxyResponse.data.pipe(response);
      }
    } catch (e) {
      if (e instanceof Error) {
        this.logger.error(`Error stack: ${e.stack}`);
      }
      throw new AppError(
        `Error proxying call to ${url}: ${e}`,
        HttpStatus.BAD_GATEWAY,
        e
      ).andLog(this.logger);
    }
  }
}
