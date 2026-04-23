import {
  DataPlaneAddressDto,
  TransferDetailDto,
  TransferProcess,
  TransferProcessDto
} from "@tsg-dsp/common-dsp";

import type { ControlPlaneClient } from "../client.js";
import type { PollingOptions } from "../utils/polling.js";
import { pollUntil } from "../utils/polling.js";
import {
  validateJsonLD,
  validateResponse,
  validateResponseArray
} from "../utils/validate.js";

/**
 * Request, monitor, and control Dataspace Protocol data transfer processes.
 *
 * A transfer process follows the DSP state machine:
 * `REQUESTED → STARTED → COMPLETED` (or `SUSPENDED` / `TERMINATED`).
 *
 * This module provides methods to:
 * - Initiate transfers under an existing contract agreement.
 * - Start, complete, suspend, or terminate transfers.
 * - Poll for state transitions (e.g. wait until a transfer has started).
 * @example
 * ```ts
 * const transfer = await sdk.transfers.transferAndWaitForStart(
 *   agreementId,
 *   participantId,
 *   remoteAddress,
 *   "application/json",
 *   "http-data-plane",
 * );
 * console.log(transfer.state); // "STARTED"
 * ```
 */
export class TransferSdk {
  constructor(private readonly client: ControlPlaneClient) {}

  /**
   * List all transfer processes known to the control plane.
   * @returns An array of validated {@link TransferDetailDto} instances.
   */
  async listTransfers() {
    const { data } = await this.client.GET("/management/transfers");
    return validateResponseArray(TransferDetailDto, data ?? []);
  }

  /**
   * Initiate a new data transfer under an existing contract agreement.
   * @param agreementId - The agreement ID that authorizes this transfer.
   * @param participantId - The remote participant's ID (DID), used as audience.
   * @param remoteAddress - The remote participant's DSP protocol endpoint.
   * @param format - The desired transfer format (e.g. `"application/json"`).
   * @param dataPlaneIdentifier - Identifier of the data plane to route the transfer through.
   * @param returnDto - When `true`, returns the raw {@link TransferProcessDto}.
   * @returns The created {@link TransferProcess} (or raw DTO).
   * @throws Throws an {@link SdkError} with code {@link SdkErrorCode.REQUEST_FAILED} if the request is rejected.
   */
  async requestTransfer(
    agreementId: string,
    participantId: string,
    remoteAddress: string,
    format: string,
    dataPlaneIdentifier: string,
    returnDto: true
  ): Promise<TransferProcessDto>;
  async requestTransfer(
    agreementId: string,
    participantId: string,
    remoteAddress: string,
    format: string,
    dataPlaneIdentifier: string,
    returnDto?: false
  ): Promise<TransferProcess>;
  async requestTransfer(
    agreementId: string,
    participantId: string,
    remoteAddress: string,
    format: string,
    dataPlaneIdentifier: string,
    returnDto: boolean = false
  ) {
    // The spec uses a 'default' response (not 200), causing openapi-fetch to type
    // data as never. At runtime the response is parsed correctly — cast to fix.
    const { data } = await this.client.POST("/management/transfers/request", {
      params: {
        query: {
          agreementId,
          audience: participantId,
          address: remoteAddress,
          format,
          dataPlaneIdentifier
        }
      }
    });
    return validateJsonLD<TransferProcess>(data, returnDto);
  }

  /**
   * Get the details of a transfer process by its process ID.
   * @param processId - The unique transfer process ID.
   * @returns A validated {@link TransferDetailDto}.
   * @throws Throws an {@link SdkError} with code {@link SdkErrorCode.NOT_FOUND} if the transfer does not exist.
   */
  async getTransfer(processId: string) {
    const { data } = await this.client.GET(
      "/management/transfers/{processId}",
      {
        params: { path: { processId } }
      }
    );
    return validateResponse(TransferDetailDto, data!);
  }

  /**
   * Start a transfer process (provider-side).
   *
   * Transitions the transfer from `REQUESTED` to `STARTED`.
   * @param processId - The transfer process ID.
   * @param dataAddress - Optional data plane address to use for the transfer.
   * @returns The start response.
   */
  async startTransfer(processId: string, dataAddress?: DataPlaneAddressDto) {
    const { data } = await this.client.POST(
      "/management/transfers/{processId}/start",
      {
        params: { path: { processId } },
        body: dataAddress
      }
    );
    return data!;
  }

  /**
   * Mark a transfer process as completed.
   * @param processId - The transfer process ID.
   * @returns The completion response.
   */
  async completeTransfer(processId: string) {
    const { data } = await this.client.POST(
      "/management/transfers/{processId}/completion",
      {
        params: { path: { processId } }
      }
    );
    return data!;
  }

  /**
   * Terminate a transfer process.
   * @param processId - The transfer process ID.
   * @param code - Optional machine-readable termination reason code.
   * @param reason - Optional human-readable termination reason.
   * @returns The termination response.
   */
  async terminateTransfer(processId: string, code?: string, reason?: string) {
    const { data } = await this.client.POST(
      "/management/transfers/{processId}/termination",
      {
        params: { path: { processId } },
        body: { code, reason }
      }
    );
    return data!;
  }

  /**
   * Suspend a transfer process.
   *
   * A suspended transfer can later be resumed or terminated.
   * @param processId - The transfer process ID.
   * @param reason - Optional human-readable suspension reason.
   * @returns The suspension response.
   */
  async suspendTransfer(processId: string, reason?: string) {
    const { data } = await this.client.POST(
      "/management/transfers/{processId}/suspension",
      {
        params: { path: { processId } },
        body: { reason }
      }
    );
    return data!;
  }

  /**
   * Poll until a transfer reaches the given target state.
   * @param processId - The transfer process ID.
   * @param targetState - The desired state (e.g. `"STARTED"`, `"COMPLETED"`).
   * @param options - Polling interval and retry configuration.
   * @returns The {@link TransferDetailDto} once the target state is reached.
   * @throws Throws an {@link SdkError} with code {@link SdkErrorCode.POLLING_TIMEOUT} if the state is not reached within the configured retries.
   */
  async waitForState(
    processId: string,
    targetState: TransferDetailDto["state"],
    options?: PollingOptions
  ) {
    return pollUntil(
      () => this.getTransfer(processId),
      (transfer) => transfer.state === targetState,
      options
    );
  }

  /**
   * Poll until a transfer reaches the `STARTED` state.
   *
   * Shorthand for `waitForState(processId, "STARTED", options)`.
   * @param processId - The transfer process ID.
   * @param options - Polling interval and retry configuration.
   * @returns The {@link TransferDetailDto} with `state === "STARTED"`.
   * @throws Throws an {@link SdkError} with code {@link SdkErrorCode.POLLING_TIMEOUT} if the state is not reached in time.
   */
  async waitForStart(processId: string, options?: PollingOptions) {
    return pollUntil(
      () => this.getTransfer(processId),
      (transfer) => transfer.state === "STARTED",
      options
    );
  }

  /**
   * Poll until a transfer reaches the `COMPLETED` state.
   *
   * Shorthand for `waitForState(processId, "COMPLETED", options)`.
   * @param processId - The transfer process ID.
   * @param options - Polling interval and retry configuration.
   * @returns The {@link TransferDetailDto} with `state === "COMPLETED"`.
   * @throws Throws an {@link SdkError} with code {@link SdkErrorCode.POLLING_TIMEOUT} if the state is not reached in time.
   */
  async waitForCompletion(processId: string, options?: PollingOptions) {
    return pollUntil(
      () => this.getTransfer(processId),
      (transfer) => transfer.state === "COMPLETED",
      options
    );
  }

  /**
   * Initiate a transfer and wait for it to start in one call.
   *
   * Combines {@link requestTransfer} and {@link waitForStart}.
   * @param agreementId - The agreement ID that authorizes this transfer.
   * @param participantId - The remote participant's ID (DID).
   * @param remoteAddress - The remote participant's DSP protocol endpoint.
   * @param format - The desired transfer format.
   * @param dataPlaneIdentifier - Identifier of the data plane to route through.
   * @param pollingOptions - Optional polling configuration.
   * @returns The {@link TransferDetailDto} once the transfer has started.
   * @throws Throws an {@link SdkError} with code {@link SdkErrorCode.POLLING_TIMEOUT} if the transfer does not start in time.
   */
  async transferAndWaitForStart(
    agreementId: string,
    participantId: string,
    remoteAddress: string,
    format: string,
    dataPlaneIdentifier: string,
    pollingOptions?: PollingOptions
  ) {
    const transfer = await this.requestTransfer(
      agreementId,
      participantId,
      remoteAddress,
      format,
      dataPlaneIdentifier
    );
    return this.waitForStart(transfer.consumerPid, pollingOptions);
  }
}
