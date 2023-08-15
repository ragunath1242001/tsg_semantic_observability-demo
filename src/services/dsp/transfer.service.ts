import { Injectable } from "@nestjs/common"
import { DataPlaneTransferDto } from "../../model/data-planes/dataPlanes.dto"
import { Multilanguage } from "../../model/dsp/common"
import { DataAddress, TransferCompletionMessage, TransferProcess, TransferRequestMessage, TransferStartMessage, TransferSuspensionMessage, TransferTerminationMessage } from "../../model/dsp/transfer/messages"
import { TransferState } from "../../model/dsp/transfer/messages.dto"
import { DataPlaneService } from "../dataPlane.service"
import crypto from "crypto"
import { DspClientService } from "./client.service"
import { deserialize } from "../../model/serialize"


type TransferRole = "provider" | "consumer";

interface TransferEvent {
  time: Date,
  state: TransferState,
  localMessage?: string,
  code?: string,
  reason?: Multilanguage[]
}

interface TransferStatus {
  localId: string,
  remoteId?: string,
  role: TransferRole,
  remoteAddress: string,
  state: TransferState,
  process: TransferProcess,
  agreementId: string,
  format?: string,
  dataAddress?: DataAddress,
  dataPlaneTransfer: DataPlaneTransferDto,
  localEvents: TransferEvent[],
  remoteEvents: TransferEvent[]
}

@Injectable()
export class TransferService {
  constructor(private readonly dataPlaneService: DataPlaneService, private readonly dsp: DspClientService) {}
  private readonly transfers: TransferStatus[] = []

  private readonly providerTransitions: Record<TransferState, TransferState[]> = {
    [TransferState.REQUESTED]: [TransferState.STARTED, TransferState.TERMINATED],
    [TransferState.STARTED]: [TransferState.SUSPENDED, TransferState.COMPLETED, TransferState.TERMINATED],
    [TransferState.TERMINATED]: [],
    [TransferState.COMPLETED]: [],
    [TransferState.SUSPENDED]: [TransferState.STARTED, TransferState.TERMINATED]
  }

  private readonly consumerTransitions: Record<TransferState, TransferState[]> = {
    [TransferState.REQUESTED]: [TransferState.TERMINATED],
    [TransferState.STARTED]: [TransferState.SUSPENDED, TransferState.COMPLETED, TransferState.TERMINATED],
    [TransferState.TERMINATED]: [],
    [TransferState.COMPLETED]: [],
    [TransferState.SUSPENDED]: [TransferState.STARTED, TransferState.TERMINATED]
  }

  private readonly allowedTransitions: Record<"remote" | "local", Record<TransferRole, Record<TransferState, TransferState[]>>> = {
    remote: {
      provider: this.consumerTransitions,
      consumer: this.providerTransitions
    },
    local: {
      provider: this.providerTransitions,
      consumer: this.consumerTransitions
    }
  }

  private checkTransition(direction: "remote" | "local", transfer: TransferStatus, to: TransferState) {
    if (!this.allowedTransitions[direction][transfer.role][transfer.state].includes(to)) {
      const event: TransferEvent = {
        time: new Date(),
        state: TransferState.STARTED,
        localMessage: `Transfer with process ID ${transfer.localId} cannot transition from ${transfer.state} to ${to}`
      }
      if (direction === "remote") {
        transfer.remoteEvents.push(event);
      } else {
        transfer.localEvents.push(event);
      }
      throw Error(`Transfer with process ID ${transfer.localId} cannot transition from ${transfer.state} to ${to}`);
    }
  }

  async getTransfer(processId: string): Promise<TransferStatus | undefined> {
    return this.transfers.find(transfer => transfer.localId === processId);
  }

  async initiateTransferProcess(requestDetail: TransferRequestMessage, remoteAddress: string): Promise<{localId: string, message: TransferRequestMessage}> {
    const localId = `urn:uuid:${crypto.randomUUID()}`;
    
    const transferRequestMessage = new TransferRequestMessage(requestDetail);
    const dataPlaneTransfer = await this.dataPlaneService.requestTransfer(transferRequestMessage, "consumer");
    const requestTransfer = await this.dsp.requestTransfer(`${remoteAddress}/request`, transferRequestMessage);
    const transferProcess = await deserialize<TransferProcess>(requestTransfer);
    this.transfers.push({
      localId: localId,
      remoteId: transferProcess.processId,
      role: "consumer",
      remoteAddress: `${remoteAddress}/${transferProcess.processId}`,
      state: TransferState.REQUESTED,
      agreementId: requestDetail.agreementId,
      format: requestDetail.format,
      dataAddress: requestDetail.dataAddress,
      dataPlaneTransfer: dataPlaneTransfer,
      process: transferProcess,
      localEvents: [{
        time: new Date(),
        state: TransferState.REQUESTED
      }],
      remoteEvents: []
    });
    return {
      localId,
      message: transferRequestMessage
    };
  }

  async handleRequest(transferRequestMessage: TransferRequestMessage): Promise<TransferProcess> {
    const transferProcess = new TransferProcess({
      processId: `urn:uuid:${crypto.randomUUID()}`,
      transferState: TransferState.STARTED
    })
    const dataPlaneTransfer = await this.dataPlaneService.requestTransfer(transferRequestMessage, "provider");
    this.transfers.push({
      localId: transferProcess.processId,
      remoteId: transferProcess.processId,
      role: "provider",
      remoteAddress: transferRequestMessage.callbackAddress,
      state: TransferState.REQUESTED,
      agreementId: transferRequestMessage.agreementId,
      format: transferRequestMessage.format,
      dataAddress: transferRequestMessage.dataAddress,
      dataPlaneTransfer: dataPlaneTransfer,
      process: transferProcess,
      localEvents: [],
      remoteEvents: [{
        time: new Date(),
        state: TransferState.REQUESTED
      }]
    })
    return transferProcess;
  }

  async start(processId: string, transferStartMessage: TransferStartMessage, fromDataPlane: boolean): Promise<{status: string} | undefined> {
    const transfer = await this.getTransfer(processId);
    if (transfer === undefined) {
      return undefined;
    }
    this.checkTransition("local", transfer, TransferState.STARTED);
    transfer.localEvents.push({
      time: new Date(),
      state: TransferState.STARTED
    });
    if (!fromDataPlane) {
      await this.dataPlaneService.startTransfer(transfer.dataPlaneTransfer, transferStartMessage)
    }
    await this.dsp.startTransfer(`${transfer.remoteAddress}/start`, transferStartMessage);
    transfer.state = TransferState.STARTED;
    return {
      status: 'OK'
    }
  }


  async handleStart(processId: string, transferStartMessage: TransferStartMessage): Promise<{status: string} | undefined> {
    const transfer = await this.getTransfer(processId);
    if (transfer === undefined) {
      return undefined;
    }
    this.checkTransition("remote", transfer, TransferState.STARTED);
    transfer.remoteEvents.push({
      time: new Date(),
      state: TransferState.STARTED
    });
    await this.dataPlaneService.startTransfer(transfer.dataPlaneTransfer, transferStartMessage)

    transfer.state = TransferState.STARTED;
    return {
      status: 'OK'
    }
  }

  async complete(processId: string, transferCompletionMessage: TransferCompletionMessage, fromDataPlane: boolean): Promise<{status: string} | undefined> {
    const transfer = await this.getTransfer(processId);
    if (transfer === undefined) {
      return undefined;
    }
    this.checkTransition("local", transfer, TransferState.COMPLETED);
    transfer.localEvents.push({
      time: new Date(),
      state: TransferState.COMPLETED
    });
    if (!fromDataPlane) {
      await this.dataPlaneService.completeTransfer(transfer.dataPlaneTransfer, transferCompletionMessage)
    }
    await this.dsp.completeTransfer(`${transfer.remoteAddress}/complete`, transferCompletionMessage);
    transfer.state = TransferState.COMPLETED;
    return {
      status: 'OK'
    }
  }
  
  async handleComplete(processId: string, transferCompletionMessage: TransferCompletionMessage): Promise<{status: string} | undefined> {
    const transfer = await this.getTransfer(processId);
    if (transfer === undefined) {
      return undefined;
    }
    this.checkTransition("remote", transfer, TransferState.COMPLETED);
    transfer.remoteEvents.push({
      time: new Date(),
      state: TransferState.COMPLETED
    });
    await this.dataPlaneService.completeTransfer(transfer.dataPlaneTransfer, transferCompletionMessage)

    transfer.state = TransferState.COMPLETED;
    return {
      status: 'OK'
    }
  }
  
  async terminate(processId: string, transferTerminationMessage: TransferTerminationMessage, fromDataPlane: boolean): Promise<{status: string} | undefined> {
    const transfer = await this.getTransfer(processId);
    if (transfer === undefined) {
      return undefined;
    }
    this.checkTransition("local", transfer, TransferState.TERMINATED);
    transfer.localEvents.push({
      time: new Date(),
      state: TransferState.TERMINATED,
      code: transferTerminationMessage.code,
      reason: transferTerminationMessage.reason
    });
    if (!fromDataPlane) {
      await this.dataPlaneService.terminateTransfer(transfer.dataPlaneTransfer, transferTerminationMessage)
    }
    await this.dsp.terminateTransfer(`${transfer.remoteAddress}/complete`, transferTerminationMessage);
    transfer.state = TransferState.TERMINATED;
    return {
      status: 'OK'
    }
  }
  
  async handleTerminate(processId: string, transferTerminationMessage: TransferTerminationMessage): Promise<{status: string} | undefined> {
    const transfer = await this.getTransfer(processId);
    if (transfer === undefined) {
      return undefined;
    }
    this.checkTransition("remote", transfer, TransferState.TERMINATED);
    transfer.remoteEvents.push({
      time: new Date(),
      state: TransferState.TERMINATED,
      code: transferTerminationMessage.code,
      reason: transferTerminationMessage.reason
    });
    await this.dataPlaneService.terminateTransfer(transfer.dataPlaneTransfer, transferTerminationMessage)

    transfer.state = TransferState.TERMINATED;
    return {
      status: 'OK'
    }
  }

  async suspend(processId: string, transferSuspensionMessage: TransferSuspensionMessage, fromDataPlane: boolean): Promise<{status: string} | undefined> {
    const transfer = await this.getTransfer(processId);
    if (transfer === undefined) {
      return undefined;
    }
    this.checkTransition("local", transfer, TransferState.SUSPENDED);
    transfer.localEvents.push({
      time: new Date(),
      state: TransferState.SUSPENDED,
      reason: transferSuspensionMessage.reason
    });
    if (!fromDataPlane) {
      await this.dataPlaneService.suspendTransfer(transfer.dataPlaneTransfer, transferSuspensionMessage)
    }
    await this.dsp.suspendTransfer(`${transfer.remoteAddress}/complete`, transferSuspensionMessage);
    transfer.state = TransferState.SUSPENDED;
    return {
      status: 'OK'
    }
  }

  async handleSuspend(processId: string, transferSuspensionMessage: TransferSuspensionMessage): Promise<{status: string} | undefined> {
    const transfer = await this.getTransfer(processId);
    if (transfer === undefined) {
      return undefined;
    }
    this.checkTransition("remote", transfer, TransferState.SUSPENDED);
    transfer.remoteEvents.push({
      time: new Date(),
      state: TransferState.SUSPENDED,
      reason: transferSuspensionMessage.reason
    });
    await this.dataPlaneService.suspendTransfer(transfer.dataPlaneTransfer, transferSuspensionMessage)
    transfer.state = TransferState.SUSPENDED;

    return {
      status: 'OK'
    }
  }
}