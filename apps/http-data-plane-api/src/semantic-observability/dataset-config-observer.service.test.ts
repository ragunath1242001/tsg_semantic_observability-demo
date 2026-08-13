import { VersionedDatasetConfig } from "@tsg-dsp/http-data-plane-dtos";
import { plainToInstance } from "class-transformer";
import { expect, it, vi } from "vitest";

import { DatasetConfigObserverService } from "./dataset-config-observer.service.js";
import { SemanticObservabilityService } from "./semantic-observability.service.js";

function observer() {
  const semanticObservabilityService = {
    recordEvent: vi.fn().mockResolvedValue(undefined),
    recordFieldUsageObservation: vi.fn().mockResolvedValue(undefined)
  } as unknown as SemanticObservabilityService;
  return {
    service: new DatasetConfigObserverService(semanticObservabilityService),
    semanticObservabilityService
  };
}

it("counts only field identifiers returned by validation", async () => {
  const { service, semanticObservabilityService } = observer();
  const config = plainToInstance(VersionedDatasetConfig, {
    type: "versioned",
    title: "Example",
    currentVersion: "2.1",
    governedStandardId: "setu:employment",
    governedFieldIds: ["setu:startDate", "setu:role", "setu:unused"],
    extraProps: { "setu:startDate": "private-start-date" },
    versions: [
      {
        version: "2.1",
        extraProps: { "setu:role": "private-role" },
        distributions: []
      }
    ]
  });

  await service.recordDatasetConfigObserved(config);

  expect(
    semanticObservabilityService.recordFieldUsageObservation
  ).not.toHaveBeenCalled();

  await service.recordValidatedFieldUsage(
    {
      governedStandardId: config.governedStandardId,
      governedFieldIds: config.governedFieldIds,
      version: "2.1"
    },
    ["setu:startDate", "setu:role"]
  );

  expect(
    semanticObservabilityService.recordFieldUsageObservation
  ).toHaveBeenCalledWith({
    governedStandardId: "setu:employment",
    version: "2.1",
    governedFieldIds: ["setu:startDate", "setu:role", "setu:unused"],
    observedFieldIds: ["setu:startDate", "setu:role"]
  });
  expect(
    JSON.stringify(
      vi.mocked(semanticObservabilityService.recordFieldUsageObservation).mock
        .calls
    )
  ).not.toContain("private-");
});

it("links validation to a public governed version and redacts the error", async () => {
  const { service, semanticObservabilityService } = observer();

  await service.recordMetadataValidationResult(
    "error",
    new Error("customer Alice failed validation"),
    {
      datasetId: "private-customer-dataset",
      governedStandardId: "setu:employment",
      version: "2.1"
    }
  );

  expect(semanticObservabilityService.recordEvent).toHaveBeenCalledWith(
    expect.objectContaining({
      context: { datasetPseudonym: expect.stringMatching(/^p_/) },
      attributes: {
        validationLevel: "error",
        errorMessage: "[redacted]",
        governedStandardId: "setu:employment",
        governedVersion: "2.1"
      }
    })
  );
  expect(
    JSON.stringify(
      vi.mocked(semanticObservabilityService.recordEvent).mock.calls
    )
  ).not.toContain("Alice");
});

it("exports only thresholded field-presence summaries", async () => {
  const saved: Array<Record<string, unknown>> = [];
  const eventRepository = {
    create: (value: Record<string, unknown>) => value,
    save: async (value: Record<string, unknown>) => {
      saved.push(value);
      return value;
    }
  };
  const service = new SemanticObservabilityService(
    eventRepository as never,
    {} as never,
    undefined,
    { fieldUsageMinimumObservations: 2 } as never,
    undefined
  );
  const observation = {
    governedStandardId: "setu:employment",
    version: "2.1",
    governedFieldIds: ["setu:startDate", "setu:unused"]
  };

  await service.recordFieldUsageObservation({
    ...observation,
    observedFieldIds: ["setu:startDate"]
  });
  expect(saved).toHaveLength(0);

  await service.recordFieldUsageObservation({
    ...observation,
    observedFieldIds: ["setu:startDate"]
  });
  expect(saved).toHaveLength(2);
  expect(saved.map((entry) => entry.attributes)).toEqual([
    expect.objectContaining({
      fieldId: "setu:startDate",
      observationCount: 2,
      presentCount: 2
    }),
    expect.objectContaining({
      fieldId: "setu:unused",
      observationCount: 2,
      presentCount: 0
    })
  ]);
});
