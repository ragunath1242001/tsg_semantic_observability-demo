import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AlgorithmParticipant } from "@tsg-dsp/analytics-data-plane-dtos";
import {
  CatalogClientService,
  DataPlaneError,
  ITransferHandler,
  NegotiationClientService,
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
import crypto from "crypto";
import { Repository } from "typeorm";

import { RootConfig } from "../config.js";
import { TransferDao } from "./transfer.dao.js";

@Injectable()
export class AnalyticsTransferHandler implements ITransferHandler {
  constructor(
    private readonly config: RootConfig,
    @InjectRepository(TransferDao)
    private readonly transferRepository: Repository<TransferDao>,
    private readonly catalog: CatalogClientService,
    private readonly negotiation: NegotiationClientService,
    private readonly transfer: TransferClientService
  ) {}
  private readonly logger = new Logger(this.constructor.name);
  private listeners: Map<
    string,
    { state: TransferState; listener: (transfer: TransferDao) => void }[]
  > = new Map();

  addListener(
    transferId: string,
    state: TransferState,
    listener: (transfer: TransferDao) => void
  ) {
    if (!this.listeners.has(transferId)) {
      this.listeners.set(transferId, []);
    }
    this.listeners.get(transferId)?.push({ state, listener });
  }

  private notifyListeners(transfer: TransferDao, state: TransferState) {
    const listeners = this.listeners.get(transfer.id);
    if (listeners) {
      listeners
        .filter((listener) => listener.state === state)
        .forEach((listener) => {
          listener.listener(transfer);
        });
      this.listeners.set(
        transfer.id,
        listeners.filter((listener) => listener.state !== state)
      );
    }
  }

  async getTransfers(): Promise<TransferDto[]> {
    return await this.transferRepository.find({
      relations: ["algorithmInstance"]
    });
  }

  async getTransferById(id: string) {
    const transfer = await this.transferRepository.findOne({
      where: { id: id },
      relations: ["algorithmInstance"]
    });
    if (!transfer) {
      throw new DataPlaneError(
        `Transfer by id ${id} not found`,
        HttpStatus.NOT_FOUND
      );
    }
    return transfer;
  }

  async getTransferByProcessId(processId: string) {
    const transfer = await this.transferRepository.findOne({
      where: { processId },
      relations: ["algorithmInstance"]
    });
    if (!transfer) {
      throw new DataPlaneError(
        `Transfer by processId ${processId} not found`,
        HttpStatus.NOT_FOUND
      );
    }
    return transfer;
  }

  async getTransferBySecret(secret: string) {
    const transfer = await this.transferRepository.findOne({
      where: { secret: secret },
      relations: ["algorithmInstance"]
    });
    if (!transfer) {
      throw new DataPlaneError(
        `Transfer with secret ${secret} not found`,
        HttpStatus.NOT_FOUND
      );
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

  async requestTransferForParticipant(
    participant: AlgorithmParticipant,
    dataset: DatasetDto,
    algorithmInstanceId: string,
    listenForStarted = false
  ) {
    const negotiation = await this.negotiation.requestDefaultNegotiation(
      dataset["@id"],
      participant.didId,
      undefined,
      async () => dataset
    );

    if (!negotiation.agreement) {
      throw new DataPlaneError(
        `No agreement found for negotiation ${negotiation.localId}`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }
    const transferDto = await this.transfer.requestTransfer(
      negotiation.agreement["@id"],
      participant.didId,
      undefined
    );

    this.logger.log(
      `Transfer requested for algorithm instance ${algorithmInstanceId} to participant ${participant.didId} with transfer ID ${transferDto.consumerPid}/${transferDto.providerPid}`
    );

    const transfer = await this.transferRepository.findOneOrFail({
      where: { processId: transferDto.consumerPid },
      relations: ["algorithmInstance"]
    });

    this.logger.log(
      `Transfer with id ${transfer.id} found for algorithm instance ${algorithmInstanceId} to participant ${participant.didId}`
    );
    if (listenForStarted) {
      return new Promise<TransferDao>((resolve) => {
        this.addListener(transfer.id, TransferState.STARTED, resolve);
      });
    } else {
      return transfer;
    }
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
        endpoint: this.config.server.publicAddress,
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
  async handleTransferStart(
    transferStartMessage: TransferStartMessageDto,
    processId: string
  ): Promise<void> {
    const transfer = await this.getTransferById(processId);
    transfer.state = TransferState.STARTED;
    if (transfer.role === "consumer") {
      if (transferStartMessage.dataAddress === undefined) {
        throw new DataPlaneError(
          `Expected dataAddress in TransferStartMessage`,
          HttpStatus.BAD_REQUEST
        ).andLog(this.logger);
      }
      transfer.dataAddress = transferStartMessage.dataAddress;
    }
    await this.transferRepository.save(transfer);
    this.notifyListeners(transfer, TransferState.STARTED);
  }
  async handleTransferComplete(
    _transferCompletionMessage: TransferCompletionMessageDto,
    processId: string
  ): Promise<void> {
    const transfer = await this.getTransferById(processId);
    transfer.state = TransferState.COMPLETED;
    await this.transferRepository.save(transfer);
    this.notifyListeners(transfer, TransferState.COMPLETED);
  }
  async handleTransferTerminate(
    _transferTerminationMessage: TransferTerminationMessageDto,
    processId: string
  ): Promise<void> {
    const transfer = await this.getTransferById(processId);
    transfer.state = TransferState.TERMINATED;
    await this.transferRepository.save(transfer);
    this.notifyListeners(transfer, TransferState.TERMINATED);
  }
  async handleTransferSuspend(
    _transferSuspensionMessage: TransferSuspensionMessageDto,
    processId: string
  ): Promise<void> {
    const transfer = await this.getTransferById(processId);
    transfer.state = TransferState.SUSPENDED;
    await this.transferRepository.save(transfer);
    this.notifyListeners(transfer, TransferState.SUSPENDED);
  }
}
