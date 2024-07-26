import { DataPlaneAddress, TransferRole } from "@tsg-dsp/control-plane-dtos";
import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  DataAddress,
  EndpointProperty,
  Multilanguage,
  TransferCompletionMessage,
  TransferDetail,
  TransferEvent,
  TransferProcess,
  TransferRequestMessage,
  TransferStartMessage,
  TransferState,
  TransferStatus,
  TransferSuspensionMessage,
  TransferTerminationMessage,
  deserialize,
} from "@tsg-dsp/common-dsp";
import crypto from "crypto";
import { Repository } from "typeorm";
import { ServerConfig } from "../../config";
import { DataPlaneService } from "../../data-plane/dataPlane.service";
import { TransferDetailDao, TransferEventDao } from "../../model/transfer.dao";
import { DSPError } from "../../utils/errors/error";
import { DspClientService } from "../client/client.service";
import { DspGateway } from "../client/dsp.gateway";

@Injectable()
export class TransferService {
  constructor(
    private readonly dataPlaneService: DataPlaneService,
    private readonly dsp: DspClientService,
    private readonly dspGateway: DspGateway,
    private readonly server: ServerConfig,
    @InjectRepository(TransferDetailDao)
    private readonly transferDetailRepository: Repository<TransferDetailDao>,
    @InjectRepository(TransferEventDao)
    private readonly transferEventRepository: Repository<TransferEventDao>
  ) {}
  private readonly logger = new Logger(this.constructor.name);

  private readonly providerTransitions: Record<TransferState, TransferState[]> =
    {
      [TransferState.REQUESTED]: [
        TransferState.STARTED,
        TransferState.TERMINATED,
      ],
      [TransferState.STARTED]: [
        TransferState.SUSPENDED,
        TransferState.COMPLETED,
        TransferState.TERMINATED,
      ],
      [TransferState.TERMINATED]: [],
      [TransferState.COMPLETED]: [],
      [TransferState.SUSPENDED]: [
        TransferState.STARTED,
        TransferState.TERMINATED,
      ],
    };

  private readonly consumerTransitions: Record<TransferState, TransferState[]> =
    {
      [TransferState.REQUESTED]: [TransferState.TERMINATED],
      [TransferState.STARTED]: [
        TransferState.SUSPENDED,
        TransferState.COMPLETED,
        TransferState.TERMINATED,
      ],
      [TransferState.TERMINATED]: [],
      [TransferState.COMPLETED]: [],
      [TransferState.SUSPENDED]: [
        TransferState.STARTED,
        TransferState.TERMINATED,
      ],
    };

  private readonly allowedTransitions: Record<
    "remote" | "local",
    Record<TransferRole, Record<TransferState, TransferState[]>>
  > = {
    remote: {
      provider: this.consumerTransitions,
      consumer: this.providerTransitions,
    },
    local: {
      provider: this.providerTransitions,
      consumer: this.consumerTransitions,
    },
  };

  private async checkTransition(
    direction: "remote" | "local",
    transfer: TransferDetail,
    to: TransferState
  ) {
    if (
      !this.allowedTransitions[direction][transfer.role][
        transfer.state
      ].includes(to)
    ) {
      const event: TransferEvent = {
        time: new Date(),
        state: to,
        localMessage: `Transfer with process ID ${transfer.localId} cannot transition from ${transfer.state} to ${to}`,
        type: direction,
      };
      const eventObj = this.transferEventRepository.create(event);
      transfer.events.push(eventObj);
      await this.transferDetailRepository.save(transfer);
      throw new DSPError(
        `Transfer with process ID ${transfer.localId} cannot transition from ${transfer.state} to ${to}`,
        HttpStatus.BAD_REQUEST
      ).andLog(this.logger, "warn");
    }
  }

  async getTransfers(): Promise<TransferStatus[]> {
    const transfers = await this.transferDetailRepository.find({
      select: {
        localId: true,
        remoteId: true,
        role: true,
        remoteAddress: true,
        remoteParty: true,
        state: true,
        process: {
          consumerPid: true,
          providerPid: true,
          state: true,
        },
        agreementId: true,
        format: true,
      },
      order: {
        modifiedDate: {
          direction: "DESC",
        },
      },
    });
    return transfers.map((transfer) => new TransferStatus(transfer));
  }

  async getTransfer(
    processId: string,
    audience?: string
  ): Promise<TransferDetail> {
    const transfer = await this.transferDetailRepository.findOneBy({
      localId: processId,
      remoteParty: audience,
    });
    if (transfer) {
      return new TransferDetail(transfer);
    } else {
      throw new DSPError(
        `Cannot get transfer with process ID ${processId}`,
        HttpStatus.NOT_FOUND
      ).andLog(this.logger, "warn");
    }
  }

  async initiateTransferProcess(
    agreementId: string,
    format: string,
    dataAddress: DataAddress | undefined,
    remoteAddress: string,
    audience: string
  ): Promise<{
    localId: string;
    remoteId: string;
    message: TransferRequestMessage;
    process: TransferProcess;
  }> {
    const localId = `urn:uuid:consumer:${crypto.randomUUID()}`;
    const transferRequestMessage = new TransferRequestMessage({
      consumerPid: localId,
      agreementId: agreementId,
      format: format,
      dataAddress: dataAddress,
      callbackAddress: `${this.server.publicAddress}/transfers/${localId}`,
    });
    const dataPlaneTransfer = await this.dataPlaneService.requestTransfer(
      transferRequestMessage,
      localId,
      "consumer",
      audience
    );
    const requestTransfer = await this.dsp.requestTransfer(
      `${remoteAddress}/request`,
      transferRequestMessage,
      audience
    );
    const transferProcess = await deserialize<TransferProcess>(requestTransfer);
    if (
      dataAddress === undefined &&
      dataPlaneTransfer.dataAddress !== undefined
    ) {
      dataAddress = new DataAddress({
        endpointType: dataPlaneTransfer.endpointType,
        endpoint: dataPlaneTransfer.dataAddress.endpoint,
        endpointProperties: dataPlaneTransfer.dataAddress.properties.map(
          (p) => new EndpointProperty(p)
        ),
      });
    }
    const transfer: TransferDetail = {
      localId: localId,
      remoteId: transferProcess.providerPid,
      role: "consumer",
      remoteAddress: `${remoteAddress}/${transferProcess.providerPid}`,
      remoteParty: audience,
      state: TransferState.REQUESTED,
      agreementId: agreementId,
      format: format,
      dataAddress: dataAddress,
      dataPlaneTransfer: dataPlaneTransfer,
      process: transferProcess,
      events: [
        this.transferEventRepository.create({
          time: new Date(),
          state: TransferState.REQUESTED,
          type: "local",
        }),
      ],
    };
    await this.transferDetailRepository.save(transfer);
    this.dspGateway.sendUpdateToClients("transfer:create", "created");
    return {
      localId,
      remoteId: transferProcess.providerPid,
      message: transferRequestMessage,
      process: transferProcess,
    };
  }

  async handleRequest(
    transferRequestMessage: TransferRequestMessage,
    audience: string
  ): Promise<TransferProcess> {
    const transferProcess = new TransferProcess({
      providerPid: `urn:uuid:provider:${crypto.randomUUID()}`,
      consumerPid: transferRequestMessage.consumerPid,
      state: TransferState.REQUESTED,
      agreementId: transferRequestMessage.agreementId,
    });
    const dataPlaneTransfer = await this.dataPlaneService.requestTransfer(
      transferRequestMessage,
      transferProcess.providerPid,
      "provider",
      audience
    );
    const transfer: TransferDetail = {
      localId: transferProcess.providerPid,
      remoteId: transferRequestMessage.consumerPid,
      role: "provider",
      remoteAddress: transferRequestMessage.callbackAddress,
      remoteParty: audience,
      state: TransferState.REQUESTED,
      agreementId: transferRequestMessage.agreementId,
      format: transferRequestMessage.format,
      dataAddress: transferRequestMessage.dataAddress,
      dataPlaneTransfer: dataPlaneTransfer,
      process: transferProcess,
      events: [
        this.transferEventRepository.create({
          time: new Date(),
          state: TransferState.REQUESTED,
          type: "remote",
        }),
      ],
    };
    await this.transferDetailRepository.save(transfer);
    if (dataPlaneTransfer.dataAddress) {
      setTimeout(() => {
        this.start(
          transferProcess.providerPid,
          dataPlaneTransfer.dataAddress,
          false
        );
      }, 2000);
    }
    this.dspGateway.sendUpdateToClients("transfer:create", "created");
    return transferProcess;
  }

  async start(
    processId: string,
    dataPlaneAddress: DataPlaneAddress | undefined,
    fromDataPlane: boolean
  ): Promise<{ status: string }> {
    const transfer = await this.getTransfer(processId);
    let dataAddress: DataAddress | undefined;
    if (dataPlaneAddress && dataPlaneAddress.endpoint) {
      dataAddress = new DataAddress({
        endpoint: dataPlaneAddress.endpoint,
        endpointType: transfer.dataPlaneTransfer.endpointType,
        endpointProperties:
          dataPlaneAddress.properties?.map((p) => new EndpointProperty(p)) ||
          [],
      });
    } else {
      dataAddress = new DataAddress({
        endpoint: transfer.dataAddress?.endpoint || "",
        endpointType: transfer.dataAddress?.endpointType || "",
        endpointProperties:
          transfer.dataAddress?.endpointProperties?.map(
            (p) => new EndpointProperty(p)
          ) || [],
      });
    }
    const transferStartMessage = new TransferStartMessage({
      providerPid:
        transfer.role === "provider" ? transfer.localId : transfer.remoteId!,
      consumerPid:
        transfer.role === "provider" ? transfer.remoteId! : transfer.localId,
      dataAddress: dataAddress,
    });
    await this.checkTransition("local", transfer, TransferState.STARTED);
    transfer.events.push(
      this.transferEventRepository.create({
        time: new Date(),
        state: TransferState.STARTED,
        type: "local",
      })
    );
    if (!fromDataPlane) {
      await this.dataPlaneService.startTransfer(
        transfer.dataPlaneTransfer,
        transferStartMessage
      );
    }
    await this.dsp.startTransfer(
      `${transfer.remoteAddress}/start`,
      transferStartMessage,
      transfer.remoteParty
    );
    transfer.state = TransferState.STARTED;
    await this.transferDetailRepository.save(transfer);
    this.dspGateway.sendUpdateToClients("transfer:update", "updated");
    return {
      status: "OK",
    };
  }

  async handleStart(
    processId: string,
    transferStartMessage: TransferStartMessage,
    audience: string
  ): Promise<{ status: string }> {
    const transfer = await this.getTransfer(processId, audience);
    await this.checkTransition("remote", transfer, TransferState.STARTED);
    this.processIdMatch(
      transferStartMessage.consumerPid,
      transferStartMessage.providerPid,
      transfer
    );
    transfer.events.push(
      this.transferEventRepository.create({
        time: new Date(),
        state: TransferState.STARTED,
        type: "remote",
      })
    );
    await this.dataPlaneService.startTransfer(
      transfer.dataPlaneTransfer,
      transferStartMessage
    );
    if (transferStartMessage.dataAddress) {
      transfer.dataAddress = transferStartMessage.dataAddress;
    }
    transfer.state = TransferState.STARTED;
    await this.transferDetailRepository.save(transfer);
    this.dspGateway.sendUpdateToClients("transfer:update", "updated");
    return {
      status: "OK",
    };
  }

  async complete(
    processId: string,
    fromDataPlane: boolean
  ): Promise<{ status: string }> {
    const transfer = await this.getTransfer(processId);
    await this.checkTransition("local", transfer, TransferState.COMPLETED);
    transfer.events.push(
      this.transferEventRepository.create({
        time: new Date(),
        state: TransferState.COMPLETED,
        type: "local",
      })
    );
    const transferCompletionMessage = new TransferCompletionMessage({
      providerPid:
        transfer.role === "provider" ? transfer.localId : transfer.remoteId!,
      consumerPid:
        transfer.role === "provider" ? transfer.remoteId! : transfer.localId,
    });
    if (!fromDataPlane) {
      await this.dataPlaneService.completeTransfer(
        transfer.dataPlaneTransfer,
        transferCompletionMessage
      );
    }
    await this.dsp.completeTransfer(
      `${transfer.remoteAddress}/complete`,
      transferCompletionMessage,
      transfer.remoteParty
    );
    transfer.state = TransferState.COMPLETED;
    await this.transferDetailRepository.save(transfer);
    this.dspGateway.sendUpdateToClients("transfer:update", "updated");
    return {
      status: "OK",
    };
  }

  async handleComplete(
    processId: string,
    transferCompletionMessage: TransferCompletionMessage,
    audience: string
  ): Promise<{ status: string }> {
    const transfer = await this.getTransfer(processId, audience);
    await this.checkTransition("remote", transfer, TransferState.COMPLETED);
    this.processIdMatch(
      transferCompletionMessage.consumerPid,
      transferCompletionMessage.providerPid,
      transfer
    );
    transfer.events.push(
      this.transferEventRepository.create({
        time: new Date(),
        state: TransferState.COMPLETED,
        type: "remote",
      })
    );
    await this.dataPlaneService.completeTransfer(
      transfer.dataPlaneTransfer,
      transferCompletionMessage
    );

    transfer.state = TransferState.COMPLETED;
    await this.transferDetailRepository.save(transfer);
    this.dspGateway.sendUpdateToClients("transfer:update", "updated");
    return {
      status: "OK",
    };
  }

  async terminate(
    processId: string,
    code: string,
    reason: string,
    fromDataPlane: boolean
  ): Promise<{ status: string }> {
    const transfer = await this.getTransfer(processId);
    await this.checkTransition("local", transfer, TransferState.TERMINATED);
    const transferTerminationMessage = new TransferTerminationMessage({
      providerPid:
        transfer.role === "provider" ? transfer.localId : transfer.remoteId!,
      consumerPid:
        transfer.role === "provider" ? transfer.remoteId! : transfer.localId,
      code: code,
      reason: [new Multilanguage(reason)],
    });
    transfer.events.push(
      this.transferEventRepository.create({
        time: new Date(),
        state: TransferState.TERMINATED,
        code: code,
        reason: transferTerminationMessage.reason,
        type: "local",
      })
    );
    if (!fromDataPlane) {
      await this.dataPlaneService.terminateTransfer(
        transfer.dataPlaneTransfer,
        transferTerminationMessage
      );
    }
    await this.dsp.terminateTransfer(
      `${transfer.remoteAddress}/terminate`,
      transferTerminationMessage,
      transfer.remoteParty
    );
    transfer.state = TransferState.TERMINATED;
    await this.transferDetailRepository.save(transfer);
    this.dspGateway.sendUpdateToClients("transfer:update", "updated");
    return {
      status: "OK",
    };
  }

  async handleTerminate(
    processId: string,
    transferTerminationMessage: TransferTerminationMessage,
    audience: string
  ): Promise<{ status: string }> {
    const transfer = await this.getTransfer(processId, audience);
    await this.checkTransition("remote", transfer, TransferState.TERMINATED);
    this.processIdMatch(
      transferTerminationMessage.consumerPid,
      transferTerminationMessage.providerPid,
      transfer
    );
    transfer.events.push(
      this.transferEventRepository.create({
        time: new Date(),
        state: TransferState.TERMINATED,
        code: transferTerminationMessage.code,
        reason: transferTerminationMessage.reason,
        type: "remote",
      })
    );
    await this.dataPlaneService.terminateTransfer(
      transfer.dataPlaneTransfer,
      transferTerminationMessage
    );

    transfer.state = TransferState.TERMINATED;
    await this.transferDetailRepository.save(transfer);
    this.dspGateway.sendUpdateToClients("transfer:update", "updated");
    return {
      status: "OK",
    };
  }

  async suspend(
    processId: string,
    reason: string,
    fromDataPlane: boolean
  ): Promise<{ status: string }> {
    const transfer = await this.getTransfer(processId);
    await this.checkTransition("local", transfer, TransferState.SUSPENDED);
    const transferSuspensionMessage = new TransferSuspensionMessage({
      providerPid:
        transfer.role === "provider" ? transfer.localId : transfer.remoteId!,
      consumerPid:
        transfer.role === "provider" ? transfer.remoteId! : transfer.localId,
      reason: [new Multilanguage(reason)],
    });
    transfer.events.push(
      this.transferEventRepository.create({
        time: new Date(),
        state: TransferState.SUSPENDED,
        reason: transferSuspensionMessage.reason,
        type: "local",
      })
    );
    if (!fromDataPlane) {
      await this.dataPlaneService.suspendTransfer(
        transfer.dataPlaneTransfer,
        transferSuspensionMessage
      );
    }
    await this.dsp.suspendTransfer(
      `${transfer.remoteAddress}/suspend`,
      transferSuspensionMessage,
      transfer.remoteParty
    );
    transfer.state = TransferState.SUSPENDED;
    await this.transferDetailRepository.save(transfer);
    this.dspGateway.sendUpdateToClients("transfer:update", "updated");
    return {
      status: "OK",
    };
  }

  async handleSuspend(
    processId: string,
    transferSuspensionMessage: TransferSuspensionMessage,
    audience: string
  ): Promise<{ status: string }> {
    const transfer = await this.getTransfer(processId, audience);
    await this.checkTransition("remote", transfer, TransferState.SUSPENDED);
    this.processIdMatch(
      transferSuspensionMessage.consumerPid,
      transferSuspensionMessage.providerPid,
      transfer
    );
    transfer.events.push(
      this.transferEventRepository.create({
        time: new Date(),
        state: TransferState.SUSPENDED,
        reason: transferSuspensionMessage.reason,
        type: "remote",
      })
    );
    await this.dataPlaneService.suspendTransfer(
      transfer.dataPlaneTransfer,
      transferSuspensionMessage
    );
    transfer.state = TransferState.SUSPENDED;
    await this.transferDetailRepository.save(transfer);
    this.dspGateway.sendUpdateToClients("transfer:update", "updated");
    return {
      status: "OK",
    };
  }

  private processIdMatch(
    consumerPid: string,
    providerPid: string,
    transfer: TransferDetail
  ) {
    if (transfer.role == "consumer") {
      if (
        consumerPid !== transfer.localId ||
        providerPid !== transfer.remoteId
      ) {
        throw new DSPError(
          "Mismatch in received and stored process identifiers",
          HttpStatus.BAD_REQUEST
        ).andLog(this.logger, "warn");
      }
    } else {
      if (
        providerPid !== transfer.localId ||
        consumerPid !== transfer.remoteId
      ) {
        throw new DSPError(
          "Mismatch in received and stored process identifiers",
          HttpStatus.BAD_REQUEST
        ).andLog(this.logger, "warn");
      }
    }
  }
}
