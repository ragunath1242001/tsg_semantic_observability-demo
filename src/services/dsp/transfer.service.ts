import { HttpStatus, Injectable, Logger } from "@nestjs/common"
import { DataPlaneAddressDto, DataPlaneTransferDto } from "../../model/data-planes/dataPlanes.dto"
import { Multilanguage } from "../../model/dsp/common"
import { DataAddress, EndpointProperty, TransferCompletionMessage, TransferProcess, TransferRequestMessage, TransferStartMessage, TransferSuspensionMessage, TransferTerminationMessage } from "../../model/dsp/transfer/messages"
import { TransferState } from "../../model/dsp/transfer/messages.dto"
import { DataPlaneService } from "../dataPlane.service"
import crypto from "crypto"
import { DspClientService } from "./client.service"
import { deserialize } from "../../model/serialize"
import { DSPError } from "../../utils/errors/error"
import { ServerConfig } from "../../config"


export type TransferRole = "provider" | "consumer";

export interface TransferEvent {
  time: Date,
  state: TransferState,
  localMessage?: string,
  code?: string,
  reason?: Multilanguage[]
}

export interface TransferStatus {
  localId: string,
  remoteId: string,
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
  constructor(private readonly dataPlaneService: DataPlaneService, private readonly dsp: DspClientService, private readonly server: ServerConfig) {}
  private readonly transfers: TransferStatus[] = []
  private readonly logger = new Logger(this.constructor.name);

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
      throw new DSPError(`Transfer with process ID ${transfer.localId} cannot transition from ${transfer.state} to ${to}`, HttpStatus.BAD_REQUEST);
    }
  }

  async getTransfers(): Promise<TransferStatus[]> {
    return this.transfers;
  }

  async getTransfer(processId: string): Promise<TransferStatus | undefined> {
    return this.transfers.find(transfer => transfer.localId === processId);
  }

  async initiateTransferProcess(agreementId: string, format: string, dataAddress: DataAddress | undefined, remoteAddress: string): Promise<{localId: string, message: TransferRequestMessage, process: TransferProcess}> {
    const localId = `urn:uuid:consumer:${crypto.randomUUID()}`;
    
    const transferRequestMessage = new TransferRequestMessage({
      agreementId: agreementId,
      format: format,
      dataAddress: dataAddress,
      callbackAddress: `${this.server.publicAddress}/transfer/${localId}`
    });
    const dataPlaneTransfer = await this.dataPlaneService.requestTransfer(transferRequestMessage, localId, "consumer");
    const requestTransfer = await this.dsp.requestTransfer(`${remoteAddress}/request`, transferRequestMessage);
    const transferProcess = await deserialize<TransferProcess>(requestTransfer);
    if (dataAddress === undefined && dataPlaneTransfer.dataAddress !== undefined) {
      dataAddress = new DataAddress({
        endpointType: dataPlaneTransfer.endpointType,
        endpoint: dataPlaneTransfer.dataAddress?.endpoint || '',
        endpointProperties: dataPlaneTransfer.dataAddress?.properties?.map(p => new EndpointProperty(p)) || []
      })
    }

    this.transfers.push({
      localId: localId,
      remoteId: transferProcess.processId,
      role: "consumer",
      remoteAddress: `${remoteAddress}/${transferProcess.processId}`,
      state: TransferState.REQUESTED,
      agreementId: agreementId,
      format: format,
      dataAddress: dataAddress,
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
      message: transferRequestMessage,
      process: transferProcess
    };
  }

  async handleRequest(transferRequestMessage: TransferRequestMessage): Promise<TransferProcess> {
    const transferProcess = new TransferProcess({
      processId: `urn:uuid:provider:${crypto.randomUUID()}`,
      transferState: TransferState.STARTED
    })
    const dataPlaneTransfer = await this.dataPlaneService.requestTransfer(transferRequestMessage, transferProcess.processId, "provider");
    const transfer: TransferStatus = {
      localId: transferProcess.processId,
      remoteId: transferRequestMessage.callbackAddress.split("/").slice(-1)[0],
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
    }
    this.transfers.push(transfer);
    if (dataPlaneTransfer.dataAddress) {
      setTimeout(() => {
        this.start(transferProcess.processId, dataPlaneTransfer.dataAddress, false);
      }, 2000);
    }
    return transferProcess;
  }

  async start(processId: string, dataPlaneAddress: DataPlaneAddressDto | undefined, fromDataPlane: boolean): Promise<{status: string}> {
    const transfer = await this.getTransfer(processId);
    if (transfer === undefined) {
      throw new DSPError(`Transfer with process ID ${processId} not found`, HttpStatus.NOT_FOUND);
    }
    let dataAddress: DataAddress | undefined;
    if (dataPlaneAddress) {
      dataAddress = new DataAddress({
        endpoint: dataPlaneAddress.endpoint,
        endpointType: transfer.dataPlaneTransfer.endpointType,
        endpointProperties: dataPlaneAddress.properties.map(p => new EndpointProperty(p))
      });
    }
    const transferStartMessage = new TransferStartMessage({
      processId: transfer.remoteId,
      dataAddress: dataAddress
    })
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


  async handleStart(processId: string, transferStartMessage: TransferStartMessage): Promise<{status: string}> {
    const transfer = await this.getTransfer(processId);
    if (transfer === undefined) {
      throw new DSPError(`Transfer with process ID ${processId} not found`, HttpStatus.NOT_FOUND);
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

  async complete(processId: string, fromDataPlane: boolean): Promise<{status: string}> {
    const transfer = await this.getTransfer(processId);
    if (transfer === undefined) {
      throw new DSPError(`Transfer with process ID ${processId} not found`, HttpStatus.NOT_FOUND);
    }
    this.checkTransition("local", transfer, TransferState.COMPLETED);
    transfer.localEvents.push({
      time: new Date(),
      state: TransferState.COMPLETED
    });
    const transferCompletionMessage = new TransferCompletionMessage({
      processId: transfer.remoteId
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
  
  async handleComplete(processId: string, transferCompletionMessage: TransferCompletionMessage): Promise<{status: string}> {
    const transfer = await this.getTransfer(processId);
    if (transfer === undefined) {
      throw new DSPError(`Transfer with process ID ${processId} not found`, HttpStatus.NOT_FOUND);
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
  
  async terminate(processId: string, code: string, reason: string, fromDataPlane: boolean): Promise<{status: string}> {
    const transfer = await this.getTransfer(processId);
    if (transfer === undefined) {
      throw new DSPError(`Transfer with process ID ${processId} not found`, HttpStatus.NOT_FOUND);
    }
    this.checkTransition("local", transfer, TransferState.TERMINATED);
    const transferTerminationMessage = new TransferTerminationMessage({
      processId: transfer.remoteId,
      code: code,
      reason: [new Multilanguage(reason)]
    });
    transfer.localEvents.push({
      time: new Date(),
      state: TransferState.TERMINATED,
      code: code,
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
  
  async handleTerminate(processId: string, transferTerminationMessage: TransferTerminationMessage): Promise<{status: string}> {
    const transfer = await this.getTransfer(processId);
    if (transfer === undefined) {
      throw new DSPError(`Transfer with process ID ${processId} not found`, HttpStatus.NOT_FOUND);
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

  async suspend(processId: string, reason: string, fromDataPlane: boolean): Promise<{status: string}> {
    const transfer = await this.getTransfer(processId);
    if (transfer === undefined) {
      throw new DSPError(`Transfer with process ID ${processId} not found`, HttpStatus.NOT_FOUND);
    }
    this.checkTransition("local", transfer, TransferState.SUSPENDED);
    const transferSuspensionMessage = new TransferSuspensionMessage({
      processId: transfer.remoteId,
      reason: [new Multilanguage(reason)]
    })
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

  async handleSuspend(processId: string, transferSuspensionMessage: TransferSuspensionMessage): Promise<{status: string}> {
    const transfer = await this.getTransfer(processId);
    if (transfer === undefined) {
      throw new DSPError(`Transfer with process ID ${processId} not found`, HttpStatus.NOT_FOUND);
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