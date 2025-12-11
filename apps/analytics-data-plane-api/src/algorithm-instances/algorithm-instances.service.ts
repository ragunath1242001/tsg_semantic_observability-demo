import { HttpStatus, Inject, Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectRepository } from "@nestjs/typeorm";
import {
  AlgorithmInstanceDto,
  AlgorithmParticipant,
  CreateAlgorithmInstanceDto,
  OrchestrationStatusDto,
  ProjectAgreementSummaryDto
} from "@tsg-dsp/analytics-data-plane-dtos";
import { parseNetworkError } from "@tsg-dsp/common-api";
import {
  CatalogClientService,
  ITransferHandler
} from "@tsg-dsp/common-data-plane-api";
import { OfferDto } from "@tsg-dsp/common-dsp";
import axios, { AxiosResponse } from "axios";
import { plainToInstance } from "class-transformer";
import { randomBytes } from "crypto";
import { Repository } from "typeorm";

import { RootConfig } from "../config.js";
import { AnalyticsTransferHandler } from "../dataplane/analytics-transfer-handler.service.js";
import { TransferDao } from "../dataplane/transfer.dao.js";
import { ProjectAgreementDao } from "../project-agreements/project-agreement.dao.js";
import { ProjectAgreementsService } from "../project-agreements/project-agreements.service.js";
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
    private readonly projectAgreementsService: ProjectAgreementsService,
    private eventEmitter: EventEmitter2,
    private readonly catalog: CatalogClientService,
    @Inject(ITransferHandler)
    private readonly transferHandler: AnalyticsTransferHandler,
    private readonly config: RootConfig
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  // Mapping from access token to algorithm instances id
  private readonly accessTokens = new Map<string, string>();

  async getAlgorithmInstances(): Promise<AlgorithmInstanceDto[]> {
    const result = await this.algorithmInstanceRepository.find({
      relations: ["transfers", "algorithmEvents", "internalEvents"]
    });
    return result.map((instance) => this.mapToDto(instance));
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
    return this.mapToDto(algorithmInstance);
  }

  private mapToDto(instance: AlgorithmInstanceDao): AlgorithmInstanceDto {
    const dto = plainToInstance(AlgorithmInstanceDto, instance);
    if (instance.projectAgreement) {
      dto.projectAgreement = this.mapProjectAgreementToSummary(
        instance.projectAgreement
      );
    }
    return dto;
  }

  private mapProjectAgreementToSummary(
    projectAgreement: ProjectAgreementDao
  ): ProjectAgreementSummaryDto {
    return {
      id: projectAgreement.id,
      projectId: projectAgreement.projectId,
      hash: projectAgreement.hash,
      title: projectAgreement.projectAgreement.title,
      status: projectAgreement.status
    };
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

    return this.mapToDto(algorithmInstance);
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

  async updateStatus(
    algorithmInstanceId: string,
    status: string
  ): Promise<AlgorithmInstanceDto> {
    const algorithmInstance =
      await this.getAlgorithmInstance(algorithmInstanceId);
    algorithmInstance.status = status;
    const updatedInstance =
      await this.algorithmInstanceRepository.save(algorithmInstance);
    return this.mapToDto(updatedInstance);
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

  private async validateProjectAgreement(
    createAlgorithmInstance: CreateAlgorithmInstanceDto
  ): Promise<ProjectAgreementDao | undefined> {
    if (
      this.config.runtime?.requireProjectAgreement &&
      !createAlgorithmInstance.projectAgreementId
    ) {
      throw new DataPlaneError(
        "A project agreement is required to create an algorithm instance",
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }

    if (!createAlgorithmInstance.projectAgreementId) {
      return undefined;
    }

    const projectAgreement = await this.projectAgreementsService.findById(
      createAlgorithmInstance.projectAgreementId
    );

    if (projectAgreement.status !== "FINALIZED") {
      throw new DataPlaneError(
        `Project Agreement with id ${projectAgreement.id} is not finalized. Current status: ${projectAgreement.status}`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }

    const projectAgreementParticipantIds =
      projectAgreement.projectAgreement.participants.map((p) => p.didId);
    const algorithmInstanceParticipantIds =
      createAlgorithmInstance.participants.map((p) => p.didId);

    const invalidParticipants = algorithmInstanceParticipantIds.filter(
      (participantId) => !projectAgreementParticipantIds.includes(participantId)
    );

    if (invalidParticipants.length > 0) {
      throw new DataPlaneError(
        `The following algorithm instance participants are not part of the project agreement: ${invalidParticipants.join(", ")}. ` +
          `Project agreement participants: ${projectAgreementParticipantIds.join(", ")}`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }

    return projectAgreement;
  }

  async getProjectAgreementOffer(
    projectAgreement: ProjectAgreementDao,
    participant: AlgorithmParticipant
  ): Promise<OfferDto | undefined> {
    const dataset = await this.catalog.getDataset(
      participant.dataset,
      participant.didId
    );

    if (!dataset) {
      return undefined;
    }

    const offer = dataset.hasPolicy?.find((policy) =>
      policy.permission?.some((permission) =>
        permission.constraint?.some(
          (constraint) =>
            constraint.leftOperand === "tsg:presentationScope" &&
            constraint.rightOperand ===
              `nl.tsg.adp.project:${encodeURIComponent(projectAgreement.initiator)}:${projectAgreement.hash}}`
        )
      )
    );

    return offer as OfferDto | undefined;
  }

  async createAlgorithmInstance(
    createAlgorithmInstance: CreateAlgorithmInstanceDto
  ): Promise<AlgorithmInstanceDto> {
    const projectAgreement = await this.validateProjectAgreement(
      createAlgorithmInstance
    );

    const algorithmInstance = await this.algorithmInstanceRepository.save({
      ...createAlgorithmInstance,
      createdDate: new Date(),
      status: "pending",
      startedAt: undefined,
      finishedAt: undefined,
      transfers: [],
      algorithmEvents: [],
      internalEvents: [],
      projectAgreement: projectAgreement
    });

    setImmediate(() => {
      this.distributeAlgorithmInstance(algorithmInstance);
    }); // Use setImmediate to avoid blocking the event loop

    return this.mapToDto(algorithmInstance);
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

  async distributeAlgorithmInstance(algorithmInstance: AlgorithmInstanceDao) {
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
    algorithmInstance: AlgorithmInstanceDao
  ) {
    const ownParticipantId = await this.catalog.getParticipantId();
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
    algorithmInstance: AlgorithmInstanceDao
  ) {
    const orchestrationDataset = await this.catalog.getDatasetConformingTo(
      "tsg:analytics-orchestration",
      participant.didId
    );

    let offer;
    if (algorithmInstance.projectAgreement) {
      offer = await this.getProjectAgreementOffer(
        algorithmInstance.projectAgreement,
        participant
      );
      if (offer) {
        this.logger.log(
          `Using project agreement offer for participant ${participant.didId} with dataset ${participant.dataset}`
        );
      }
    }

    const transfer = await this.transferHandler.requestTransferForParticipant(
      participant,
      orchestrationDataset,
      algorithmInstance.id,
      true,
      offer
    );
    await this.linkTransfer({
      algorithmInstanceId: algorithmInstance.id,
      transfer
    });

    this.logger.log(
      `Transfer with id ${transfer.id} started for algorithm instance ${algorithmInstance.id} to participant ${participant.didId}.`
    );

    await this.sendCreateSignal(
      participant,
      transfer,
      this.mapToDto(algorithmInstance)
    );
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
    const transfer = await this.transferHandler.getTransferBySecret(token);

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
    const ownParticipantId = await this.catalog.getParticipantId();
    const participant = algorithmInstance.participants.find(
      (p) => p.didId === ownParticipantId
    );

    this.eventEmitter.emit("job.spawn", {
      algorithmInstanceId: algorithmInstance.id,
      participantId: await this.catalog.getParticipantId(),
      imageName: algorithmInstance.algorithmDefinition.image,
      command: undefined,
      datasetId: participant?.dataset
    });
  }
}
