import { Injectable } from "@nestjs/common"
import { DataPlaneTransferDto } from "../../model/data-planes/dataPlanes.dto"
import { Multilanguage } from "../../model/dsp/common"
import { DataAddress, TransferCompletionMessage, TransferProcess, TransferRequestMessage, TransferStartMessage, TransferSuspensionMessage, TransferTerminationMessage } from "../../model/dsp/transfer/messages"
import { TransferState } from "../../model/dsp/transfer/messages.dto"
import { DataPlaneService } from "../dataPlane.service"
import crypto from "crypto"
import { DspClientService } from "./client.service"
import { deserialize } from "../../model/serialize"


enum TransferRole {
  PROVIDER, CONSUMER
}

interface TransferEvent {
  time: Date,
  state: TransferState,
  internalMessage?: string,
  code?: string,
  reason?: Multilanguage[]
}

interface TransferStatus {
  internalId: string,
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
    [TransferState.REQUESTED]: [TransferState.TERMINATED],
    [TransferState.STARTED]: [TransferState.SUSPENDED, TransferState.COMPLETED, TransferState.TERMINATED],
    [TransferState.TERMINATED]: [],
    [TransferState.COMPLETED]: [],
    [TransferState.SUSPENDED]: [TransferState.STARTED]
  }
  private readonly consumerTransitions: Record<TransferState, TransferState[]> = {
    [TransferState.REQUESTED]: [TransferState.STARTED, TransferState.TERMINATED],
    [TransferState.STARTED]: [TransferState.SUSPENDED, TransferState.COMPLETED, TransferState.TERMINATED],
    [TransferState.TERMINATED]: [],
    [TransferState.COMPLETED]: [],
    [TransferState.SUSPENDED]: [TransferState.STARTED]
  }
  private readonly allowedRemoteTransitions: Record<TransferRole, Record<TransferState, TransferState[]>> = {
    [TransferRole.PROVIDER]: this.providerTransitions,
    [TransferRole.CONSUMER]: this.consumerTransitions
  }
  private readonly allowedInternalTransitions: Record<TransferRole, Record<TransferState, TransferState[]>> = {
    [TransferRole.PROVIDER]: this.consumerTransitions,
    [TransferRole.CONSUMER]: this.providerTransitions
  }

  async getTransfer(processId: string): Promise<TransferStatus | undefined> {
    return this.transfers.find(transfer => transfer.internalId === processId);
  }

  async initiateTransferProcess(requestDetail: TransferRequestMessage, remoteAddress: string): Promise<{internalId: string, message: TransferRequestMessage}> {
    const internalId = `urn:uuid:${crypto.randomUUID()}`;
    
    const transferRequestMessage = new TransferRequestMessage(requestDetail);
    const dataPlaneTransfer = await this.dataPlaneService.requestTransfer(transferRequestMessage, "consumer");
    const requestTransfer = await this.dsp.requestTransfer(remoteAddress, transferRequestMessage);
    const transferProcess = await deserialize<TransferProcess>(requestTransfer);
    this.transfers.push({
      internalId: internalId,
      remoteId: transferProcess.processId,
      role: TransferRole.CONSUMER,
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
      internalId,
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
      internalId: transferProcess.processId,
      remoteId: transferProcess.processId,
      role: TransferRole.PROVIDER,
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

    if (!this.allowedInternalTransitions[transfer.role][transfer.state].includes(TransferState.STARTED)) {
      transfer.localEvents.push({
        time: new Date(),
        state: TransferState.STARTED,
        internalMessage: `Transfer with process ID ${processId} cannot transition from ${transfer.state} to dspace:STARTED`
      });
      throw Error(`Transfer with process ID ${processId} cannot transition from ${transfer.state} to dspace:STARTED`);
    }
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

    if (!this.allowedRemoteTransitions[transfer.role][transfer.state].includes(TransferState.STARTED)) {
      transfer.remoteEvents.push({
        time: new Date(),
        state: TransferState.STARTED,
        internalMessage: `Transfer with process ID ${processId} cannot transition from ${transfer.state} to dspace:STARTED`
      });
      throw Error(`Transfer with process ID ${processId} cannot transition from ${transfer.state} to dspace:STARTED`);
    }
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
    if (!this.allowedInternalTransitions[transfer.role][transfer.state].includes(TransferState.COMPLETED)) {
      transfer.localEvents.push({
        time: new Date(),
        state: TransferState.COMPLETED,
        internalMessage: `Transfer with process ID ${processId} cannot transition from ${transfer.state} to dspace:COMPLETED`
      });
      throw Error(`Transfer with process ID ${processId} cannot transition from ${transfer.state} to dspace:COMPLETED`);
    }
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
    if (!this.allowedRemoteTransitions[transfer.role][transfer.state].includes(TransferState.COMPLETED)) {
      transfer.remoteEvents.push({
        time: new Date(),
        state: TransferState.COMPLETED,
        internalMessage: `Transfer with process ID ${processId} cannot transition from ${transfer.state} to dspace:COMPLETED`
      });
      throw Error(`Transfer with process ID ${processId} cannot transition from ${transfer.state} to dspace:COMPLETED`);
    }
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
    if (!this.allowedInternalTransitions[transfer.role][transfer.state].includes(TransferState.SUSPENDED)) {
      transfer.localEvents.push({
        time: new Date(),
        state: TransferState.SUSPENDED,
        reason: transferSuspensionMessage.reason,
        internalMessage: `Transfer with process ID ${processId} cannot transition from ${transfer.state} to dspace:SUSPENDED`
      });
      throw Error(`Transfer with process ID ${processId} cannot transition from ${transfer.state} to dspace:SUSPENDED`);
    }
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
    if (!this.allowedRemoteTransitions[transfer.role][transfer.state].includes(TransferState.SUSPENDED)) {
      transfer.remoteEvents.push({
        time: new Date(),
        state: TransferState.SUSPENDED,
        reason: transferSuspensionMessage.reason,
        internalMessage: `Transfer with process ID ${processId} cannot transition from ${transfer.state} to dspace:SUSPENDED`
      });
      throw Error(`Transfer with process ID ${processId} cannot transition from ${transfer.state} to dspace:SUSPENDED`);
    }
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