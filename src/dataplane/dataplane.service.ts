import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import axios, { AxiosInstance } from "axios";
import { DataPlaneRequestResponseDto, DataPlaneCreation, DataPlaneDetailsDto, DataPlaneAddressDto } from "../model/data-planes/dataPlanes.dto";
import { Dataset, Distribution, DataService } from "../model/dsp/catalog/catalog";
import { DataAddress, TransferCompletionMessage, TransferRequestMessage, TransferStartMessage, TransferSuspensionMessage, TransferTerminationMessage } from "../model/dsp/transfer/messages";
import { TransferState } from "../model/dsp/transfer/messages.dto";
import { RootConfig } from "../config";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { Request, Response } from "express";
import { IncomingHttpHeaders } from "http";
import { Reference } from "../model/dsp/common";

interface Transfer {
  role: "provider" | "consumer";
  id: string;
  processId: string;
  secret?: string;
  state: TransferState;
  request: TransferRequestMessage;
  response: DataPlaneRequestResponseDto;
  dataAddress?: DataAddress;
}

@Injectable()
export class DataPlaneService {
  private readonly axiosDataPlane: AxiosInstance;
  private readonly axiosManagement: AxiosInstance;
  constructor(private readonly config: RootConfig) {
    this.init();
    this.axiosDataPlane = axios.create({
      headers: {
        Authorization: this.config.controlPlane.authorization
      },
      baseURL: this.config.controlPlane.dataPlaneEndpoint
    });
    this.axiosManagement = axios.create({
      headers: {
        Authorization: this.config.controlPlane.authorization
      },
      baseURL: this.config.controlPlane.managementEndpoint
    });
  }
  private readonly logger = new Logger(this.constructor.name);
  private readonly managementToken = crypto.randomBytes(32).toString("hex");

  public readonly transfers: Transfer[] = []

  async init() {
    setTimeout(async () => {
      const dataPlaneCreation: DataPlaneCreation = {
        dataplaneType: 'dspace:HTTP',
        endpointPrefix: `${this.config.server.publicAddress}/data`,
        callbackAddress: this.config.server.publicAddress,
        managementAddress: this.config.server.publicAddress,
        managementToken: this.managementToken,
        catalogSynchronization: "push",
        role: "both"
      }
      const details = await this.axiosDataPlane.post<DataPlaneDetailsDto>(`/init`, dataPlaneCreation);
      const accessService = new DataService({
        endpointURL: this.config.controlPlane.controlEndpoint,
      })
      const dataset = new Dataset({
        id: this.config.dataset.id,
        title: this.config.dataset.title,
        distribution: this.config.dataset.distributions.map(distributionConfig => {
          return new Distribution({
            id: distributionConfig.id,
            format: "dspace:HTTP",
            title: `Version ${distributionConfig.version}`,
            conformsTo: (distributionConfig.openApiSpec) ? new Reference(distributionConfig.openApiSpec) : undefined,
            accessService: [accessService]
          })
        })
      });
      await this.axiosDataPlane.post(
        `/${details.data.identifier}/catalog`,
        await dataset.serialize()
      );
    }, this.config.controlPlane.initializationDelay)
  }

  async checkManagementAuthorization(authorization: string) {
    if (authorization.startsWith('Basic ')) {
      const [username, password] = atob(authorization.slice(6)).split(':');
      const user = this.config.users.find(user => user.username === username);
      if (!user || !bcrypt.compareSync(password, user.password)) {
        throw new HttpException(`Wrong user credentials`, HttpStatus.UNAUTHORIZED);
      }
    } else if (authorization.startsWith('Bearer ')) {
      const token = authorization.slice(7);
      if (token !== this.managementToken) {
        throw new HttpException(`Wrong token`, HttpStatus.UNAUTHORIZED);
      }
    } else {
      throw new HttpException(`No authorization present`, HttpStatus.UNAUTHORIZED);
    }
  }

  async transferRequest(transferRequestMessage: TransferRequestMessage, role: "provider" | "consumer", processId: string): Promise<DataPlaneRequestResponseDto> {
    const id = crypto.randomUUID();
    let dataAddress: DataPlaneAddressDto | undefined;
    let secret: string | undefined;
    if (role === "provider") {
      secret = crypto.randomBytes(32).toString("hex");
      dataAddress = {
        endpoint: `${this.config.server.publicAddress}/proxy/${id}`,
        properties: [{
          name: 'Authorization',
          value: `Bearer ${secret}`
        }]
      }
    }
    const transfer: Transfer = {
      role: role,
      id: id,
      processId: processId,
      secret: secret,
      state: TransferState.REQUESTED,
      request: transferRequestMessage,
      response: {
        accepted: true,
        identifier: id,
        dataAddress: dataAddress
      }
    }
    this.transfers.push(transfer);
    return transfer.response;
  }

  async transferStart(transferStartMessage: TransferStartMessage, processId: string) {
    const transfer = this.transfers.find(transfer => transfer.id === processId);
    if (transfer === undefined) {
      throw new HttpException(`Transfer ${processId} not found`, HttpStatus.NOT_FOUND);
    }
    transfer.state = TransferState.STARTED;
    if (transfer.role === "consumer") {
      if (transferStartMessage.dataAddress === undefined) {
        throw new HttpException(`Expected dataAddress in TransferStartMessage`, HttpStatus.BAD_REQUEST);
      }
      transfer.dataAddress = transferStartMessage.dataAddress;
    }
  }

  async transferComplete(transferCompletionMessage: TransferCompletionMessage, processId: string) {
    const transfer = this.transfers.find(transfer => transfer.id === processId);
    if (transfer === undefined) {
      throw new HttpException(`Transfer ${processId} not found`, HttpStatus.NOT_FOUND);
    }
    transfer.state = TransferState.COMPLETED;
  }

  async transferTerminate(transferTerminationMessage: TransferTerminationMessage, processId: string) {
    const transfer = this.transfers.find(transfer => transfer.id === processId);
    if (transfer === undefined) {
      throw new HttpException(`Transfer ${processId} not found`, HttpStatus.NOT_FOUND);
    }
    transfer.state = TransferState.TERMINATED;
  }

  async transferSuspend(transferSuspensionMessage: TransferSuspensionMessage, processId: string) {
    const transfer = this.transfers.find(transfer => transfer.id === processId);
    if (transfer === undefined) {
      throw new HttpException(`Transfer ${processId} not found`, HttpStatus.NOT_FOUND);
    }
    transfer.state = TransferState.SUSPENDED;
  }

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  async executeProxyRequest(processId: string, version: string, path: string, request: Request, response: Response): Promise<any> {
    const transfer = this.transfers.find(transfer => transfer.id === processId);
    if (transfer === undefined) {
      throw new HttpException(`Transfer ${processId} not found`, HttpStatus.NOT_FOUND);
    }
    if (transfer.state !== TransferState.STARTED) {
      this.logger.warn(`Transfer process ${processId} is in ${transfer.state} state, accessing is not allowed`);
      throw new HttpException(`Transfer process ${processId} is in ${transfer.state} state, accessing is not allowed`, HttpStatus.FORBIDDEN);
    }
    if (transfer.dataAddress === undefined) {
      throw new HttpException(`Transfer ${processId} does not have a data address present`, HttpStatus.BAD_REQUEST);
    }

    try {
      const newUrl = `${transfer.dataAddress.endpoint}/${version}/${path}`;
      const headers = request.headers;
      headers['authorization'] = transfer.dataAddress.endpointProperties.find(p => p.name === 'Authorization')?.value

      await this.proxy(request.method, newUrl, headers, request.body, request.query, response);
    } catch (e) {
      this.logger.log(`Error in executing transfer: ${e}`);
      throw new HttpException(`Error in executing transfer: ${e}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async handleProxyRequest(processId: string, authorization: string, version: string, path: string, request: Request, response: Response) {
    const transfer = this.transfers.find(transfer => transfer.id === processId);
    if (transfer === undefined) {
      this.logger.warn(`Transfer ${processId} not found`);
      throw new HttpException(`Transfer ${processId} not found`, HttpStatus.NOT_FOUND);
    }
    if (transfer.state !== TransferState.STARTED) {
      this.logger.warn(`Transfer process ${processId} is in ${transfer.state} state, accessing is not allowed`);
      throw new HttpException(`Transfer process ${processId} is in ${transfer.state} state, accessing is not allowed`, HttpStatus.FORBIDDEN);
    }
    if (authorization !== `Bearer ${transfer.secret}`) {
      this.logger.warn(`Incorrect authorization header ${authorization} vs ${`Bearer ${transfer.secret}`}`)
      throw new HttpException(`Incorrect authorization header`, HttpStatus.UNAUTHORIZED);
    }

    this.logger.log(`Request for data for ${processId}`);
    this.logger.log(`Request: ${request.method} ${request.path}`);
    const distribution = this.config.dataset.distributions.find(distribution => distribution.version === version);
    if (distribution === undefined) {
      this.logger.warn(`No distribution for version ${version} found`)
      throw new HttpException(`No distribution for version ${version} found`, HttpStatus.NOT_FOUND);
    }
    try {
      const headers = request.headers
      if (distribution.authorization) {
        headers["authorization"] = distribution.authorization;
      }
      const newUrl = `${distribution.backend}/${version}/${path}`;
      this.logger.log(`Rewrite: ${newUrl}`);
      this.logger.log(`Headers: ${JSON.stringify(headers)}`);

      await this.proxy(request.method, newUrl, headers, request.body, request.query, response);
    } catch (e) {
      this.logger.log(`Error in executing transfer: ${e}`);
      throw new HttpException(`Error in executing transfer: ${e}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  private async proxy(method: string, url: string, headers: IncomingHttpHeaders, body: any, query: qs.ParsedQs, response: Response) {
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
        responseType: 'stream',
        validateStatus: () => true
      });
      Object.entries(proxyResponse.headers).forEach(([name, value]) => {
        if (value) {
          response.setHeader(name, value)
        }
      })
      response.status(proxyResponse.status);
      proxyResponse.data.pipe(response);
    } catch (e) {
      console.log(e);
      return;
    }

  }

}
