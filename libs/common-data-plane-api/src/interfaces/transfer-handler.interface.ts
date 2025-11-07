import {
  DataPlaneRequestResponseDto,
  TransferCompletionMessageDto,
  TransferRequestMessageDto,
  TransferStartMessageDto,
  TransferSuspensionMessageDto,
  TransferTerminationMessageDto
} from "@tsg-dsp/common-dsp";

export const ITransferHandler = Symbol("ITransferHandler");

/**
 * Interface that transfer handler services must implement
 * This allows the shared TransferController to work with different implementations
 */
export interface ITransferHandler {
  /**
   * Handle a transfer request from the control plane
   */
  handleTransferRequest(
    transferRequestMessage: TransferRequestMessageDto,
    role: "provider" | "consumer",
    processId: string,
    remoteParty: string,
    datasetId: string
  ): Promise<DataPlaneRequestResponseDto>;

  /**
   * Handle transfer start message
   */
  handleTransferStart(
    transferStartMessage: TransferStartMessageDto,
    processId: string
  ): Promise<void>;

  /**
   * Handle transfer completion message
   */
  handleTransferComplete(
    transferCompletionMessage: TransferCompletionMessageDto,
    processId: string
  ): Promise<void>;

  /**
   * Handle transfer termination message
   */
  handleTransferTerminate(
    transferTerminationMessage: TransferTerminationMessageDto,
    processId: string
  ): Promise<void>;

  /**
   * Handle transfer suspension message
   */
  handleTransferSuspend(
    transferSuspensionMessage: TransferSuspensionMessageDto,
    processId: string
  ): Promise<void>;
}
