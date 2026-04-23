import {
  Catalog,
  CatalogDto,
  DataPlaneDetailsDto,
  Dataset,
  DatasetDto
} from "@tsg-dsp/common-dsp";
import { DIDDocumentDto } from "@tsg-dsp/common-dtos";

import type { ControlPlaneClient } from "../client.js";
import { SdkError, SdkErrorCode } from "../utils/errors.js";
import { validateJsonLD, validateResponseArray } from "../utils/validate.js";

/**
 * Browse and discover datasets from local and remote catalogs.
 *
 * The catalog module allows you to:
 * - Retrieve your own published catalog.
 * - Discover remote participants via the registry and fetch their catalogs.
 * - Query individual datasets by ID or by conformance standard.
 * - Inspect dataplanes and DID documents.
 * @example
 * ```ts
 * const catalogs = await sdk.catalog.getRegistryCatalogs();
 * const dataset = await sdk.catalog.getDatasetConformingTo(
 *   "https://example.org/schema/v1",
 *   "did:web:participant",
 * );
 * ```
 */
export class CatalogSdk {
  constructor(private readonly client: ControlPlaneClient) {}

  /**
   * Get the catalog of the local participant (own catalog).
   * @param returnDto - When `true`, returns the raw DTO-shaped data instead of a deserialized class instance.
   * @returns The local catalog as a deserialized {@link Catalog}, or as a {@link CatalogDto} when `returnDto` is `true`.
   * @throws Throws an {@link SdkError} with code {@link SdkErrorCode.REQUEST_FAILED} if the HTTP request fails.
   */
  async getOwnCatalog(returnDto: true): Promise<CatalogDto>;
  async getOwnCatalog(returnDto?: false): Promise<Catalog>;
  async getOwnCatalog(returnDto: boolean = false) {
    const { data } = await this.client.GET("/management/catalog/request");

    return validateJsonLD<Catalog>(data, returnDto);
  }

  /**
   * Get the catalog of a remote participant by their participant ID.
   *
   * The participant must be known in the registry. Call {@link refreshRegistry}
   * first if the participant was recently added.
   * @param participantId - The DID or identifier of the remote participant.
   * @param returnDto - When `true`, returns the raw DTO-shaped data.
   * @returns The participant's catalog as a deserialized {@link Catalog}, or as a {@link CatalogDto} when `returnDto` is `true`.
   * @throws Throws an {@link SdkError} with code {@link SdkErrorCode.NOT_FOUND} if the participant is unknown.
   */
  async getParticipantCatalog(
    participantId: string,
    returnDto: true
  ): Promise<CatalogDto>;
  async getParticipantCatalog(
    participantId: string,
    returnDto?: false
  ): Promise<Catalog>;
  async getParticipantCatalog(
    participantId: string,
    returnDto: boolean = false
  ) {
    const { data } = await this.client.GET(
      "/management/registry/catalogs/{participantId}",
      {
        params: { path: { participantId } }
      }
    );
    return validateJsonLD<Catalog>(data, returnDto);
  }

  /**
   * Get all known registry participant addresses.
   * @returns An array of registry address objects.
   */
  async getRegistryAddresses() {
    const { data } = await this.client.GET("/management/registry/addresses");
    return data ?? [];
  }

  /**
   * Get catalogs from all participants known in the registry.
   * @param returnDto - When `true`, returns raw DTO-shaped data for each catalog.
   * @returns An array of catalogs, one per registered participant.
   */
  async getRegistryCatalogs(returnDto: true): Promise<CatalogDto[]>;
  async getRegistryCatalogs(returnDto?: false): Promise<Catalog[]>;
  async getRegistryCatalogs(returnDto: boolean = false) {
    const { data } = await this.client.GET("/management/registry/catalogs");
    const catalogs = data ?? [];
    return Promise.all(
      catalogs.map((catalog) => validateJsonLD<Catalog>(catalog, returnDto))
    );
  }

  /**
   * Get DID documents for all participants known in the registry.
   * @returns An array of validated {@link DIDDocumentDto} instances.
   */
  async getDidDocuments() {
    const { data } = await this.client.GET("/management/registry/didDocuments");
    const items = Array.isArray(data) ? data : data ? [data] : [];
    return validateResponseArray(DIDDocumentDto, items);
  }

  /**
   * Refresh the registry to discover newly added participants.
   *
   * This triggers a re-fetch of participant information from the configured
   * registry sources.
   */
  async refreshRegistry() {
    await this.client.POST("/management/registry/refresh");
  }

  /**
   * Get all configured data planes.
   *
   * Data planes are the endpoints through which actual data transfers occur.
   * @returns An array of validated {@link DataPlaneDetailsDto} instances.
   */
  async getDataplanes() {
    const { data } = await this.client.GET("/management/dataplanes");
    return validateResponseArray(DataPlaneDetailsDto, data ?? []);
  }

  /**
   * Get a specific dataset by ID from a participant's catalog.
   * @param id - The dataset identifier (e.g. a URN or URI).
   * @param audience - Participant ID (DID) of the dataset owner.
   * @param address - Optional DSP endpoint address of the participant. When omitted, the address is resolved from the registry.
   * @param returnDto - When `true`, returns the raw DTO-shaped data.
   * @returns The requested dataset.
   * @throws Throws an {@link SdkError} with code {@link SdkErrorCode.NOT_FOUND} if the dataset does not exist.
   */
  async getDataset(
    id: string,
    audience: string,
    address: string,
    returnDto: true
  ): Promise<DatasetDto>;
  async getDataset(
    id: string,
    audience: string,
    address: string,
    returnDto?: false
  ): Promise<Dataset>;
  async getDataset(
    id: string,
    audience: string,
    address?: string,
    returnDto: boolean = false
  ) {
    const { data } = await this.client.GET("/management/catalog/dataset", {
      params: { query: { id, audience, address } }
    });

    return validateJsonLD<Dataset>(data, returnDto);
  }

  /**
   * Find a dataset that conforms to a specific standard or schema.
   *
   * Searches a participant's catalog and returns the first dataset whose
   * `conformsTo` array includes the given URI.
   * @param conformsTo - The conformance URI to match (e.g. `"https://example.org/schema/v1"`).
   * @param audience - Participant ID (DID) to search in.
   * @param returnDto - When `true`, returns the raw {@link DatasetDto}.
   * @returns The first matching dataset.
   * @throws Throws an {@link SdkError} with code {@link SdkErrorCode.NOT_FOUND} if no matching dataset is found.
   */
  async getDatasetConformingTo(
    conformsTo: string,
    audience: string,
    returnDto: true
  ): Promise<DatasetDto>;
  async getDatasetConformingTo(
    conformsTo: string,
    audience: string,
    returnDto?: false
  ): Promise<Dataset>;
  async getDatasetConformingTo(
    conformsTo: string,
    audience: string,
    returnDto: boolean = false
  ) {
    if (returnDto) {
      const catalog = await this.getParticipantCatalog(audience, true);
      const dataset = catalog.dataset?.find((ds) =>
        ds.conformsTo?.includes(conformsTo)
      );
      if (!dataset) {
        throw new SdkError(
          `No dataset conforming to ${conformsTo} found for participant ${audience}`,
          SdkErrorCode.NOT_FOUND
        );
      }
      return dataset;
    }
    const catalog = await this.getParticipantCatalog(audience);
    const dataset = catalog.dataset?.find((ds) =>
      ds.conformsTo?.includes(conformsTo)
    );
    if (!dataset) {
      throw new SdkError(
        `No dataset conforming to ${conformsTo} found for participant ${audience}`,
        SdkErrorCode.NOT_FOUND
      );
    }
    return dataset;
  }
}
