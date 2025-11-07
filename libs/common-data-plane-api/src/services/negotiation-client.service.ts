import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { AuthClientService, parseNetworkError } from "@tsg-dsp/common-api";
import {
  AgreementDto,
  DatasetDto,
  defaultContext,
  OfferDto,
  PolicyDto
} from "@tsg-dsp/common-dsp";
import { NegotiationDetailDto } from "@tsg-dsp/common-dtos";
import { AxiosInstance } from "axios";

import { ControlPlaneConfig } from "../config/control-plane-config.js";
import { DataPlaneClientError, DataPlaneError } from "../errors/errors.js";
import { resolveControlPlaneServiceUrl } from "../utils/didServiceResolver.js";

/**
 * Service for negotiation and agreement operations with the control plane
 */
@Injectable()
export class NegotiationClientService {
  protected readonly logger = new Logger(this.constructor.name);
  protected readonly axiosManagement: AxiosInstance;

  constructor(
    protected readonly authClient: AuthClientService,
    protected readonly controlPlaneConfig: ControlPlaneConfig
  ) {
    this.axiosManagement = authClient.axiosInstance({
      baseURL: controlPlaneConfig.managementEndpoint
    });
  }

  /**
   * Get an agreement by ID
   * @param agreementId - Agreement identifier
   */
  async getAgreement(agreementId: string): Promise<AgreementDto> {
    try {
      const response = await this.axiosManagement.get<AgreementDto>(
        `/agreements/${agreementId}`
      );
      this.logger.debug(`Retrieved agreement ${agreementId}`);
      return response.data;
    } catch (error) {
      throw parseNetworkError(error, `fetching agreement ${agreementId}`);
    }
  }

  /**
   * Get a negotiation by process ID
   * @param processId - Negotiation process identifier
   */
  async getNegotiation(processId: string): Promise<NegotiationDetailDto> {
    try {
      const response = await this.axiosManagement.get<NegotiationDetailDto>(
        `/negotiations/${processId}`
      );
      this.logger.debug(`Retrieved negotiation ${processId}`);
      return response.data;
    } catch (error) {
      throw parseNetworkError(error, `fetching negotiation ${processId}`);
    }
  }

  /**
   * Get negotiation for a specific dataset and participant
   * @param datasetId - Dataset identifier
   * @param participantId - Participant DID
   */
  async getNegotiationForDataset(
    datasetId: string,
    participantId: string
  ): Promise<NegotiationDetailDto> {
    try {
      const response = await this.axiosManagement.get<NegotiationDetailDto>(
        `negotiations/dataset/${datasetId}`,
        {
          params: {
            remoteParty: participantId
          }
        }
      );
      this.logger.debug(
        `Retrieved negotiation for dataset ${datasetId} with participant ${participantId}`
      );
      return response.data;
    } catch (error) {
      throw parseNetworkError(
        error,
        `fetching negotiation for dataset ${datasetId} with participant ${participantId}`
      );
    }
  }

  /**
   * Wait for a negotiation to be created (with retries)
   * @param datasetId - Dataset identifier
   * @param participantId - Participant DID
   * @param retries - Number of retries (default: 20)
   * @param retryDelayMs - Delay between retries in milliseconds (default: 1000)
   */
  async waitForNegotiation(
    datasetId: string,
    participantId: string,
    retries = 20,
    retryDelayMs = 1000
  ): Promise<NegotiationDetailDto> {
    try {
      const negotiation = await this.getNegotiationForDataset(
        datasetId,
        participantId
      );
      return negotiation;
    } catch (_error) {
      if (retries <= 0) {
        const error = new DataPlaneError(
          `Negotiation for dataset ${datasetId} with participant ${participantId} not found after ${(retryDelayMs * 20) / 1000} seconds`,
          HttpStatus.NOT_FOUND
        );
        this.logger.error(error.message);
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      return this.waitForNegotiation(
        datasetId,
        participantId,
        retries - 1,
        retryDelayMs
      );
    }
  }

  /**
   * Request a new negotiation for a dataset
   * @param policy - Policy to use for the offer
   * @param datasetId - Dataset identifier
   * @param participantId - Participant DID
   * @param remoteAddress - Remote control plane address
   */
  async requestNegotiation(
    policy: PolicyDto | undefined,
    datasetId: string,
    participantId: string,
    remoteAddress: string
  ): Promise<NegotiationDetailDto> {
    if (!policy) {
      throw new DataPlaneError(
        `No policy provided for dataset ${datasetId} with participant ${participantId}`,
        HttpStatus.BAD_REQUEST
      );
    }
    try {
      const offer = {
        ...policy,
        "@context": defaultContext()
      };
      await this.axiosManagement.post<NegotiationDetailDto>(
        "negotiations/request",
        offer,
        {
          params: {
            dataSet: datasetId,
            audience: participantId,
            address: remoteAddress
          }
        }
      );
      this.logger.log(
        `Requested negotiation for dataset ${datasetId} with participant ${participantId}`
      );
      return await this.waitForNegotiation(datasetId, participantId);
    } catch (error) {
      throw parseNetworkError(
        error,
        `Error obtaining negotiation for dataset ${datasetId} with participant ${participantId}`
      );
    }
  }

  /**
   * Request a new negotiation for a dataset using the default policy in a dataset
   * @param datasetId - Dataset identifier
   * @param participantId - Participant DID
   * @param remoteAddress - Remote control plane address
   * @param datasetFetcher - Function to fetch the dataset
   */
  async requestDefaultNegotiation(
    datasetId: string,
    participantId: string,
    remoteAddress: string | undefined,
    datasetFetcher: () => Promise<DatasetDto>
  ): Promise<NegotiationDetailDto> {
    const dataset = await datasetFetcher();
    if (!dataset.hasPolicy || dataset.hasPolicy.length === 0) {
      throw new DataPlaneClientError(
        `Dataset ${datasetId} does not have a policy defined`,
        HttpStatus.BAD_REQUEST
      );
    }
    const offer = dataset.hasPolicy?.[0] as OfferDto;
    if (offer) {
      offer["@context"] = defaultContext();
    }
    return this.requestNegotiation(
      offer,
      datasetId,
      participantId,
      remoteAddress ?? (await resolveControlPlaneServiceUrl(participantId))
    );
  }
}
