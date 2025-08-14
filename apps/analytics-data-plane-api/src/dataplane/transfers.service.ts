import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AlgorithmParticipant } from "@tsg-dsp/analytics-data-plane-dtos";
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
import { NegotiationDetailDto, TransferDto } from "@tsg-dsp/common-dtos";
import { resolveDid } from "@tsg-dsp/common-signing-and-validation";
import crypto from "crypto";
import { Repository } from "typeorm";

import { RootConfig } from "../config.js";
import { DataPlaneError } from "../utils/errors/error.js";
import { ManagementClient } from "./management-client.service.js";
import { TransferDao } from "./transfer.dao.js";

@Injectable()
export class TransfersService {
  constructor(
    private readonly config: RootConfig,
    @InjectRepository(TransferDao)
    private readonly transferRepository: Repository<TransferDao>,
    private readonly managementClient: ManagementClient
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
      where: { id },
      relations: ["algorithmInstance"]
    });
    if (!transfer) {
      throw new DataPlaneError(
        `Transfer ${id} not found`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger);
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
        `Transfer with processId ${processId} not found`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger);
    }
    return transfer;
  }

  async getTransferBySecret(secret: string) {
    const transfer = await this.transferRepository.findOne({
      where: { secret },
      relations: ["algorithmInstance"]
    });
    if (!transfer) {
      throw new DataPlaneError(
        `Invalid token, transfer by secret not found`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger);
    }
    return transfer;
  }

  async getParticipantControlPlaneAddress(
    participantDidId: string
  ): Promise<string> {
    const didDocument = await resolveDid(participantDidId);
    const service = didDocument.service?.find(
      (service) =>
        service.type === "connector" &&
        typeof service.serviceEndpoint === "string"
    );
    if (!service) {
      throw new DataPlaneError(
        `Could not find ControlPlaneService in DID document for ${participantDidId}`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger);
    }
    return service.serviceEndpoint as string;
  }

  async getOrObtainNegotiationForDataset(
    dataset: DatasetDto,
    participantId: string,
    remoteAddress: string
  ): Promise<NegotiationDetailDto> {
    try {
      return await this.managementClient.getNegotiationForDataset(
        dataset["@id"],
        participantId
      );
    } catch (_) {
      return await this.managementClient.requestNegotiation(
        dataset.hasPolicy?.[0],
        dataset["@id"],
        participantId,
        remoteAddress
      );
    }
  }

  async requestTransferForParticipant(
    participant: AlgorithmParticipant,
    dataset: DatasetDto,
    algorithmInstanceId: string,
    listenForStarted = false
  ) {
    const remoteAddress = await this.getParticipantControlPlaneAddress(
      participant.didId
    );
    const negotiation = await this.getOrObtainNegotiationForDataset(
      dataset,
      participant.didId,
      remoteAddress
    );
    const transferDto = await this.requestTransfer(
      negotiation,
      remoteAddress,
      participant.didId
    );

    this.logger.log(
      `Transfer requested for algorithm instance ${algorithmInstanceId} to participant ${participant.didId} with transfer ID ${transferDto.consumerPid}/${transferDto.providerPid}`
    );

    const transfer = await this.transferRepository.findOneByOrFail({
      processId: transferDto.consumerPid
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

  async requestTransfer(
    negotiation: NegotiationDetailDto,
    address: string,
    audience: string
  ) {
    const agreementId = negotiation?.agreement?.["@id"];
    if (!agreementId) {
      throw new DataPlaneError(
        `No agreement ID found for negotiation ${negotiation.localId}`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger);
    }
    return await this.managementClient.requestTransfer(
      agreementId,
      audience,
      address
    );
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

  async transferStart(id: string) {
    const transfer = await this.getTransferById(id);
    return this.managementClient.transferStart(transfer);
  }

  async transferComplete(id: string) {
    const transfer = await this.getTransferById(id);
    return this.managementClient.transferComplete(transfer);
  }

  async transferTerminate(id: string, code: string, reason: string) {
    const transfer = await this.getTransferById(id);
    return this.managementClient.transferTerminate(transfer, code, reason);
  }

  async transferSuspend(id: string, reason: string) {
    const transfer = await this.getTransferById(id);
    return this.managementClient.transferSuspend(transfer, reason);
  }

  async handleTransferStart(
    transferStartMessage: TransferStartMessageDto,
    processId: string
  ) {
    const transfer = await this.transferRepository.findOneBy({ id: processId });
    if (!transfer) {
      throw new DataPlaneError(
        `Transfer ${processId} not found`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger);
    }
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
  ) {
    const transfer = await this.transferRepository.findOneBy({ id: processId });
    if (!transfer) {
      throw new DataPlaneError(
        `Transfer ${processId} not found`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger);
    }
    transfer.state = TransferState.COMPLETED;
    await this.transferRepository.save(transfer);
    this.notifyListeners(transfer, TransferState.COMPLETED);
  }

  async handleTransferTerminate(
    _transferTerminationMessage: TransferTerminationMessageDto,
    processId: string
  ) {
    const transfer = await this.transferRepository.findOneBy({ id: processId });
    if (!transfer) {
      throw new DataPlaneError(
        `Transfer ${processId} not found`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger);
    }
    transfer.state = TransferState.TERMINATED;
    await this.transferRepository.save(transfer);
    this.notifyListeners(transfer, TransferState.TERMINATED);
  }

  async handleTransferSuspend(
    _transferSuspensionMessage: TransferSuspensionMessageDto,
    processId: string
  ) {
    const transfer = await this.transferRepository.findOneBy({ id: processId });
    if (!transfer) {
      throw new DataPlaneError(
        `Transfer ${processId} not found`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger);
    }
    transfer.state = TransferState.SUSPENDED;
    await this.transferRepository.save(transfer);
    this.notifyListeners(transfer, TransferState.SUSPENDED);
  }

  async getMetadata(
    id: string
  ): Promise<{ agreement: AgreementDto; dataset: DatasetDto }> {
    const transfer = await this.getTransferById(id);
    const agreement = await this.managementClient.getAgreement(
      transfer.request.agreementId
    );
    const did = await resolveDid(transfer.remoteParty);
    const connectorService = did.service?.find(
      (s) => s.type === "connector" && typeof s.serviceEndpoint === "string"
    );
    if (!connectorService) {
      throw new DataPlaneError(
        `No connector service defined in DID document for ${transfer.remoteParty}`,
        HttpStatus.BAD_REQUEST
      ).andLog(new Logger("DidResolver"), "log");
    }

    const dataset = await this.managementClient.getDataset(
      `${connectorService.serviceEndpoint}`,
      agreement.target,
      transfer.remoteParty
    );
    return {
      agreement: agreement,
      dataset: dataset
    };
  }
}
