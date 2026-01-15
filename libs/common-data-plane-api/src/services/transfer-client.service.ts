import { Injectable, Logger } from "@nestjs/common";
import { AuthClientService } from "@tsg-dsp/common-api";
import { TransferProcessDto } from "@tsg-dsp/common-dsp";
import { AxiosInstance } from "axios";

import { ControlPlaneConfig } from "../config/control-plane-config.js";
import { DataPlaneClientError } from "../errors/errors.js";
import { resolveControlPlaneServiceUrl } from "../utils/didServiceResolver.js";

/**
 * Interface for transfer objects used by the service
 * Allows flexibility in what DAO/DTO is passed to the service
 */
export interface ITransferIdentifier {
  id: string;
  processId: string;
}

/**
 * Service for transfer lifecycle operations with the control plane
 */
@Injectable()
export class TransferClientService {
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
   * Request a new transfer for an agreement
   * @param agreementId - Agreement identifier
   * @param participantId - Participant DID
   * @param remoteAddress - Remote control plane address
   */
  async requestTransfer(
    agreementId: string,
    participantId: string,
    remoteAddress: string | undefined
  ): Promise<TransferProcessDto> {
    try {
      const response = await this.axiosManagement.post<TransferProcessDto>(
        "transfers/request",
        null,
        {
          params: {
            agreementId: agreementId,
            audience: participantId,
            address:
              remoteAddress ??
              (await resolveControlPlaneServiceUrl(participantId))
          }
        }
      );
      this.logger.log(
        `Requested transfer for agreement ${agreementId} with participant ${participantId}`
      );
      return response.data;
    } catch (error) {
      throw new DataPlaneClientError(
        `Error requesting transfer for agreement ${agreementId} with participant ${participantId}`,
        error
      ).andLog(this.logger);
    }
  }

  /**
   * Start a transfer
   * @param transfer - Transfer object with id and processId
   */
  async transferStart(transfer: ITransferIdentifier): Promise<unknown> {
    try {
      const response = await this.axiosManagement.post(
        `/transfers/${transfer.processId}/start`
      );
      this.logger.log(`Started transfer ${transfer.id}`);
      return response.data;
    } catch (error) {
      throw new DataPlaneClientError(
        `Error starting transfer ${transfer.id}`,
        error
      ).andLog(this.logger);
    }
  }

  /**
   * Complete a transfer
   * @param transfer - Transfer object with id and processId
   */
  async transferComplete(transfer: ITransferIdentifier): Promise<unknown> {
    try {
      const response = await this.axiosManagement.post(
        `/transfers/${transfer.processId}/completion`
      );
      this.logger.log(`Completed transfer ${transfer.id}`);
      return response.data;
    } catch (error) {
      throw new DataPlaneClientError(
        `Error completing transfer ${transfer.id}`,
        error
      ).andLog(this.logger);
    }
  }

  /**
   * Terminate a transfer
   * @param transfer - Transfer object with id and processId
   * @param code - Termination code
   * @param reason - Termination reason
   */
  async transferTerminate(
    transfer: ITransferIdentifier,
    code: string,
    reason: string
  ): Promise<unknown> {
    try {
      const response = await this.axiosManagement.post(
        `/transfers/${transfer.processId}/termination`,
        {
          code: code,
          reason: reason
        }
      );
      this.logger.log(
        `Terminated transfer ${transfer.id} (${code}: ${reason})`
      );
      return response.data;
    } catch (error) {
      throw new DataPlaneClientError(
        `Error terminating transfer ${transfer.id}`,
        error
      ).andLog(this.logger);
    }
  }

  /**
   * Suspend a transfer
   * @param transfer - Transfer object with id and processId
   * @param reason - Suspension reason
   */
  async transferSuspend(
    transfer: ITransferIdentifier,
    reason: string
  ): Promise<unknown> {
    try {
      const response = await this.axiosManagement.post(
        `/transfers/${transfer.processId}/suspension`,
        {
          reason: reason
        }
      );
      this.logger.log(`Suspended transfer ${transfer.id} (${reason})`);
      return response.data;
    } catch (error) {
      throw new DataPlaneClientError(
        `Error suspending transfer ${transfer.id}`,
        error
      ).andLog(this.logger);
    }
  }
}
