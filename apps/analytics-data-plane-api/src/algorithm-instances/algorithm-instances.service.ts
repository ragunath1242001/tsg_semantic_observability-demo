import {
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  Optional
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import {
  AlgorithmInstanceDto,
  AlgorithmParticipant,
  BridgeAlgorithmInstanceMetadataDto,
  CreateAlgorithmInstanceDto,
  type OrchestrationStatus,
  OrchestrationStatusDto,
  OrchestrationStatusSignalDto,
  ProjectAgreementSummaryDto
} from "@tsg-dsp/analytics-data-plane-dtos";
import { parseNetworkError } from "@tsg-dsp/common-api";
import {
  CatalogClientService,
  DataPlaneError,
  ITransferHandler
} from "@tsg-dsp/common-data-plane-api";
import { OfferDto, TransferState } from "@tsg-dsp/common-dsp";
import axios, { AxiosResponse } from "axios";
import { plainToInstance } from "class-transformer";
import { randomBytes } from "crypto";
import { IsNull, LessThan, Not, Repository } from "typeorm";

import { BridgeWsClientService } from "../bridge/client/bridge-ws-client.service.js";
import { SplitModeService } from "../bridge/split-mode/split-mode.service.js";
import { RootConfig } from "../config.js";
import { AnalyticsTransferHandler } from "../dataplane/analytics-transfer-handler.service.js";
import { TransferDao } from "../dataplane/transfer.dao.js";
import {
  emitInternalEvent,
  INTERNAL_EVENTS
} from "../internal-events/internal-events.js";
import { ProjectAgreementDao } from "../project-agreements/project-agreement.dao.js";
import { ProjectAgreementsService } from "../project-agreements/project-agreements.service.js";
import { getAxiosConfigFromDataAddress } from "../utils/axios.js";
import { runDeferred } from "../utils/deferred.js";
import { promiseAllOrThrow } from "../utils/promises.js";
import { parseToken } from "../utils/token.js";
import { AlgorithmInstanceDao } from "./algorithm-instance.dao.js";

@Injectable()
export class AlgorithmInstancesService {
  private readonly logger = new Logger(this.constructor.name);

  // Mapping from access token to algorithm instances id
  private readonly accessTokens = new Map<string, string>();

  constructor(
    @InjectRepository(AlgorithmInstanceDao)
    private readonly algorithmInstanceRepository: Repository<AlgorithmInstanceDao>,
    private eventEmitter: EventEmitter2,
    private readonly catalog: CatalogClientService,
    private readonly config: RootConfig,
    private readonly splitMode: SplitModeService,
    @Optional()
    private readonly bridgeWs?: BridgeWsClientService,
    @Optional()
    private readonly projectAgreementsService?: ProjectAgreementsService,
    @Optional()
    @Inject(ITransferHandler)
    private readonly transferHandler?: AnalyticsTransferHandler
  ) {}

  async getAlgorithmInstances(): Promise<AlgorithmInstanceDto[]> {
    const result = await this.algorithmInstanceRepository.find({
      relations: ["transfers"]
    });
    return result.map((instance) => this.mapToDto(instance));
  }

  async upsertAlgorithmInstancesFromBridge(
    algorithmInstances: BridgeAlgorithmInstanceMetadataDto[]
  ): Promise<void> {
    const mapped = await Promise.all(
      algorithmInstances.map(async (instance) => {
        const projectAgreementId = instance.projectAgreement?.id;
        const projectAgreement =
          projectAgreementId && this.projectAgreementsService
            ? await this.projectAgreementsService
                .findById(projectAgreementId)
                .catch(() => undefined)
            : undefined;

        return {
          id: instance.id,
          algorithmDefinition: instance.algorithmDefinition,
          participants: instance.participants,
          createdDate: instance.createdDate,
          status: instance.status,
          startedAt: instance.startedAt,
          finishedAt: instance.finishedAt,
          projectAgreement,
          orchestrationStatus: instance.orchestrationStatus,
          isInitiator: instance.isInitiator,
          participantStatuses: instance.participantStatuses
        } as AlgorithmInstanceDao;
      })
    );

    await this.algorithmInstanceRepository.save(mapped);
  }

  async handleAlgorithmInstancesFromBridge(
    algorithmInstances: BridgeAlgorithmInstanceMetadataDto[]
  ): Promise<void> {
    await this.upsertAlgorithmInstancesFromBridge(algorithmInstances);
  }

  async deleteAlgorithmInstanceFromBridge(
    algorithmInstanceId: string
  ): Promise<void> {
    // Clean up local orchestration resources (K8s jobs / Docker containers)
    emitInternalEvent(this.eventEmitter, INTERNAL_EVENTS.JOB_DELETE, {
      algorithmInstanceId
    });

    // Revoke in-memory access tokens
    this.revokeAccessTokens(algorithmInstanceId);

    // Soft-delete the local copy if it exists
    await this.algorithmInstanceRepository.softDelete(algorithmInstanceId);

    this.logger.log(
      `Algorithm instance ${algorithmInstanceId} deleted via bridge`
    );
  }

  async getAlgorithmInstance(id: string): Promise<AlgorithmInstanceDao> {
    const algorithmInstance = await this.algorithmInstanceRepository.findOne({
      where: { id },
      relations: ["transfers"]
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
    dto.algorithmEvents = dto.algorithmEvents ?? [];
    dto.internalEvents = dto.internalEvents ?? [];
    if (instance.projectAgreement) {
      dto.projectAgreement = this.mapProjectAgreementToSummary(
        instance.projectAgreement
      );
    }
    return dto;
  }

  private mapToBridgeMetadata(
    instance: AlgorithmInstanceDao
  ): BridgeAlgorithmInstanceMetadataDto {
    const dto = this.mapToDto(instance);
    return {
      id: dto.id,
      algorithmDefinition: dto.algorithmDefinition,
      participants: dto.participants,
      createdDate: dto.createdDate,
      status: dto.status,
      startedAt: dto.startedAt,
      finishedAt: dto.finishedAt,
      projectAgreement: dto.projectAgreement,
      orchestrationStatus: dto.orchestrationStatus,
      isInitiator: dto.isInitiator,
      participantStatuses: dto.participantStatuses
    };
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
      relations: ["transfers"]
    });

    if (!algorithmInstance) {
      throw new DataPlaneError(
        `AlgorithmInstance for transferId ${transferId} not found`,
        HttpStatus.NOT_FOUND
      );
    }

    return this.mapToDto(algorithmInstance);
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
      relations: ["transfers"]
    });

    if (!algorithmInstance) {
      throw new DataPlaneError(
        `AlgorithmInstance with id ${algorithmInstanceId} not found or not accessible with provided token`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger);
    }

    return algorithmInstance;
  }

  async removeAlgorithmInstance(
    id: string,
    hardDelete: boolean = false
  ): Promise<void> {
    const algorithmInstance = await this.algorithmInstanceRepository.findOne({
      where: { id }
    });

    if (!algorithmInstance) {
      throw new DataPlaneError(
        `AlgorithmInstance with id ${id} not found`,
        HttpStatus.NOT_FOUND
      );
    }

    // Block deletion of active instances
    const activeStatuses = ["pending", "running"];
    if (activeStatuses.includes(algorithmInstance.status)) {
      throw new DataPlaneError(
        `Cannot delete algorithm instance with status '${algorithmInstance.status}'. Stop or cancel it first.`,
        HttpStatus.BAD_REQUEST
      );
    }

    // Delete associated orchestration resources (K8s jobs, Docker containers)
    emitInternalEvent(this.eventEmitter, INTERNAL_EVENTS.JOB_DELETE, {
      algorithmInstanceId: id
    });

    // Revoke in-memory access tokens for the instance
    this.revokeAccessTokens(id);

    // Delete the algorithm instance
    const result = hardDelete
      ? await this.algorithmInstanceRepository.delete(id)
      : await this.algorithmInstanceRepository.softDelete(id);

    if (result.affected === 0) {
      throw new DataPlaneError(
        `AlgorithmInstance with id ${id} could not be deleted`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    // Notify about the deletion
    emitInternalEvent(
      this.eventEmitter,
      INTERNAL_EVENTS.ALGORITHM_INSTANCES_DELETED,
      { algorithmInstanceId: id }
    );

    this.logger.log(
      `Algorithm instance ${id} ${hardDelete ? "hard-deleted" : "soft-deleted"}`
    );
  }

  /**
   * Hard-delete algorithm instances that were soft-deleted more than
   * `olderThanDays` days ago. Related events and transfers are cleaned
   * up via database cascade rules (CASCADE for events, SET NULL for transfers).
   */
  async pruneAlgorithmInstances(
    olderThanDays: number = 0
  ): Promise<{ pruned: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const softDeletedInstances = await this.algorithmInstanceRepository.find({
      withDeleted: true,
      where: {
        deletedDate: Not(IsNull()) as unknown as Date,
        ...(olderThanDays > 0
          ? { deletedDate: LessThan(cutoffDate) as unknown as Date }
          : {})
      }
    });

    if (softDeletedInstances.length === 0) {
      return { pruned: 0 };
    }

    for (const instance of softDeletedInstances) {
      this.revokeAccessTokens(instance.id);
      await this.algorithmInstanceRepository.remove(instance);
    }

    this.logger.log(
      `Pruned ${softDeletedInstances.length} soft-deleted algorithm instances`
    );

    return { pruned: softDeletedInstances.length };
  }

  /**
   * Daily cron job to prune algorithm instances that were soft-deleted
   * more than 14 days ago.
   */
  @Cron("0 3 * * *")
  async handlePruneCron(): Promise<void> {
    this.logger.log(
      "Running scheduled prune of soft-deleted algorithm instances"
    );
    try {
      const result = await this.pruneAlgorithmInstances(14);
      if (result.pruned > 0) {
        this.logger.log(
          `Scheduled prune completed: ${result.pruned} instances removed`
        );
      }
    } catch (error) {
      this.logger.error(
        `Scheduled prune failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined
      );
    }
  }

  async updateStatus(
    algorithmInstanceId: string,
    status: string,
    options?: { observedAt?: Date; jobName?: string }
  ): Promise<AlgorithmInstanceDto> {
    const algorithmInstance =
      await this.getAlgorithmInstance(algorithmInstanceId);

    const terminalStatuses = ["completed", "failed", "terminated", "cancelled"];
    if (terminalStatuses.includes(algorithmInstance.status)) {
      this.logger.debug(
        `Ignoring status update '${status}' for instance ${algorithmInstanceId}: already in terminal state '${algorithmInstance.status}'`
      );
      return this.mapToDto(algorithmInstance);
    }

    algorithmInstance.status = status;

    const observedAt = options?.observedAt;
    if (status === "running" && !algorithmInstance.startedAt) {
      algorithmInstance.startedAt = observedAt ?? new Date();
    }
    if (
      ["completed", "failed", "terminated", "cancelled"].includes(status) &&
      !algorithmInstance.finishedAt
    ) {
      algorithmInstance.finishedAt = observedAt ?? new Date();
    }

    const updatedInstance =
      await this.algorithmInstanceRepository.save(algorithmInstance);

    if (terminalStatuses.includes(status)) {
      this.revokeAccessTokens(algorithmInstanceId);
    }

    this.notifyStatusChange(updatedInstance, options);

    if (status === "completed" || status === "failed") {
      runDeferred(
        () => this.propagateJobResult(updatedInstance, status),
        this.logger
      );
    }

    return this.mapToDto(updatedInstance);
  }

  private async propagateJobResult(
    instance: AlgorithmInstanceDao,
    status: "completed" | "failed"
  ): Promise<void> {
    if (this.splitMode.shouldBridgeJobStatusToServer) {
      return;
    }

    if (!instance.isInitiator) {
      try {
        const transfers = instance.transfers ?? [];
        if (transfers.length === 0) {
          this.logger.warn(
            `No transfers found for instance ${instance.id}; cannot signal job result`
          );
          return;
        }
        await Promise.all(
          transfers.map(async (transfer) => {
            if (!this.transferHandler) {
              this.logger.warn(
                `Transfer handler not available; cannot signal job result for instance ${instance.id}`
              );
              return;
            }
            if (status === "completed") {
              await this.transferHandler.requestTransferCompletion(transfer);
            } else {
              await this.transferHandler.requestTransferTermination(
                transfer,
                "JOB_FAILED",
                `Job failed for algorithm instance ${instance.id}`
              );
            }
            this.logger.log(
              `Signaled job result '${status}' via transfer ${status === "completed" ? "completion" : "termination"} for instance ${instance.id}`
            );
          })
        );
      } catch (error) {
        this.logger.warn(
          `Failed to signal job result via transfer lifecycle: ${String(error)}`
        );
      }
    } else {
      await this.recordOwnJobResult(instance.id, status).catch((err) =>
        this.logger.warn(`Failed to record own job result: ${String(err)}`)
      );
    }
  }

  private notifyStatusChange(
    instance: AlgorithmInstanceDao,
    options?: { observedAt?: Date; jobName?: string }
  ): void {
    if (this.splitMode.shouldBridgeJobStatusToServer) {
      this.bridgeWs?.emit("client.job.status", {
        algorithmInstanceId: instance.id,
        status: instance.status,
        jobName: options?.jobName,
        observedAt: options?.observedAt ?? new Date()
      });
    } else {
      emitInternalEvent(
        this.eventEmitter,
        INTERNAL_EVENTS.ALGORITHM_INSTANCES_UPDATED,
        {
          algorithmInstance: this.mapToBridgeMetadata(instance)
        }
      );
    }
  }

  private registerTransferListeners(
    algorithmInstanceId: string,
    transfers: TransferDao[]
  ): void {
    if (!this.transferHandler) return;

    for (const transfer of transfers) {
      this.transferHandler.addListener(
        transfer.id,
        TransferState.COMPLETED,
        (completedTransfer) => {
          this.handleTransferStateChange(
            algorithmInstanceId,
            completedTransfer.remoteParty,
            "completed"
          );
        }
      );

      this.transferHandler.addListener(
        transfer.id,
        TransferState.TERMINATED,
        (terminatedTransfer) => {
          this.handleTransferStateChange(
            algorithmInstanceId,
            terminatedTransfer.remoteParty,
            "failed"
          );
        }
      );
    }
  }

  private async handleTransferStateChange(
    algorithmInstanceId: string,
    participantId: string,
    status: "completed" | "failed"
  ): Promise<void> {
    try {
      this.logger.log(
        `Transfer ${status === "completed" ? "completion" : "termination"} observed for participant ${participantId} on instance ${algorithmInstanceId}`
      );
      const instance = await this.getAlgorithmInstance(algorithmInstanceId);

      const statuses = instance.participantStatuses ?? {};
      statuses[participantId] = status;
      instance.participantStatuses = statuses;
      await this.algorithmInstanceRepository.save(instance);

      await this.evaluateOrchestrationStatus(instance);
    } catch (error) {
      this.logger.warn(
        `Failed to handle transfer state change for participant ${participantId} on instance ${algorithmInstanceId}: ${String(error)}`
      );
    }
  }

  async recordOwnJobResult(
    algorithmInstanceId: string,
    status: "completed" | "failed"
  ): Promise<void> {
    const ownParticipantId = await this.catalog.getParticipantId();
    const instance = await this.getAlgorithmInstance(algorithmInstanceId);

    const statuses = instance.participantStatuses ?? {};
    statuses[ownParticipantId] = status;
    instance.participantStatuses = statuses;
    await this.algorithmInstanceRepository.save(instance);

    await this.evaluateOrchestrationStatus(instance);
  }

  private async evaluateOrchestrationStatus(
    instance: AlgorithmInstanceDao
  ): Promise<void> {
    const results = instance.participantStatuses;
    if (!results) return;

    const totalParticipants = instance.participants.length;
    const totalReported = Object.keys(results).length;

    const hasFailed = Object.values(results).some((s) => s === "failed");
    if (hasFailed) {
      await this.setOrchestrationStatus(instance, "error");
      return;
    }

    if (totalReported >= totalParticipants) {
      await this.setOrchestrationStatus(instance, "completed");
    }
  }

  private async setOrchestrationStatus(
    instance: AlgorithmInstanceDao,
    orchestrationStatus: OrchestrationStatus
  ): Promise<void> {
    this.logger.log(
      `Setting orchestration status '${orchestrationStatus}' for instance ${instance.id}`
    );

    instance.orchestrationStatus = orchestrationStatus;

    if (
      orchestrationStatus === "error" &&
      !["completed", "failed", "terminated", "cancelled"].includes(
        instance.status
      )
    ) {
      instance.status = "terminated";
      if (!instance.finishedAt) {
        instance.finishedAt = new Date();
      }
    }

    if (orchestrationStatus === "error") {
      const statuses = instance.participantStatuses ?? {};
      for (const participant of instance.participants) {
        if (!(participant.didId in statuses)) {
          statuses[participant.didId] = "terminated";
        }
      }
      instance.participantStatuses = statuses;
    }

    const updatedInstance =
      await this.algorithmInstanceRepository.save(instance);

    emitInternalEvent(
      this.eventEmitter,
      INTERNAL_EVENTS.ORCHESTRATION_STATUS_UPDATED,
      { algorithmInstance: this.mapToBridgeMetadata(updatedInstance) }
    );
    this.notifyStatusChange(updatedInstance);

    if (orchestrationStatus === "error") {
      emitInternalEvent(this.eventEmitter, INTERNAL_EVENTS.JOB_STOP, {
        algorithmInstanceId: updatedInstance.id
      });
    }

    await this.broadcastOrchestrationStatus(
      updatedInstance,
      orchestrationStatus
    );
  }

  async setOrchestrationStatusManually(
    algorithmInstanceId: string,
    orchestrationStatus: "completed" | "error"
  ): Promise<AlgorithmInstanceDto> {
    const instance = await this.getAlgorithmInstance(algorithmInstanceId);
    await this.setOrchestrationStatus(instance, orchestrationStatus);
    return this.mapToDto(instance);
  }

  private async broadcastOrchestrationStatus(
    instance: AlgorithmInstanceDao,
    orchestrationStatus: OrchestrationStatus
  ): Promise<void> {
    const transfers = instance.transfers ?? [];
    const outboundTransfers = transfers.filter((t) => t.dataAddress?.endpoint);

    await Promise.allSettled(
      outboundTransfers.map(async (transfer) => {
        try {
          await axios.post<void>(
            `${transfer.dataAddress!.endpoint}/algorithm-instances/${instance.id}/orchestration-status`,
            { orchestrationStatus } satisfies OrchestrationStatusSignalDto,
            getAxiosConfigFromDataAddress(transfer)
          );
        } catch (error) {
          this.logger.warn(
            `Failed to send orchestration status to ${transfer.dataAddress!.endpoint}: ${String(error)}`
          );
        }
      })
    );
  }

  async receiveOrchestrationStatusFromPeer(
    algorithmInstanceId: string,
    orchestrationStatus: OrchestrationStatus,
    authorizationHeader: string | undefined
  ): Promise<void> {
    const instance = await this.getAlgorithmInstanceForPeer(
      algorithmInstanceId,
      authorizationHeader
    );

    this.logger.log(
      `Received orchestration status '${orchestrationStatus}' for instance ${algorithmInstanceId}`
    );

    instance.orchestrationStatus = orchestrationStatus;

    if (
      orchestrationStatus === "error" &&
      !["completed", "failed", "terminated", "cancelled"].includes(
        instance.status
      )
    ) {
      instance.status = "terminated";
      if (!instance.finishedAt) {
        instance.finishedAt = new Date();
      }
    }

    const updatedInstance =
      await this.algorithmInstanceRepository.save(instance);

    emitInternalEvent(
      this.eventEmitter,
      INTERNAL_EVENTS.ORCHESTRATION_STATUS_UPDATED,
      { algorithmInstance: this.mapToBridgeMetadata(updatedInstance) }
    );
    this.notifyStatusChange(updatedInstance);

    if (orchestrationStatus === "error") {
      emitInternalEvent(this.eventEmitter, INTERNAL_EVENTS.JOB_STOP, {
        algorithmInstanceId: updatedInstance.id
      });
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

    this.splitMode.requireProjectAgreementsService(
      this.projectAgreementsService
    );

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
              `nl.tsg.adp.project:${encodeURIComponent(projectAgreement.initiator)}:${projectAgreement.hash}`
        )
      )
    );

    return offer as OfferDto | undefined;
  }

  async createAlgorithmInstance(
    createAlgorithmInstance: CreateAlgorithmInstanceDto
  ): Promise<AlgorithmInstanceDto> {
    this.splitMode.requireCanCreateAlgorithmInstances();

    const projectAgreement = await this.validateProjectAgreement(
      createAlgorithmInstance
    );

    const algorithmInstance = await this.algorithmInstanceRepository.save(
      this.algorithmInstanceRepository.create({
        ...createAlgorithmInstance,
        createdDate: new Date(),
        status: "pending",
        orchestrationStatus: "pending",
        isInitiator: true,
        startedAt: undefined,
        finishedAt: undefined,
        transfers: [],
        algorithmEvents: [],
        internalEvents: [],
        projectAgreement: projectAgreement
      })
    );

    emitInternalEvent(
      this.eventEmitter,
      INTERNAL_EVENTS.ALGORITHM_INSTANCES_CREATED,
      {
        algorithmInstance: this.mapToBridgeMetadata(algorithmInstance)
      }
    );

    runDeferred(
      () => this.distributeAlgorithmInstance(algorithmInstance),
      this.logger,
      async () => {
        await this.updateStatus(algorithmInstance.id, "failed").catch((err) =>
          this.logger.error(
            `Failed to mark instance ${algorithmInstance.id} as failed: ${String(err)}`
          )
        );
      }
    );

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
          transfers: [],
          isInitiator: false
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
    this.splitMode.requireTransferHandler(
      this.transferHandler,
      "Distributing algorithm instances"
    );
    const transfers =
      await this.createTransfersForParticipants(algorithmInstance);
    await this.sendStartSignalsToParticipants(transfers, algorithmInstance.id);

    this.registerTransferListeners(algorithmInstance.id, transfers);

    if (this.splitMode.shouldDelegateStartToClientRunner) {
      // Server mode delegates job execution to the client runner via the bridge.
      this.delegateStartToClientRunner(algorithmInstance.id);
      return;
    }

    await this.startAlgorithmInstance({
      algorithmInstanceId: algorithmInstance.id,
      isInitiator: true,
      authorizationHeader: undefined
    });
  }

  private delegateStartToClientRunner(algorithmInstanceId: string): void {
    emitInternalEvent(
      this.eventEmitter,
      INTERNAL_EVENTS.ALGORITHM_INSTANCES_START_REQUESTED,
      {
        algorithmInstanceId,
        requestedAt: new Date()
      }
    );
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
    this.splitMode.requireTransferHandler(
      this.transferHandler,
      "Initiating transfers for participants"
    );
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

    const transfer = await this.transferHandler!.requestTransferForParticipant(
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

  private revokeAccessTokens(algorithmInstanceId: string): void {
    for (const [token, id] of this.accessTokens) {
      if (id === algorithmInstanceId) {
        this.accessTokens.delete(token);
      }
    }
  }

  async receiveAlgorithmInstanceFromPeer({
    createAlgorithmInstance,
    authorizationHeader
  }: {
    createAlgorithmInstance: AlgorithmInstanceDto;
    authorizationHeader: string | undefined;
  }): Promise<OrchestrationStatusDto> {
    this.splitMode.requireTransferHandler(
      this.transferHandler,
      "Receiving algorithm instances from peers"
    );
    const token = parseToken(authorizationHeader);
    const transfer = await this.transferHandler!.getTransferBySecret(token);
    let projectAgreement: ProjectAgreementDao | undefined = undefined;
    if (createAlgorithmInstance.projectAgreement) {
      projectAgreement = await this.projectAgreementsService?.findByProjectId(
        createAlgorithmInstance.projectAgreement.projectId
      );
      if (!projectAgreement) {
        throw new DataPlaneError(
          `Project Agreement with project id ${createAlgorithmInstance.projectAgreement.projectId} not found`,
          HttpStatus.BAD_REQUEST
        ).andLog(this.logger);
      }
      createAlgorithmInstance.projectAgreement.id = projectAgreement.id;
    }

    await this.algorithmInstanceRepository.save(
      this.algorithmInstanceRepository.create({
        ...createAlgorithmInstance,
        projectAgreement: projectAgreement,
        transfers: [transfer]
      })
    );

    emitInternalEvent(
      this.eventEmitter,
      INTERNAL_EVENTS.ALGORITHM_INSTANCES_CREATED,
      {
        algorithmInstance: {
          id: createAlgorithmInstance.id,
          algorithmDefinition: createAlgorithmInstance.algorithmDefinition,
          participants: createAlgorithmInstance.participants,
          createdDate: createAlgorithmInstance.createdDate,
          status: createAlgorithmInstance.status,
          startedAt: createAlgorithmInstance.startedAt,
          finishedAt: createAlgorithmInstance.finishedAt,
          projectAgreement: createAlgorithmInstance.projectAgreement,
          orchestrationStatus: createAlgorithmInstance.orchestrationStatus,
          isInitiator: createAlgorithmInstance.isInitiator
        }
      }
    );

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
    const algorithmInstance = await this.resolveAlgorithmInstanceForStart(
      algorithmInstanceId,
      isInitiator,
      authorizationHeader
    );

    // In split server mode, delegate to client runner.
    if (this.splitMode.shouldDelegateStartToClientRunner) {
      this.delegateStartToClientRunner(algorithmInstance.id);
      return;
    }

    if (this.isAlreadyStarted(algorithmInstance)) {
      return;
    }

    const updatedInstance = await this.markInstanceAsRunning(algorithmInstance);
    this.notifyStatusChange(updatedInstance);
    await this.spawnJob(algorithmInstance);
  }

  private async resolveAlgorithmInstanceForStart(
    algorithmInstanceId: string,
    isInitiator: boolean,
    authorizationHeader: string | undefined
  ): Promise<AlgorithmInstanceDao> {
    return isInitiator
      ? await this.getAlgorithmInstance(algorithmInstanceId)
      : await this.getAlgorithmInstanceForPeer(
          algorithmInstanceId,
          authorizationHeader
        );
  }

  private isAlreadyStarted(algorithmInstance: AlgorithmInstanceDao): boolean {
    return !!(
      algorithmInstance.startedAt ||
      algorithmInstance.finishedAt ||
      algorithmInstance.status !== "pending"
    );
  }

  private async markInstanceAsRunning(
    algorithmInstance: AlgorithmInstanceDao
  ): Promise<AlgorithmInstanceDao> {
    return await this.algorithmInstanceRepository.save(
      this.algorithmInstanceRepository.create({
        ...algorithmInstance,
        startedAt: new Date(),
        status: "running",
        orchestrationStatus:
          algorithmInstance.orchestrationStatus === "pending" ||
          !algorithmInstance.orchestrationStatus
            ? "running"
            : algorithmInstance.orchestrationStatus
      })
    );
  }

  private async spawnJob(
    algorithmInstance: AlgorithmInstanceDao
  ): Promise<void> {
    const ownParticipantId = await this.catalog.getParticipantId();
    const participant = algorithmInstance.participants.find(
      (p) => p.didId === ownParticipantId
    );

    emitInternalEvent(this.eventEmitter, INTERNAL_EVENTS.JOB_SPAWN, {
      algorithmInstanceId: algorithmInstance.id,
      participantId: ownParticipantId,
      imageName: algorithmInstance.algorithmDefinition.image,
      command: undefined,
      datasetId: participant?.dataset
    });
  }
}
