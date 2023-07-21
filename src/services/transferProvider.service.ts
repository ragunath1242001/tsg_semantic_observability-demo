import { Injectable } from "@nestjs/common";
import { TransferCompletionMessage, TransferProcess, TransferRequestMessage, TransferStartMessage, TransferSuspensionMessage, TransferTerminationMessage } from "../model/dsp/transfer/messages";
import { TransferState } from "../model/dsp/transfer/messages.schema";

@Injectable()
export class TransferProviderService {
  async request(transferRequestMessage: TransferRequestMessage): Promise<TransferProcess> {
    return new TransferProcess({
      processId: 'urn:uuid:9d1793cd-bc1b-44a6-a3e8-4e3850bdd9f6',
      transferState: TransferState.REQUESTED
    })
  }

  async getTransferProcess(processId: string): Promise<TransferProcess | undefined> {
    if (processId === 'urn:uuid:9d1793cd-bc1b-44a6-a3e8-4e3850bdd9f6') {
      return new TransferProcess({
        processId: 'urn:uuid:9d1793cd-bc1b-44a6-a3e8-4e3850bdd9f6',
        transferState: TransferState.REQUESTED
      })
    } else {
      return undefined;
    }
  }

  async startTransferProcess(processId: string, transferStartMessage: TransferStartMessage): Promise<{status: string} | undefined> {
    if (processId === 'urn:uuid:9d1793cd-bc1b-44a6-a3e8-4e3850bdd9f6') {
      return {
        status: 'OK'
      }
    } else {
      return undefined;
    }
  }
  async completeTransferProcess(processId: string, transferCompletionMessage: TransferCompletionMessage): Promise<{status: string} | undefined> {
    if (processId === 'urn:uuid:9d1793cd-bc1b-44a6-a3e8-4e3850bdd9f6') {
      return {
        status: 'OK'
      }
    } else {
      return undefined;
    }
  }
  async terminateTransferProcess(processId: string, transferTerminateMessage: TransferTerminationMessage): Promise<{status: string} | undefined> {
    if (processId === 'urn:uuid:9d1793cd-bc1b-44a6-a3e8-4e3850bdd9f6') {
      return {
        status: 'OK'
      }
    } else {
      return undefined;
    }
  }
  async suspendTransferProcess(processId: string, transferSuspensionMessage: TransferSuspensionMessage): Promise<{status: string} | undefined> {
    if (processId === 'urn:uuid:9d1793cd-bc1b-44a6-a3e8-4e3850bdd9f6') {
      return {
        status: 'OK'
      }
    } else {
      return undefined;
    }
  }
}