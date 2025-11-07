import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { AuthClientService, parseNetworkError } from "@tsg-dsp/common-api";
import { CatalogDto, DatasetDto } from "@tsg-dsp/common-dsp";
import { AxiosInstance } from "axios";

import { ControlPlaneConfig } from "../config/control-plane-config.js";
import { DataPlaneError } from "../errors/errors.js";
import { resolveControlPlaneServiceUrl } from "../utils/didServiceResolver.js";

/**
 * Service for managing catalog and dataset operations with the control plane
 */
@Injectable()
export class CatalogClientService {
  protected readonly logger = new Logger(this.constructor.name);
  protected readonly axiosManagement: AxiosInstance;
  protected readonly axiosDataPlane: AxiosInstance;
  private participantId?: string;

  constructor(
    protected readonly authClient: AuthClientService,
    protected readonly controlPlaneConfig: ControlPlaneConfig
  ) {
    this.axiosManagement = authClient.axiosInstance({
      baseURL: controlPlaneConfig.managementEndpoint
    });
    this.axiosDataPlane = authClient.axiosInstance({
      baseURL: controlPlaneConfig.dataPlaneEndpoint
    });
  }

  /**
   * Get own catalog from control plane
   */
  async getOwnCatalog(): Promise<CatalogDto> {
    try {
      const response =
        await this.axiosManagement.get<CatalogDto>("/catalog/request");
      this.logger.debug("Retrieved own catalog from control plane");
      return response.data;
    } catch (error) {
      throw parseNetworkError(error, "fetching own catalog from control plane");
    }
  }

  /**
   * Get participant ID (cached after first retrieval)
   */
  async getParticipantId(): Promise<string> {
    if (this.participantId) {
      return this.participantId;
    }
    const catalog = await this.getOwnCatalog();
    this.participantId = catalog.participantId;
    if (!this.participantId) {
      throw new DataPlaneError(
        "Participant ID not found in catalog",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
    return this.participantId;
  }

  /**
   * Get participant ID if available, otherwise undefined
   */
  async getOptionalParticipantId(): Promise<string | undefined> {
    if (this.participantId) {
      return this.participantId;
    }
    try {
      await this.getParticipantId();
    } catch (error) {
      this.logger.debug(`Could not retrieve local participant ID: ${error}`);
    }
    return this.participantId;
  }

  /**
   * Get catalog for a specific participant from the registry
   * @param participantId - DID of the participant
   */
  async getParticipantCatalog(participantId: string): Promise<CatalogDto> {
    try {
      const response = await this.axiosManagement.get<CatalogDto>(
        `/registry/catalogs/${encodeURIComponent(participantId)}`
      );
      this.logger.debug(`Retrieved catalog for participant ${participantId}`);
      return response.data;
    } catch (error) {
      throw parseNetworkError(
        error,
        `fetching catalog for participant ${participantId}`
      );
    }
  }

  /**
   * Get adresses of all participants from the registry
   */
  async getRegistryAddresses(): Promise<{ didId: string; address: string }[]> {
    try {
      const response = await this.axiosManagement.get<
        { didId: string; address: string }[]
      >("/registry/addresses");
      this.logger.debug("Retrieved registry addresses from control plane");
      return response.data;
    } catch (err) {
      throw parseNetworkError(
        err,
        "fetching registry addresses from control plane"
      );
    }
  }

  /**
   * Get a dataset conforming to a specific standard from a participant's catalog
   * @param conformsTo - Conformance standard URI
   * @param audience - DID of the participant
   */
  async getDatasetConformingTo(
    conformsTo: string,
    audience: string
  ): Promise<DatasetDto> {
    const catalog = await this.getParticipantCatalog(audience);
    const dataset = catalog.dataset?.find((ds) =>
      ds.conformsTo?.includes(conformsTo)
    );
    if (!dataset) {
      throw new DataPlaneError(
        `No dataset conforming to ${conformsTo} found for participant ${audience}`,
        HttpStatus.NOT_FOUND
      );
    }
    return dataset;
  }

  /**
   * Get a specific dataset from a participant's catalog
   * @param address - Control plane address of the participant
   * @param id - Dataset ID
   * @param audience - DID of the participant
   */
  async getDataset(
    id: string,
    audience: string,
    address?: string
  ): Promise<DatasetDto> {
    const controlPlaneAddress =
      address ?? (await resolveControlPlaneServiceUrl(audience));
    try {
      const response = await this.axiosManagement.get<DatasetDto>(
        `/catalog/dataset`,
        {
          params: {
            address: controlPlaneAddress,
            id: id,
            audience: audience
          }
        }
      );
      this.logger.debug(
        `Retrieved dataset ${id} from ${controlPlaneAddress} for audience ${audience}`
      );
      return response.data;
    } catch (error) {
      throw parseNetworkError(error, `fetching dataset with id ${id}`);
    }
  }

  /**
   * Sync datasets to control plane
   */
  async syncDataset(
    dataPlaneIdentifier: string,
    dataset: DatasetDto
  ): Promise<void> {
    try {
      await this.axiosDataPlane.post(
        `/${dataPlaneIdentifier}/dataset`,
        dataset
      );
      this.logger.log(`Synced dataset ${dataset["@id"]} to control plane`);
    } catch (error) {
      throw parseNetworkError(
        error,
        `syncing dataset ${dataset["@id"]} to control plane`
      );
    }
  }

  /**
   * Sync entire catalog to control plane
   */
  async syncCatalog(
    dataPlaneIdentifier: string,
    catalog: CatalogDto
  ): Promise<void> {
    try {
      await this.axiosDataPlane.post(
        `/${dataPlaneIdentifier}/catalog`,
        catalog
      );
      this.logger.log(
        `Synced catalog with ${catalog.dataset?.length || 0} datasets to control plane`
      );
    } catch (error) {
      throw parseNetworkError(error, "syncing catalog to control plane");
    }
  }

  /**
   * Update a dataset in the control plane
   */
  async updateDataset(
    dataPlaneIdentifier: string,
    datasetId: string,
    dataset: DatasetDto
  ): Promise<void> {
    try {
      await this.axiosDataPlane.put(
        `/${dataPlaneIdentifier}/dataset/${datasetId}`,
        dataset
      );
      this.logger.log(`Updated dataset ${datasetId} in control plane`);
    } catch (error) {
      throw parseNetworkError(
        error,
        `updating dataset ${datasetId} in control plane`
      );
    }
  }

  /**
   * Delete a dataset from the control plane
   */
  async deleteDataset(
    dataPlaneIdentifier: string,
    datasetId: string
  ): Promise<void> {
    try {
      await this.axiosDataPlane.delete(
        `/${dataPlaneIdentifier}/dataset/${datasetId}`
      );
      this.logger.log(`Deleted dataset ${datasetId} from control plane`);
    } catch (error) {
      throw parseNetworkError(
        error,
        `deleting dataset ${datasetId} from control plane`
      );
    }
  }
}
