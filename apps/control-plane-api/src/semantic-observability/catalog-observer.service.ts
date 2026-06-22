import { Injectable, Logger } from "@nestjs/common";
import { Dataset, DatasetDto } from "@tsg-dsp/common-dsp";
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

import { SemanticObservabilityService } from "./semantic-observability.service.js";

@Injectable()
export class CatalogObserverService {
  private readonly logger = new Logger(this.constructor.name);

  constructor(
    private readonly semanticObservabilityService: SemanticObservabilityService
  ) {}

  async recordDatasetObserved(
    dataset: Dataset | DatasetDto,
    action: "created" | "updated" | "deleted"
  ) {
    await this.tryRecord(async () => {
      const datasetDto = toDatasetDto(dataset);
      const artefacts = extractDatasetArtefacts(datasetDto);
      await this.semanticObservabilityService.recordEvent({
        component: SemanticObservabilityComponent.CONTROL_PLANE,
        eventType:
          action === "deleted"
            ? SemanticObservabilityEventType.DATASET_METADATA_CHANGED
            : SemanticObservabilityEventType.CATALOG_METADATA_OBSERVED,
        dimensions: [
          SemanticObservabilityDimension.ADOPTION,
          SemanticObservabilityDimension.EVOLUTION,
          ...(artefacts.length === 0
            ? [SemanticObservabilityDimension.FRICTION]
            : [])
        ],
        status:
          action === "deleted"
            ? SemanticObservabilityStatus.INFO
            : artefacts.length > 0
              ? SemanticObservabilityStatus.SUCCESS
              : SemanticObservabilityStatus.WARNING,
        context: {
          datasetPseudonym: pseudonymizeIdentifier(datasetDto["@id"])
        },
        artefacts,
        metadataCompletenessScore: calculateMetadataCompletenessScore(
          [
            ...(datasetDto.conformsTo ?? []),
            ...(datasetDto.distribution?.flatMap(
              (distribution) => distribution.conformsTo ?? []
            ) ?? [])
          ],
          2
        ),
        attributes: sanitizeAttributes({
          action,
          datasetVersion: datasetDto.version,
          distributionCount: datasetDto.distribution?.length ?? 0,
          policyCount: datasetDto.hasPolicy?.length ?? 0
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

function toDatasetDto(dataset: Dataset | DatasetDto): DatasetDto {
  return dataset instanceof Dataset ? dataset.serialize() : dataset;
}

function extractDatasetArtefacts(
  dataset: DatasetDto
): SemanticArtefactReference[] {
  const datasetArtefacts = (dataset.conformsTo ?? []).map((reference) =>
    createArtefact(SemanticArtefactType.SEMANTIC_MODEL, reference)
  );
  const distributionArtefacts =
    dataset.distribution?.flatMap((distribution) =>
      (distribution.conformsTo ?? []).map((reference) =>
        createArtefact(inferArtefactType(reference), reference)
      )
    ) ?? [];
  const policyArtefacts =
    dataset.hasPolicy?.map((policy) =>
      createArtefact(SemanticArtefactType.POLICY_PROFILE, policy["@id"])
    ) ?? [];

  return [
    ...datasetArtefacts,
    ...distributionArtefacts,
    ...policyArtefacts
  ].filter(isArtefact);
}

function createArtefact(
  type: SemanticArtefactType,
  reference: string | undefined
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

function inferArtefactType(reference: string): SemanticArtefactType {
  return /openapi|swagger/i.test(reference)
    ? SemanticArtefactType.OPENAPI_SPEC
    : SemanticArtefactType.SCHEMA;
}

function isArtefact(
  artefact: SemanticArtefactReference | undefined
): artefact is SemanticArtefactReference {
  return artefact !== undefined;
}
