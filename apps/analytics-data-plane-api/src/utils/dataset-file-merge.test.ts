import { mergeFileDatasetUpdate } from "./dataset-file-merge.js";

describe("mergeFileDatasetUpdate", () => {
  it("updates only file-derived fields and preserves extra metadata", () => {
    const existing = {
      "@id": "urn:uuid:ds-1",
      title: "Old title",
      keyword: ["external"],
      distribution: [
        {
          format: "tsg:analytics",
          title: "Old dist title",
          mediaType: "text/csv",
          byteSize: "123",
          conformsTo: ["old"],
          issued: "2020-01-01T00:00:00.000Z",
          accessService: { endpointURL: "https://external.example" }
        }
      ],
      hasPolicy: [{ assigner: "did:web:external" }]
    } as any;

    const patch = {
      "@id": "urn:uuid:ds-1",
      title: "New title",
      distribution: [
        {
          format: "tsg:analytics",
          title: "New dist title",
          mediaType: "application/parquet",
          byteSize: "999",
          conformsTo: ["new"]
        }
      ]
    } as any;

    const merged = mergeFileDatasetUpdate(existing, patch);
    const mergedAny = merged as any;

    expect(mergedAny.title).toBe("New title");
    expect(mergedAny.keyword).toEqual(["external"]);
    expect(mergedAny.hasPolicy).toEqual([{ assigner: "did:web:external" }]);

    expect(mergedAny.distribution[0].title).toBe("New dist title");
    expect(mergedAny.distribution[0].mediaType).toBe("application/parquet");
    expect(mergedAny.distribution[0].byteSize).toBe("999");
    expect(mergedAny.distribution[0].conformsTo).toEqual(["new"]);

    // Preserves issued + accessService if already set.
    expect(mergedAny.distribution[0].issued).toBe("2020-01-01T00:00:00.000Z");
    expect(mergedAny.distribution[0].accessService).toEqual({
      endpointURL: "https://external.example"
    });
  });

  it("adds policy when missing and policyAssigner provided", () => {
    const existing = {
      "@id": "urn:uuid:ds-2",
      title: "Existing",
      distribution: [{ format: "tsg:analytics", title: "x" }]
    } as any;

    const patch = {
      "@id": "urn:uuid:ds-2",
      title: "New",
      distribution: [{ format: "tsg:analytics", title: "y" }]
    } as any;

    const merged = mergeFileDatasetUpdate(existing, patch, {
      policyAssigner: "did:web:publisher"
    });

    const mergedAny = merged as any;

    expect(Array.isArray(mergedAny.hasPolicy)).toBe(true);
    expect(mergedAny.hasPolicy.length).toBeGreaterThan(0);
  });

  it("creates distribution when base has none", () => {
    const patch = {
      "@id": "urn:uuid:ds-3",
      title: "Title",
      distribution: [{ format: "tsg:analytics", title: "dist", byteSize: "1" }]
    } as any;

    const merged = mergeFileDatasetUpdate(undefined, patch);
    const mergedAny = merged as any;
    expect(mergedAny.distribution).toHaveLength(1);
    expect(mergedAny.distribution[0].title).toBe("dist");
  });
});
