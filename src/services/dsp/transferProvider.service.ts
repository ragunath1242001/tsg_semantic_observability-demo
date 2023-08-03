import { Injectable } from "@nestjs/common";
import { DataAddress, TransferCompletionMessage, TransferProcess, TransferRequestMessage, TransferStartMessage, TransferSuspensionMessage, TransferTerminationMessage } from "../../model/dsp/transfer/messages";
import { TransferState } from "../../model/dsp/transfer/messages.dto";
import { Multilanguage } from "../../model/dsp/common";
import crypto from "crypto";
import { DataPlaneService } from "../dataPlane.service";
import { DataPlaneTransferDto } from "../../model/data-planes/dataPlanes.dto";

interface TransferProviderStatus {
  agreementId: string,
  format: string,
  dataAddress?: DataAddress,
  dataPlaneTransfer: DataPlaneTransferDto,
  process: TransferProcess,
  suspended?: Multilanguage[],
  terminated?: {
    code?: string,
    reason: Multilanguage[]
  }
}

@Injectable()
export class TransferProviderService {
  constructor(private readonly dataPlaneService: DataPlaneService) {}
  private readonly transfers: TransferProviderStatus[] = []

  async getTransfer(processId: string): Promise<TransferProviderStatus | undefined> {
    return this.transfers.find(transfer => transfer.process.processId === processId);
  }

  async request(transferRequestMessage: TransferRequestMessage): Promise<TransferProcess> {
    const transferProcess = new TransferProcess({
      processId: `urn:uuid:${crypto.randomUUID()}`,
      transferState: TransferState.STARTED
    })
    const dataPlaneTransfer = await this.dataPlaneService.requestTransfer(transferRequestMessage, "provider");
    this.transfers.push({
      agreementId: transferRequestMessage.agreementId,
      format: transferRequestMessage.format,
      dataAddress: transferRequestMessage.dataAddress,
      dataPlaneTransfer: dataPlaneTransfer,
      process: transferProcess
    })
    return transferProcess;
  }

  async getTransferProcess(processId: string): Promise<TransferProcess | undefined> {
    return (await this.getTransfer(processId))?.process
  }

  async startTransferProcess(processId: string, transferStartMessage: TransferStartMessage): Promise<{status: string} | undefined> {
    const transfer = await this.getTransfer(processId);
    if (transfer === undefined) {
      return undefined;
    }
    if (transfer.process.transferState !== TransferState.SUSPENDED) {
      throw Error(`Transfer with process ID ${processId} cannot transition from ${transfer.process.transferState} to dspace:STARTED`);
    }
    await this.dataPlaneService.startTransfer(transfer.dataPlaneTransfer, transferStartMessage)

    transfer.process.transferState = TransferState.STARTED;
    return {
      status: 'OK'
    }
  }
  async completeTransferProcess(processId: string, transferCompletionMessage: TransferCompletionMessage): Promise<{status: string} | undefined> {
    const transfer = await this.getTransfer(processId);
    if (transfer === undefined) {
      return undefined;
    }
    if (transfer.process.transferState !== TransferState.STARTED) {
      throw Error(`Transfer with process ID ${processId} cannot transition from ${transfer.process.transferState} to dspace:COMPLETED`);
    }
    await this.dataPlaneService.completeTransfer(transfer.dataPlaneTransfer, transferCompletionMessage)

    transfer.process.transferState = TransferState.COMPLETED;
    return {
      status: 'OK'
    }
  }
  async terminateTransferProcess(processId: string, transferTerminationMessage: TransferTerminationMessage): Promise<{status: string} | undefined> {
    const transfer = await this.getTransfer(processId);
    if (transfer === undefined) {
      return undefined;
    }
    transfer.terminated = {
      code: transferTerminationMessage.code,
      reason: transferTerminationMessage.reason
    }
    await this.dataPlaneService.terminateTransfer(transfer.dataPlaneTransfer, transferTerminationMessage)

    transfer.process.transferState = TransferState.TERMINATED;
    return {
      status: 'OK'
    }
  }
  async suspendTransferProcess(processId: string, transferSuspensionMessage: TransferSuspensionMessage): Promise<{status: string} | undefined> {
    const transfer = await this.getTransfer(processId);
    if (transfer === undefined) {
      return undefined;
    }
    if (transfer.process.transferState !== TransferState.STARTED) {
      throw Error(`Transfer with process ID ${processId} cannot transition from ${transfer.process.transferState} to dspace:SUSPENDED`);
    }
    await this.dataPlaneService.suspendTransfer(transfer.dataPlaneTransfer, transferSuspensionMessage)

    transfer.suspended = transferSuspensionMessage.reason;
    transfer.process.transferState = TransferState.SUSPENDED;
    return {
      status: 'OK'
    }
  }
}