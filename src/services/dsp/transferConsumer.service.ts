import { Injectable } from "@nestjs/common";
import { DataAddress, TransferCompletionMessage, TransferRequestMessage, TransferStartMessage, TransferSuspensionMessage, TransferTerminationMessage } from "../../model/dsp/transfer/messages";
import { Multilanguage } from "../../model/dsp/common";
import crypto from "crypto";
import { TransferState } from "../../model/dsp/transfer/messages.dto";
import { DataPlaneService } from "../dataPlane.service";
import { DataPlaneTransferDto } from "../../model/data-planes/dataPlanes.dto";

interface TransferConsumerStatus {
  internalId: string,
  state: TransferState,
  agreementId: string,
  format: string,
  dataPlaneTransfer: DataPlaneTransferDto,
  dataAddress?: DataAddress,
  suspended?: Multilanguage[],
  terminated?: {
    code?: string,
    reason: Multilanguage[]
  }
}

@Injectable()
export class TransferConsumerService {
  constructor(private readonly dataPlaneService: DataPlaneService) {}
  private readonly transfers: TransferConsumerStatus[] = []

  async getTransfer(processId: string): Promise<TransferConsumerStatus | undefined> {
    return this.transfers.find(transfer => transfer.internalId === processId);
  }

  async initiateTransferProcess(requestDetail: TransferRequestMessage): Promise<{internalId: string, message: TransferRequestMessage}> {
    const internalId = `urn:uuid:${crypto.randomUUID()}`;
    
    const transferRequestMessage = new TransferRequestMessage(requestDetail);
    const dataPlaneTransfer = await this.dataPlaneService.requestTransfer(transferRequestMessage, "consumer");
    this.transfers.push({
      internalId,
      state: TransferState.REQUESTED,
      agreementId: requestDetail.agreementId,
      format: requestDetail.format,
      dataAddress: requestDetail.dataAddress,
      dataPlaneTransfer: dataPlaneTransfer,
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
    await this.dataPlaneService.startTransfer(transfer.dataPlaneTransfer, transferStartMessage)

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
    await this.dataPlaneService.completeTransfer(transfer.dataPlaneTransfer, transferCompletionMessage)

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
    await this.dataPlaneService.terminateTransfer(transfer.dataPlaneTransfer, transferTerminationMessage)

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
    await this.dataPlaneService.suspendTransfer(transfer.dataPlaneTransfer, transferSuspensionMessage)

    transfer.suspended = transferSuspensionMessage.reason;
    transfer.state = TransferState.SUSPENDED;
    return {
      status: 'OK'
    }
  }
}