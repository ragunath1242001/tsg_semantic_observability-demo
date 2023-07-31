import { Injectable } from "@nestjs/common";
import { ITransferRequestMessage, TransferCompletionMessage, TransferProcess, TransferRequestMessage, TransferStartMessage, TransferSuspensionMessage, TransferTerminationMessage } from "../../model/dsp/transfer/messages";
import { Multilanguage, URI } from "../../model/dsp/common";
import crypto from "crypto";
import { TransferState } from "../../model/dsp/transfer/messages.dto";
import { DataPlaneDetailsDto } from "../../model/data-planes/dataPlanes.dto";

interface TransferConsumerStatus {
  internalId: string,
  state: TransferState,
  agreementId: string,
  format: string,
  dataAddress?: URI,
  callbackAddress?: string,
  suspended?: Multilanguage[],
  terminated?: {
    code?: string,
    reason: Multilanguage[]
  }
}

@Injectable()
export class TransferConsumerService {
  private readonly transfers: TransferConsumerStatus[] = []

  async getTransfer(processId: string): Promise<TransferConsumerStatus | undefined> {
    return this.transfers.find(transfer => transfer.internalId === processId);
  }

  async initiateTransferProcess(requestDetail: ITransferRequestMessage): Promise<{internalId: string, message: TransferRequestMessage}> {
    const internalId = `urn:uuid:${crypto.randomUUID()}`;
    
    const transferRequestMessage = new TransferRequestMessage({
      ...requestDetail,
      callbackAddress: `http://localhost/transfer/callback/${internalId}`
    });
    this.transfers.push({
      internalId,
      state: TransferState.REQUESTED,
      agreementId: requestDetail.agreementId,
      format: requestDetail.format,
      dataAddress: requestDetail.dataAddress,
      callbackAddress: `http://localhost/transfer/callback/${internalId}`,
    });
    return {
      internalId,
      message: transferRequestMessage
    };
  }

  async startTransferProcess(processId: string, transferStartMessage: TransferStartMessage): Promise<{status: string} | undefined> {
    const transfer = await this.getTransfer(processId);
    if (transfer === undefined) {
      return undefined;
    }
    if (transfer.state !== TransferState.SUSPENDED && transfer.state !== TransferState.REQUESTED) {
      throw Error(`Transfer with process ID ${processId} cannot transition from ${transfer.state} to dspace:STARTED`);
    }
    transfer.state = TransferState.STARTED;
    return {
      status: 'OK'
    }
  }
  async completeTransferProcess(processId: string, transferCompletionMessage: TransferCompletionMessage): Promise<{status: string} | undefined> {
    const transfer = await this.getTransfer(processId);
    if (transfer === undefined) {
      return undefined;
    }
    if (transfer.state !== TransferState.STARTED) {
      throw Error(`Transfer with process ID ${processId} cannot transition from ${transfer.state} to dspace:COMPLETED`);
    }
    transfer.state = TransferState.COMPLETED;
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
    transfer.state = TransferState.TERMINATED;
    return {
      status: 'OK'
    }
  }
  async suspendTransferProcess(processId: string, transferSuspensionMessage: TransferSuspensionMessage): Promise<{status: string} | undefined> {
    const transfer = await this.getTransfer(processId);
    if (transfer === undefined) {
      return undefined;
    }
    if (transfer.state !== TransferState.STARTED) {
      throw Error(`Transfer with process ID ${processId} cannot transition from ${transfer.state} to dspace:SUSPENDED`);
    }
    transfer.suspended = transferSuspensionMessage.reason;
    transfer.state = TransferState.SUSPENDED;
    return {
      status: 'OK'
    }
  }
}