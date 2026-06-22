import { Injectable, Logger } from "@nestjs/common";
import {
  SemanticArtefactReference,
  SemanticArtefactType,
  SemanticObservabilityComponent,
  SemanticObservabilityDimension,
  SemanticObservabilityEventType,
  SemanticObservabilityStatus,
  calculateMetadataCompletenessScore,
  extractVersionFromReference,
  normalizeSemanticReference,
  pseudonymizeIdentifier,
  sanitizeAttributes
} from "@tsg-dsp/semantic-observability";
import {
  CollectionDatasetConfig,
  DatasetConfig,
  DatasetItem,
  VersionedDatasetConfig
} from "@tsg-dsp/http-data-plane-dtos";

import { SemanticObservabilityService } from "./semantic-observability.service.js";

@Injectable()
export class DatasetConfigObserverService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly semanticObservabilityService: SemanticObservabilityService
  ) {}

  async recordDatasetConfigObserved(datasetConfig: DatasetConfig) {
    await this.tryRecord(async () => {
      const artefacts = extractDatasetConfigArtefacts(datasetConfig);
      await this.semanticObservabilityService.recordEvent({
        component: SemanticObservabilityComponent.HTTP_DATA_PLANE,
        eventType:
          SemanticObservabilityEventType.DATASET_CONFIGURATION_OBSERVED,
        dimensions: [
          SemanticObservabilityDimension.ADOPTION,
          SemanticObservabilityDimension.EVOLUTION,
          ...(artefacts.length === 0
            ? [SemanticObservabilityDimension.FRICTION]
            : [])
        ],
        status:
          artefacts.length > 0
            ? SemanticObservabilityStatus.SUCCESS
            : SemanticObservabilityStatus.WARNING,
        context: {
          datasetPseudonym: getDatasetConfigPseudonym(datasetConfig)
        },
        artefacts,
        metadataCompletenessScore: calculateMetadataCompletenessScore(
          artefacts.map((artefact) => artefact.reference),
          datasetConfig instanceof VersionedDatasetConfig ? 2 : 3
        ),
        attributes: sanitizeAttributes({
          datasetType: datasetConfig.type,
          validateExtraProps: datasetConfig.validateExtraProps,
          versionCount:
            datasetConfig instanceof VersionedDatasetConfig
              ? datasetConfig.versions.length
              : undefined,
          currentVersion:
            datasetConfig instanceof VersionedDatasetConfig
              ? datasetConfig.currentVersion
              : undefined
        })
      });
    });
  }

  async recordDatasetItemObserved(
    item: DatasetItem,
    datasetConfig: CollectionDatasetConfig
  ) {
    await this.tryRecord(async () => {
      const artefacts = extractCollectionItemArtefacts(item, datasetConfig);
      await this.semanticObservabilityService.recordEvent({
        component: SemanticObservabilityComponent.HTTP_DATA_PLANE,
        eventType:
          SemanticObservabilityEventType.DATASET_CONFIGURATION_OBSERVED,
        dimensions: [
          SemanticObservabilityDimension.ADOPTION,
          SemanticObservabilityDimension.EVOLUTION,
          ...(artefacts.length === 0
            ? [SemanticObservabilityDimension.FRICTION]
            : [])
        ],
        status:
          artefacts.length > 0
            ? SemanticObservabilityStatus.SUCCESS
            : SemanticObservabilityStatus.WARNING,
        context: {
          datasetPseudonym: pseudonymizeIdentifier(item.id ?? item.title)
        },
        artefacts,
        metadataCompletenessScore: calculateMetadataCompletenessScore(
          [
            datasetConfig.baseSemanticModelRef,
            item.schemaRef ?? datasetConfig.schemaRef,
            item.openApiSpecRef ?? datasetConfig.openApiSpecRef
          ],
          3
        ),
        attributes: sanitizeAttributes({
          datasetType: datasetConfig.type,
          mediaType: item.mediaType ?? datasetConfig.mediaType,
          version: item.version,
          hasPolicy: Boolean(item.policy?.length ?? datasetConfig.basePolicy)
        })
      });
    });
  }

  async recordMetadataValidationResult(
    validationLevel: "error" | "warn" | "ignore",
    error?: Error
  ) {
    if (validationLevel === "ignore") {
      return;
    }

    await this.tryRecord(async () => {
      await this.semanticObservabilityService.recordEvent({
        component: SemanticObservabilityComponent.HTTP_DATA_PLANE,
        eventType: SemanticObservabilityEventType.METADATA_VALIDATION_RESULT,
        dimensions: [SemanticObservabilityDimension.FRICTION],
        status: error
          ? validationLevel === "error"
            ? SemanticObservabilityStatus.FAILURE
            : SemanticObservabilityStatus.WARNING
          : SemanticObservabilityStatus.SUCCESS,
        failureCategory: error ? "extra_props_validation" : undefined,
        validationErrorCount: error ? 1 : 0,
        attributes: sanitizeAttributes({
          validationLevel,
          errorMessage: error?.message
        })
      });
    });
  }

  private async tryRecord(record: () => Promise<void>) {
    try {
      await record();
    } catch (error) {
      this.logger.warn(
        `Could not record semantic observability event: ${error}`
      );
    }
  }
}

function extractDatasetConfigArtefacts(
  datasetConfig: DatasetConfig
): SemanticArtefactReference[] {
  if (datasetConfig instanceof VersionedDatasetConfig) {
    return [
      createArtefact(
        SemanticArtefactType.BASE_SEMANTIC_MODEL,
        datasetConfig.baseSemanticModelRef
      ),
      ...datasetConfig.versions.flatMap((version) => [
        createArtefact(
          SemanticArtefactType.SEMANTIC_MODEL,
          version.semanticModelRef
        ),
        ...version.distributions.flatMap((distribution) => [
          createArtefact(SemanticArtefactType.SCHEMA, distribution.schemaRef),
          createArtefact(
            SemanticArtefactType.OPENAPI_SPEC,
            distribution.openApiSpecRef
          )
        ])
      ])
    ].filter(isArtefact);
  }

  if (datasetConfig instanceof CollectionDatasetConfig) {
    return [
      createArtefact(
        SemanticArtefactType.BASE_SEMANTIC_MODEL,
        datasetConfig.baseSemanticModelRef
      ),
      createArtefact(SemanticArtefactType.SCHEMA, datasetConfig.schemaRef),
      createArtefact(
        SemanticArtefactType.OPENAPI_SPEC,
        datasetConfig.openApiSpecRef
      )
    ].filter(isArtefact);
  }

  return [];
}

function extractCollectionItemArtefacts(
  item: DatasetItem,
  datasetConfig: CollectionDatasetConfig
): SemanticArtefactReference[] {
  return [
    createArtefact(
      SemanticArtefactType.BASE_SEMANTIC_MODEL,
      datasetConfig.baseSemanticModelRef
    ),
    createArtefact(
      SemanticArtefactType.SCHEMA,
      item.schemaRef ?? datasetConfig.schemaRef
    ),
    createArtefact(
      SemanticArtefactType.OPENAPI_SPEC,
      item.openApiSpecRef ?? datasetConfig.openApiSpecRef
    )
  ].filter(isArtefact);
}

function createArtefact(
  type: SemanticArtefactType,
  reference: string | null | undefined
): SemanticArtefactReference | undefined {
  const normalizedReference = normalizeSemanticReference(reference);
  if (!normalizedReference) {
    return undefined;
  }

  return {
    type,
    reference: normalizedReference,
    version: extractVersionFromReference(normalizedReference)
  };
}

function isArtefact(
  artefact: SemanticArtefactReference | undefined
): artefact is SemanticArtefactReference {
  return artefact !== undefined;
}

function getDatasetConfigPseudonym(
  datasetConfig: DatasetConfig
): string | undefined {
  if (datasetConfig instanceof VersionedDatasetConfig) {
    return pseudonymizeIdentifier(datasetConfig.id ?? datasetConfig.title);
  }

  if (datasetConfig instanceof CollectionDatasetConfig) {
    return pseudonymizeIdentifier(
      datasetConfig.landingPage ?? datasetConfig.type
    );
  }

  return pseudonymizeIdentifier(datasetConfig.type);
}
