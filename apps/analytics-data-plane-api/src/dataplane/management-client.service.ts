import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { AlgorithmParticipant } from "@tsg-dsp/analytics-data-plane-dtos";
import { AuthClientService, parseNetworkError } from "@tsg-dsp/common-api";
import {
  AgreementDto,
  CatalogDto,
  DatasetDto,
  defaultContext,
  PolicyDto,
  TransferProcessDto
} from "@tsg-dsp/common-dsp";
import { NegotiationDetailDto } from "@tsg-dsp/common-dtos";
import { AxiosInstance } from "axios";

import { RootConfig } from "../config.js";
import { DataPlaneClientError, DataPlaneError } from "../utils/errors/error.js";
import { TransferDao } from "./transfer.dao.js";

@Injectable()
export class ManagementClient {
  constructor(
    private readonly config: RootConfig,
    authClient: AuthClientService
  ) {
    this.axiosManagement = authClient.axiosInstance({
      baseURL: this.config.controlPlane.managementEndpoint
    });
  }
  private readonly logger = new Logger(this.constructor.name);

  private readonly axiosManagement: AxiosInstance;

  private participantId?: string;

  async getOwnParticipantId(): Promise<string> {
    if (!this.participantId) {
      const catalog = await this.getOwnCatalog();
      this.participantId = catalog.participantId;
      return this.participantId;
    }
    return this.participantId;
  }

  async getOwnCatalog() {
    try {
      const response =
        await this.axiosManagement.get<CatalogDto>("/catalog/request");
      return response.data;
    } catch (error) {
      throw parseNetworkError(
        error,
        "fetching own participant catalog from control plane"
      );
    }
  }

  async getParticipantCatalog(participantId: string) {
    try {
      const response = await this.axiosManagement<CatalogDto>(
        `/registry/catalogs/${participantId}`
      );
      return response.data;
    } catch (error) {
      throw parseNetworkError(
        error,
        `fetching catalog for participant ${participantId}`
      );
    }
  }

  async fetchDatasetForParticipant(
    participant: AlgorithmParticipant,
    orchestration: boolean
  ): Promise<DatasetDto> {
    const remoteCatalog = await this.getParticipantCatalog(participant.didId);

    let dataset;
    if (!orchestration && participant.dataset) {
      dataset = remoteCatalog.dataset?.find(
        (d) => d["@id"] === participant.dataset
      );
    } else {
      dataset = remoteCatalog.dataset?.find((d) =>
        d.conformsTo?.includes("tsg:analytics-orchestration")
      );
    }
    if (!dataset) {
      throw new DataPlaneError(
        `Dataset ${participant.dataset ?? `tsg:analytics-orchestration`} not found in participant ${participant.didId} catalog`,
        HttpStatus.NOT_FOUND
      );
    }
    return dataset;
  }

  async getDataset(address: string, id: string, audience: string) {
    try {
      const response = await this.axiosManagement.get<DatasetDto>(
        `/catalog/dataset`,
        {
          params: {
            address: address,
            id: id,
            audience: audience
          }
        }
      );
      return response.data;
    } catch (error) {
      throw parseNetworkError(error, `fetching dataset with id ${id}`);
    }
  }

  async getAgreement(agreementId: string) {
    try {
      const response = await this.axiosManagement.get<AgreementDto>(
        `/agreements/${agreementId}`
      );
      return response.data;
    } catch (error) {
      throw parseNetworkError(error, `fetching agreement ${agreementId}`);
    }
  }

  async getNegotiationForDataset(datasetId: string, participantId: string) {
    try {
      const response = await this.axiosManagement<NegotiationDetailDto>(
        `negotiations/dataset/${datasetId}`,
        {
          params: {
            remoteParty: participantId
          }
        }
      );

      return response.data;
    } catch (error) {
      throw parseNetworkError(
        error,
        `fetching negotiation for dataset ${datasetId} with participant ${participantId}`
      );
    }
  }

  async waitForNegotiation(
    datasetId: string,
    participantId: string,
    retries = 20
  ): Promise<NegotiationDetailDto> {
    try {
      const negotiation = await this.getNegotiationForDataset(
        datasetId,
        participantId
      );
      return negotiation;
    } catch (_error) {
      if (retries <= 0) {
        throw new DataPlaneError(
          `Negotiation for dataset ${datasetId} with participant ${participantId} not found after 20 seconds`,
          HttpStatus.NOT_FOUND
        ).andLog(this.logger, "error");
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return this.waitForNegotiation(datasetId, participantId, retries - 1);
    }
  }

  async requestNegotiation(
    policy: PolicyDto | undefined,
    datasetId: string,
    participantId: string,
    remoteAddress: string
  ) {
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
      return await this.waitForNegotiation(datasetId, participantId);
    } catch (error) {
      throw parseNetworkError(
        error,
        `Error obtaining negotiation for dataset ${datasetId} with participant ${participantId}`
      );
    }
  }

  async requestTransfer(
    agreementId: string,
    participantId: string,
    remoteAddress: string
  ) {
    try {
      const response = await this.axiosManagement.post<TransferProcessDto>(
        "transfers/request",
        null,
        {
          params: {
            agreementId: agreementId,
            audience: participantId,
            address: remoteAddress
          }
        }
      );
      return response.data;
    } catch (error) {
      throw parseNetworkError(
        error,
        `Error requesting transfer for agreement ${agreementId} with participant ${participantId}`
      );
    }
  }

  async transferStart(transfer: TransferDao) {
    try {
      const response = await this.axiosManagement.post(
        `/transfers/${transfer.processId}/start`
      );
      return response.data;
    } catch (err) {
      throw new DataPlaneClientError(
        `Error starting transfer ${transfer.id}`,
        err
      ).andLog(this.logger);
    }
  }

  async transferComplete(transfer: TransferDao) {
    try {
      const response = await this.axiosManagement.post(
        `/transfers/${transfer.processId}/complete`
      );
      return response.data;
    } catch (err) {
      throw new DataPlaneClientError(
        `Error completing transfer ${transfer.id}`,
        err
      ).andLog(this.logger);
    }
  }

  async transferTerminate(transfer: TransferDao, code: string, reason: string) {
    try {
      const response = await this.axiosManagement.post(
        `/transfers/${transfer.processId}/termination`,
        {
          code: code,
          reason: reason
        }
      );
      return response.data;
    } catch (err) {
      throw new DataPlaneClientError(
        `Error starting transfer ${transfer.id}`,
        err
      ).andLog(this.logger);
    }
  }

  async transferSuspend(transfer: TransferDao, reason: string) {
    try {
      const response = await this.axiosManagement.post(
        `/transfers/${transfer.processId}/suspension`,
        {
          reason: reason
        }
      );
      return response.data;
    } catch (err) {
      throw new DataPlaneClientError(
        `Error starting transfer ${transfer.id}`,
        err
      ).andLog(this.logger);
    }
  }
}
