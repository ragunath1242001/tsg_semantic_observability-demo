import {
  Agreement,
  AgreementDto,
  ContractNegotiation,
  ContractNegotiationDto,
  OfferDto
} from "@tsg-dsp/common-dsp";
import {
  NegotiationDetailDto,
  NegotiationStatusDto
} from "@tsg-dsp/common-dtos";

import type { ControlPlaneClient } from "../client.js";
import type { PollingOptions } from "../utils/polling.js";
import { pollUntil } from "../utils/polling.js";
import {
  validateJsonLD,
  validateResponse,
  validateResponseArray
} from "../utils/validate.js";

/**
 * Manage the full lifecycle of Dataspace Protocol contract negotiations.
 *
 * A contract negotiation follows the DSP state machine:
 * `REQUESTED → OFFERED → AGREED → VERIFIED → FINALIZED` (or `TERMINATED`).
 *
 * This module provides methods to:
 * - Initiate and terminate negotiations.
 * - Poll for state transitions (e.g. wait until an agreement is reached).
 * - Retrieve agreements and negotiation details.
 * @example
 * ```ts
 * // Negotiate and wait for an agreement in one call
 * const negotiation = await sdk.negotiations.negotiateAndWait(
 *   datasetId,
 *   participantId,
 *   remoteAddress,
 *   offer,
 * );
 * console.log(negotiation.agreementId);
 * ```
 */
export class NegotiationSdk {
  constructor(private readonly client: ControlPlaneClient) {}

  /**
   * List all negotiations known to the control plane.
   * @returns An array of validated {@link NegotiationStatusDto} instances.
   */
  async listNegotiations() {
    const { data } = await this.client.GET("/management/negotiations");
    return validateResponseArray(NegotiationStatusDto, data ?? []);
  }

  /**
   * Get the full details of a negotiation by its process ID.
   * @param processId - The unique process ID of the negotiation.
   * @returns A validated {@link NegotiationDetailDto}.
   * @throws Throws an {@link SdkError} with code {@link SdkErrorCode.NOT_FOUND} if the negotiation does not exist.
   */
  async getNegotiation(processId: string) {
    const { data } = await this.client.GET(
      "/management/negotiations/{processId}",
      {
        params: { path: { processId } }
      }
    );
    return validateResponse(NegotiationDetailDto, data!);
  }

  /**
   * Get a contract agreement by its agreement ID.
   * @param agreementId - The unique agreement ID.
   * @param returnDto - When `true`, returns the raw {@link AgreementDto}.
   * @returns The deserialized {@link Agreement} (or raw DTO).
   * @throws Throws an {@link SdkError} with code {@link SdkErrorCode.NOT_FOUND} if the agreement does not exist.
   */
  async getAgreement(
    agreementId: string,
    returnDto: true
  ): Promise<AgreementDto>;
  async getAgreement(
    agreementId: string,
    returnDto?: false
  ): Promise<Agreement>;
  async getAgreement(agreementId: string, returnDto: boolean = false) {
    const { data } = await this.client.GET(
      "/management/agreements/{agreementId}",
      {
        params: { path: { agreementId } }
      }
    );
    return validateJsonLD<Agreement>(data, returnDto);
  }

  /**
   * Get negotiations related to a specific dataset.
   * @param datasetId - The dataset ID to filter on.
   * @param remoteParty - Optional remote participant ID to further filter results.
   * @returns An array of matching {@link NegotiationStatusDto} instances.
   */
  async getNegotiationsForDataset(datasetId: string, remoteParty?: string) {
    const { data } = await this.client.GET(
      "/management/negotiations/dataset/{datasetId}",
      {
        params: { path: { datasetId }, query: { remoteParty } }
      }
    );
    return validateResponseArray(NegotiationStatusDto, data ?? []);
  }

  /**
   * Initiate a new contract negotiation for a dataset.
   * @param datasetId - The ID of the dataset to negotiate for.
   * @param participantId - The remote participant's ID (DID), used as audience.
   * @param remoteAddress - The remote participant's DSP protocol endpoint.
   * @param offer - The policy offer to include in the negotiation request.
   * @param returnDto - When `true`, returns the raw {@link ContractNegotiationDto}.
   * @returns The created {@link ContractNegotiation} (or raw DTO).
   * @throws Throws an {@link SdkError} with code {@link SdkErrorCode.REQUEST_FAILED} if the request is rejected.
   */
  async requestNegotiation(
    datasetId: string,
    participantId: string,
    remoteAddress: string,
    offer: OfferDto,
    returnDto: true
  ): Promise<ContractNegotiationDto>;
  async requestNegotiation(
    datasetId: string,
    participantId: string,
    remoteAddress: string,
    offer: OfferDto,
    returnDto?: false
  ): Promise<ContractNegotiation>;
  async requestNegotiation(
    datasetId: string,
    participantId: string,
    remoteAddress: string,
    offer: OfferDto,
    returnDto: boolean = false
  ) {
    const { data } = await this.client.POST(
      "/management/negotiations/request",
      {
        params: {
          query: {
            dataSet: datasetId,
            address: remoteAddress,
            audience: participantId
          }
        },
        // OfferDto uses OrArray<string> for some fields while the OpenAPI schema
        // uses plain string — cast at the boundary between canonical and generated types.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        body: offer as any
      }
    );
    return validateJsonLD<ContractNegotiation>(data, returnDto);
  }

  /**
   * Terminate an ongoing negotiation.
   * @param processId - The negotiation process ID.
   * @param code - Optional machine-readable termination reason code.
   * @param reason - Optional human-readable termination reason.
   * @returns The termination response.
   */
  async terminateNegotiation(
    processId: string,
    code?: string,
    reason?: string
  ) {
    const { data } = await this.client.POST(
      "/management/negotiations/{processId}/termination",
      {
        params: { path: { processId } },
        body: { code, reason }
      }
    );
    return data!;
  }

  /**
   * Poll until a negotiation reaches the given target state.
   * @param processId - The negotiation process ID.
   * @param targetState - The desired state (e.g. `"FINALIZED"`, `"AGREED"`).
   * @param options - Polling interval and retry configuration.
   * @returns The {@link NegotiationDetailDto} once the target state is reached.
   * @throws Throws an {@link SdkError} with code {@link SdkErrorCode.POLLING_TIMEOUT} if the state is not reached within the configured retries.
   */
  async waitForState(
    processId: string,
    targetState: NegotiationDetailDto["state"],
    options?: PollingOptions
  ) {
    return pollUntil(
      () => this.getNegotiation(processId),
      (negotiation) => negotiation.state === targetState,
      options
    );
  }

  /**
   * Poll until a negotiation reaches the `FINALIZED` state (agreement reached).
   *
   * Shorthand for `waitForState(processId, "FINALIZED", options)`.
   * @param processId - The negotiation process ID.
   * @param options - Polling interval and retry configuration.
   * @returns The {@link NegotiationDetailDto} with `state === "FINALIZED"`.
   * @throws Throws an {@link SdkError} with code {@link SdkErrorCode.POLLING_TIMEOUT} if the agreement is not reached in time.
   */
  async waitForAgreement(processId: string, options?: PollingOptions) {
    return pollUntil(
      () => this.getNegotiation(processId),
      (negotiation) => negotiation.state === "FINALIZED",
      options
    );
  }

  /**
   * Initiate a negotiation and wait for it to be finalized in one call.
   *
   * Combines {@link requestNegotiation} and {@link waitForAgreement}.
   * @param datasetId - The ID of the dataset to negotiate for.
   * @param participantId - The remote participant's ID (DID).
   * @param remoteAddress - The remote participant's DSP protocol endpoint.
   * @param offer - The policy offer to include.
   * @param pollingOptions - Optional polling configuration.
   * @returns The {@link NegotiationDetailDto} once the agreement is reached.
   * @throws Throws an {@link SdkError} with code {@link SdkErrorCode.POLLING_TIMEOUT} if the agreement is not reached in time.
   */
  async negotiateAndWait(
    datasetId: string,
    participantId: string,
    remoteAddress: string,
    offer: OfferDto,
    pollingOptions?: PollingOptions
  ) {
    const negotiation = await this.requestNegotiation(
      datasetId,
      participantId,
      remoteAddress,
      offer
    );
    return this.waitForAgreement(negotiation["@id"]!, pollingOptions);
  }
}
