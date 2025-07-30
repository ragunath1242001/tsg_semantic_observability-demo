import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectRepository } from "@nestjs/typeorm";
import {
  AlgorithmInstanceDto,
  AlgorithmParticipant,
  CreateAlgorithmInstanceDto,
  OrchestrationStatusDto
} from "@tsg-dsp/analytics-data-plane-dtos";
import { parseNetworkError } from "@tsg-dsp/common-api";
import axios, { AxiosResponse } from "axios";
import { plainToInstance } from "class-transformer";
import { randomBytes } from "crypto";
import { Repository } from "typeorm";

import { ManagementClient } from "../dataplane/management-client.service.js";
import { TransferDao } from "../dataplane/transfer.dao.js";
import { TransfersService } from "../dataplane/transfers.service.js";
import { getAxiosConfigFromDataAddress } from "../utils/axios.js";
import { DataPlaneError } from "../utils/errors/error.js";
import { promiseAllOrThrow } from "../utils/promises.js";
import { parseToken } from "../utils/token.js";
import { AlgorithmInstanceDao } from "./algorithm-instance.dao.js";

@Injectable()
export class AlgorithmInstancesService {
  constructor(
    @InjectRepository(AlgorithmInstanceDao)
    private readonly algorithmInstanceRepository: Repository<AlgorithmInstanceDao>,
    private eventEmitter: EventEmitter2,
    private readonly transfersService: TransfersService,
    private readonly managementClient: ManagementClient
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  // Mapping from access token to algorithm instances id
  private readonly accessTokens = new Map<string, string>();

  async getAlgorithmInstances(): Promise<AlgorithmInstanceDto[]> {
    const result = await this.algorithmInstanceRepository.find({
      relations: ["transfers", "algorithmEvents", "internalEvents"]
    });
    return plainToInstance(AlgorithmInstanceDto, result);
  }

  async getAlgorithmInstance(id: string): Promise<AlgorithmInstanceDao> {
    const algorithmInstance = await this.algorithmInstanceRepository.findOne({
      where: { id },
      relations: ["transfers", "algorithmEvents", "internalEvents"]
    });

    if (!algorithmInstance) {
      throw new DataPlaneError(
        `AlgorithmInstance with id ${id} not found`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger);
    }
    return algorithmInstance;
  }

  async getAlgorithmInstanceDto(id: string): Promise<AlgorithmInstanceDto> {
    const algorithmInstance = await this.getAlgorithmInstance(id);
    return plainToInstance(AlgorithmInstanceDto, algorithmInstance);
  }

  async getAlgorithmInstanceFromTransferId(transferId: string) {
    const algorithmInstance = await this.algorithmInstanceRepository.findOne({
      where: {
        transfers: { id: transferId }
      },
      relations: ["transfers", "algorithmEvents", "internalEvents"]
    });

    if (!algorithmInstance) {
      throw new DataPlaneError(
        `AlgorithmInstance for transferId ${transferId} not found`,
        404
      );
    }

    return plainToInstance(AlgorithmInstanceDto, algorithmInstance);
  }

  private async getAlgorithmInstanceForJob(
    algorithmInstanceId: string
  ): Promise<AlgorithmInstanceDao> {
    const algorithmInstance = await this.algorithmInstanceRepository.findOne({
      where: { id: algorithmInstanceId },
      relations: ["transfers", "algorithmEvents", "internalEvents"]
    });

    if (!algorithmInstance) {
      throw new DataPlaneError(
        `AlgorithmInstance with id ${algorithmInstanceId} not found`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger);
    }

    return algorithmInstance;
  }

  private async getAlgorithmInstanceForPeer(
    algorithmInstanceId: string,
    authorizationHeader: string | undefined
  ): Promise<AlgorithmInstanceDao> {
    const token = parseToken(authorizationHeader);
    const algorithmInstance = await this.algorithmInstanceRepository.findOne({
      where: {
        id: algorithmInstanceId,
        transfers: { secret: token }
      },
      relations: ["transfers", "algorithmEvents", "internalEvents"]
    });

    if (!algorithmInstance) {
      throw new DataPlaneError(
        `AlgorithmInstance with id ${algorithmInstanceId} not found or not accessible with provided token ${token}`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger);
    }

    return algorithmInstance;
  }

  async removeAlgorithmInstance(id: string): Promise<void> {
    const result = await this.algorithmInstanceRepository.delete(id);
    if (result.affected === 0) {
      throw new DataPlaneError(
        `AlgorithmInstance with id ${id} not found`,
        HttpStatus.NOT_FOUND
      );
    }
  }

  async linkTransfer({
    algorithmInstanceId,
    transfer
  }: {
    algorithmInstanceId: string;
    transfer: TransferDao;
  }): Promise<AlgorithmInstanceDao> {
    const algorithmInstance =
      await this.getAlgorithmInstance(algorithmInstanceId);

    if (
      transfer.algorithmInstance &&
      transfer.algorithmInstance.id !== algorithmInstanceId
    ) {
      throw new DataPlaneError(
        `Transfer with id ${transfer.id} already linked to algorithmInstance ${transfer.algorithmInstance.id}`,
        HttpStatus.BAD_REQUEST
      );
    }
    if (!algorithmInstance.transfers) {
      algorithmInstance.transfers = [];
    }
    algorithmInstance.transfers.push(transfer);
    return await this.algorithmInstanceRepository.save(algorithmInstance);
  }

  async createAlgorithmInstance(
    createAlgorithmInstance: CreateAlgorithmInstanceDto
  ): Promise<AlgorithmInstanceDto> {
    const algorithmInstance = await this.algorithmInstanceRepository.save({
      ...createAlgorithmInstance,
      createdDate: new Date(),
      status: "pending",
      startedAt: undefined,
      finishedAt: undefined,
      transfers: [],
      algorithmEvents: [],
      internalEvents: []
    });

    setImmediate(() => {
      this.distributeAlgorithmInstance(algorithmInstance);
    }); // Use setImmediate to avoid blocking the event loop

    return plainToInstance(AlgorithmInstanceDto, algorithmInstance);
  }

  private async sendCreateSignal(
    participant: AlgorithmParticipant,
    transfer: TransferDao,
    algorithmInstance: AlgorithmInstanceDto
  ) {
    if (!transfer.dataAddress) {
      throw new DataPlaneError(
        `Transfer with id ${transfer.id} does not have a data address`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }
    try {
      this.logger.log(
        `Sending algorithm instance to participant ${participant.didId} at address ${transfer.dataAddress.endpoint}`
      );
      const response = await axios.post<
        OrchestrationStatusDto,
        AxiosResponse<OrchestrationStatusDto>,
        AlgorithmInstanceDto
      >(
        `${transfer.dataAddress.endpoint}/algorithm-instances/create`,
        {
          ...algorithmInstance,
          transfers: []
        },
        getAxiosConfigFromDataAddress(transfer)
      );
      if (response.data.status !== "accepted") {
        throw new DataPlaneError(
          `Failed to send algorithm instance to participant ${participant.didId}: ${response.data.status}`,
          HttpStatus.BAD_REQUEST
        ).andLog(this.logger);
      }
      this.logger.log(
        `Algorithm instance sent to participant ${participant.didId} successfully`
      );
    } catch (error) {
      throw parseNetworkError(
        error,
        `sending algorithm instance to participant ${participant.didId}`
      ).andLog(this.logger);
    }
  }

  private async sendStartSignal(
    transfer: TransferDao,
    algorithmInstanceId: string
  ) {
    try {
      await axios.post(
        `${transfer.dataAddress?.endpoint}/algorithm-instances/${algorithmInstanceId}/start`,
        undefined,
        getAxiosConfigFromDataAddress(transfer)
      );
    } catch (error) {
      throw parseNetworkError(
        error,
        `Error starting algorithm instance ${transfer.id} for algorithm instance ${algorithmInstanceId}`
      );
    }
  }

  async distributeAlgorithmInstance(algorithmInstance: AlgorithmInstanceDto) {
    const transfers =
      await this.createTransfersForParticipants(algorithmInstance);
    await this.sendStartSignalsToParticipants(transfers, algorithmInstance.id);
    await this.startAlgorithmInstance({
      algorithmInstanceId: algorithmInstance.id,
      isInitiator: true,
      authorizationHeader: undefined
    });
  }

  private async createTransfersForParticipants(
    algorithmInstance: AlgorithmInstanceDto
  ) {
    const ownParticipantId = await this.managementClient.getOwnParticipantId();
    const externalParticipants = algorithmInstance.participants.filter(
      (participant) => participant.didId !== ownParticipantId
    );

    return await promiseAllOrThrow(
      externalParticipants,
      async (participant) =>
        this.initiateTransfer(participant, algorithmInstance),
      this.logger
    );
  }

  private async initiateTransfer(
    participant: AlgorithmParticipant,
    algorithmInstance: AlgorithmInstanceDto
  ) {
    const orchestrationDataset =
      await this.managementClient.fetchDatasetForParticipant(participant, true);
    const transfer = await this.transfersService.requestTransferForParticipant(
      participant,
      orchestrationDataset,
      algorithmInstance.id,
      true
    );
    await this.linkTransfer({
      algorithmInstanceId: algorithmInstance.id,
      transfer
    });

    this.logger.log(
      `Transfer with id ${transfer.id} started for algorithm instance ${algorithmInstance.id} to participant ${participant.didId}.`
    );

    await this.sendCreateSignal(participant, transfer, algorithmInstance);
    return transfer;
  }

  private async sendStartSignalsToParticipants(
    transfers: TransferDao[],
    algorithmInstanceId: string
  ) {
    await promiseAllOrThrow(
      transfers,
      (transfer) => this.sendStartSignal(transfer, algorithmInstanceId),
      this.logger
    );
  }

  async createAccessToken(algorithmInstanceId: string): Promise<string> {
    await this.getAlgorithmInstance(algorithmInstanceId);

    const accessToken = randomBytes(16).toString("hex");
    this.accessTokens.set(accessToken, algorithmInstanceId);

    return accessToken;
  }

  isValidJobAccessToken(token: string, algorithmInstanceId: string): boolean {
    return this.accessTokens.get(token) === algorithmInstanceId;
  }

  async validateAccessToken(
    algorithmInstanceId: string,
    token: string
  ): Promise<void> {
    if (!this.isValidJobAccessToken(token, algorithmInstanceId)) {
      throw new DataPlaneError(`Invalid token for algorithm instance`, 403);
    }
  }

  async receiveAlgorithmInstanceFromPeer({
    createAlgorithmInstance,
    authorizationHeader
  }: {
    createAlgorithmInstance: AlgorithmInstanceDto;
    authorizationHeader: string | undefined;
  }): Promise<OrchestrationStatusDto> {
    const token = parseToken(authorizationHeader);
    const transfer = await this.transfersService.getTransferBySecret(token);

    await this.algorithmInstanceRepository.save({
      ...createAlgorithmInstance,
      transfers: [transfer]
    });

    return { status: "accepted" };
  }

  async startAlgorithmInstance({
    algorithmInstanceId,
    isInitiator,
    authorizationHeader
  }: {
    algorithmInstanceId: string;
    isInitiator: boolean;
    authorizationHeader: string | undefined;
  }): Promise<void> {
    const algorithmInstance = isInitiator
      ? await this.getAlgorithmInstanceForJob(algorithmInstanceId)
      : await this.getAlgorithmInstanceForPeer(
          algorithmInstanceId,
          authorizationHeader
        );
    await this.algorithmInstanceRepository.save({
      ...algorithmInstance,
      startedAt: new Date(),
      status: "running"
    });
    this.eventEmitter.emit("job.spawn", {
      algorithmInstanceId: algorithmInstance.id,
      imageName: algorithmInstance.algorithmDefinition.image,
      command: undefined,
      fileId: undefined
    });
  }
}
