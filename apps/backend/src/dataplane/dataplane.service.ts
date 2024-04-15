import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import axios, { AxiosInstance } from "axios";
import { RootConfig } from "../config";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { Request, Response } from "express";
import { IncomingHttpHeaders } from "http";
import {
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
import { DataPlaneError } from "../utils/errors/error";
import { DataPlaneStateDto, TransferDto } from "@libs/dtos";
import { AuthClientService } from "../auth/auth.client.service";

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
        const managementToken = crypto.randomBytes(32).toString("hex");
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

  async transferRequest(
    transferRequestMessage: TransferRequestMessageDto,
    role: "provider" | "consumer",
    processId: string,
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

  async transferStart(
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

  async transferComplete(
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

  async transferTerminate(
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

  async transferSuspend(
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
    request: Request,
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
      const newUrl = `${transfer.dataAddress["dspace:endpoint"]}/${version}/${path}`;
      const headers = request.headers;
      headers["authorization"] = transfer.dataAddress[
        "dspace:endpointProperties"
      ].find((p) => p["dspace:name"] === "Authorization")?.["dspace:value"];

      await this.proxy(
        request.method,
        newUrl,
        headers,
        request.body,
        request.query,
        response,
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
    request: Request,
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
      const newUrl = `${distribution.backend}/${version}/${path}`;
      this.logger.log(`Rewrite: ${newUrl}`);
      this.logger.log(`Headers: ${JSON.stringify(headers)}`);

      await this.proxy(
        request.method,
        newUrl,
        headers,
        request.body,
        request.query,
        response,
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
    body: any,
    query: qs.ParsedQs,
    response: Response,
  ) {
    delete headers["transfer-encoding"];
    delete headers["keep-alive"];
    delete headers["connection"];
    delete headers["accept-ranges"];
    delete headers["authorization"];
    delete headers["content-length"];
    delete headers["host"];
    try {
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
