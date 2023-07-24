import { Injectable } from "@nestjs/common";
import { TransferCompletionMessage, TransferProcess, TransferRequestMessage, TransferStartMessage, TransferSuspensionMessage, TransferTerminationMessage } from "../model/dsp/transfer/messages";
import { TransferState } from "../model/dsp/transfer/messages.dto";
import { Multilanguage, URI } from "../model/dsp/common";
import crypto from "crypto";

interface TransferProviderStatus {
  agreementId: string,
  format: string,
  dataAddress?: URI,
  callbackAddress?: string,
  process: TransferProcess,
  suspended?: Multilanguage[],
  terminated?: {
    code?: string,
    reason: Multilanguage[]
  }
}

@Injectable()
export class TransferProviderService {
  private readonly transfers: TransferProviderStatus[] = []

  async getTransfer(processId: string): Promise<TransferProviderStatus | undefined> {
    return this.transfers.find(transfer => transfer.process.processId === processId);
  }

  async request(transferRequestMessage: TransferRequestMessage): Promise<TransferProcess> {
    const transferProcess = new TransferProcess({
      processId: `urn:uuid:${crypto.randomUUID()}`,
      transferState: TransferState.STARTED
    })
    this.transfers.push({
      agreementId: transferRequestMessage.agreementId,
      format: transferRequestMessage.format,
      dataAddress: transferRequestMessage.dataAddress,
      callbackAddress: transferRequestMessage.callbackAddress,
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
    transfer.suspended = transferSuspensionMessage.reason;
    transfer.process.transferState = TransferState.SUSPENDED;
    return {
      status: 'OK'
    }
  }
}