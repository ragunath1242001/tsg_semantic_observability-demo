import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import axios, { AxiosInstance } from "axios";
import { DataPlaneRequestResponseDto, DataPlaneCreation, DataPlaneDetailsDto, DataPlaneAddressDto } from "../model/data-planes/dataPlanes.dto";
import { Dataset, Distribution, DataService } from "../model/dsp/catalog/catalog";
import { DataAddress, TransferCompletionMessage, TransferRequestMessage, TransferStartMessage, TransferSuspensionMessage, TransferTerminationMessage } from "../model/dsp/transfer/messages";
import { TransferState } from "../model/dsp/transfer/messages.dto";
import { RootConfig } from "../config";
import crypto from "crypto";
import bcrypt from "bcrypt";

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

  private readonly transfers: Transfer[] = []

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
      await this.axiosDataPlane.post(
        `/${details.data.identifier}/catalog`,
        await new Dataset({
          id: "urn:uuid:08844168-b568-4eb6-b018-aaf6d9cf0cea",
          title: 'Test HTTP dataset',
          distribution: [
            new Distribution({
              id: "urn:uuid:06d7da99-68eb-4f9e-8cb6-b78666c46123",
              format: "dspace:HTTP",
              accessService: [
                new DataService({
                  id: "urn:uuid:0d5f0685-eb04-409a-8a77-ee4ed207f2f0",
                  endpointURL: this.config.controlPlane.controlEndpoint
                })
              ]
            })
          ]
        }).serialize(),
        {
          headers: {
            Authorization: this.config.controlPlane.authorization
          }
        }
      );
    }, 1000)
  }

  async checkAuthorization(authorization: string) {
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
        endpoint: `${this.config.server.publicAddress}/data/${id}`,
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
      // setTimeout(async () => {
      //   // await this.executePull(dataAddress);
      //   // await this.axiosManagement.post(`/transfer/${transfer.processId}/complete`);
      // }, 1000);
    }
  }

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  async executePull(processId: string): Promise<any> {
    const transfer = this.transfers.find(transfer => transfer.id === processId);
    if (transfer === undefined) {
      throw new HttpException(`Transfer ${processId} not found`, HttpStatus.NOT_FOUND);
    }
    if (transfer.dataAddress === undefined) {
      throw new HttpException(`Transfer ${processId} does not have a data address present`, HttpStatus.BAD_REQUEST);
    }

    try {
      this.logger.log(`Executing pull to ${transfer.dataAddress.endpoint} with Authorization ${transfer.dataAddress.endpointProperties.find(p => p.name === 'Authorization')?.value}`)
      const result = await axios.get(transfer.dataAddress.endpoint, {
        headers: {
          'Authorization': transfer.dataAddress.endpointProperties.find(p => p.name === 'Authorization')?.value
        }
      });
      this.logger.log(`Executing pull successful: ${JSON.stringify(result.data)}`);
      return result.data;
    } catch (e) {
      this.logger.log(`Error in executing pull: ${e}`);
      throw new HttpException(`Error in executing pull: ${e}`, HttpStatus.INTERNAL_SERVER_ERROR)
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

  async getData(processId: string, authorization: string): Promise<{id: string, result: string}> {
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
    await new Promise(f => setTimeout(f, 2000));
    return {
      result: 'Test Data',
      id: processId
    }
  }

}