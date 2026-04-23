import { defaultContext } from "@tsg-dsp/common-dsp";
import createClient from "openapi-fetch";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { paths } from "../../.generated/control-plane.js";
import { CatalogSdk } from "./catalog.sdk.js";

const mockFetch = vi.fn();

function createTestClient() {
  return createClient<paths>({
    baseUrl: "http://localhost:3000",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetch: mockFetch as any
  });
}

describe("CatalogSdk", () => {
  let catalog: CatalogSdk;

  beforeEach(() => {
    mockFetch.mockReset();
    catalog = new CatalogSdk(createTestClient());
  });

  it("should get own catalog", async () => {
    const mockCatalog = {
      "@context": defaultContext(),
      "@type": "Catalog",
      participantId: "did:example:123",
      dataset: []
    };

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockCatalog), {
        headers: { "content-type": "application/json" }
      })
    );

    const result = await catalog.getOwnCatalog(true);
    expect(result).toEqual(mockCatalog);
  });

  it("should get participant catalog", async () => {
    const mockCatalog = {
      "@context": defaultContext(),
      "@type": "Catalog",
      participantId: "did:example:456",
      dataset: []
    };

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockCatalog), {
        headers: { "content-type": "application/json" }
      })
    );

    const result = await catalog.getParticipantCatalog("did:example:456", true);
    expect(result).toEqual(mockCatalog);
  });

  it("should get registry addresses", async () => {
    const mockAddresses = [
      { didId: "did:example:123", address: "http://example.com" }
    ];

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockAddresses), {
        headers: { "content-type": "application/json" }
      })
    );

    const result = await catalog.getRegistryAddresses();
    expect(result).toEqual(mockAddresses);
  });

  it("should get dataset by ID", async () => {
    const mockDataset = { "@type": "Dataset", "@id": "ds-1" };

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockDataset), {
        headers: { "content-type": "application/json" }
      })
    );

    const result = await catalog.getDataset(
      "ds-1",
      "did:example:456",
      "http://example.com",
      true
    );
    expect(result).toEqual(mockDataset);

    const calledUrl = (mockFetch.mock.calls[0][0] as Request).url;
    expect(calledUrl).toContain("/management/catalog/dataset");
    expect(calledUrl).toContain("id=ds-1");
    expect(calledUrl).toContain("audience=did%3Aexample%3A456");
  });

  it("should find dataset conforming to schema", async () => {
    const mockCatalog = {
      "@context": defaultContext(),
      "@type": "Catalog",
      participantId: "did:example:456",
      dataset: [
        {
          "@type": "Dataset",
          "@id": "ds-1",
          conformsTo: ["http://schema.org/Other"]
        },
        {
          "@type": "Dataset",
          "@id": "ds-2",
          conformsTo: ["http://schema.org/Target"]
        }
      ]
    };

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockCatalog), {
        headers: { "content-type": "application/json" }
      })
    );

    const result = await catalog.getDatasetConformingTo(
      "http://schema.org/Target",
      "did:example:456",
      true
    );
    expect(result?.["@id"]).toBe("ds-2");
  });

  it("should throw NOT_FOUND when no dataset conforms to schema (returnDto=true)", async () => {
    const mockCatalog = {
      "@context": defaultContext(),
      "@type": "Catalog",
      participantId: "did:example:456",
      dataset: [
        {
          "@type": "Dataset",
          "@id": "ds-1",
          conformsTo: ["http://schema.org/Other"]
        }
      ]
    };

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockCatalog), {
        headers: { "content-type": "application/json" }
      })
    );

    await expect(
      catalog.getDatasetConformingTo(
        "http://schema.org/Missing",
        "did:example:456",
        true
      )
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("should throw NOT_FOUND when no dataset conforms to schema (returnDto=false)", async () => {
    const mockCatalog = {
      "@context": defaultContext(),
      "@type": "Catalog",
      participantId: "did:example:456",
      dataset: []
    };

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockCatalog), {
        headers: { "content-type": "application/json" }
      })
    );

    await expect(
      catalog.getDatasetConformingTo(
        "http://schema.org/Missing",
        "did:example:456"
      )
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("should get registry catalogs", async () => {
    const mockCatalogs = [
      {
        "@context": defaultContext(),
        "@type": "Catalog",
        participantId: "did:example:123",
        dataset: []
      },
      {
        "@context": defaultContext(),
        "@type": "Catalog",
        participantId: "did:example:456",
        dataset: []
      }
    ];

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockCatalogs), {
        headers: { "content-type": "application/json" }
      })
    );

    const result = await catalog.getRegistryCatalogs(true);
    expect(result).toHaveLength(2);
  });

  it("should get DID documents", async () => {
    const mockDids = [{ id: "did:example:123", verificationMethod: [] }];

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockDids), {
        headers: { "content-type": "application/json" }
      })
    );

    const result = await catalog.getDidDocuments();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("did:example:123");
  });

  it("should handle single DID document response (non-array)", async () => {
    const mockDid = { id: "did:example:123", verificationMethod: [] };

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockDid), {
        headers: { "content-type": "application/json" }
      })
    );

    const result = await catalog.getDidDocuments();
    expect(result).toHaveLength(1);
  });

  it("should get dataplanes", async () => {
    const mockPlanes = [
      {
        id: "dp-1",
        dataplaneType: "http",
        title: "HTTP Data Plane",
        endpointPrefix: "http://dp.example.com",
        callbackAddress: "http://dp.example.com/callback",
        managementAddress: "http://dp.example.com/management",
        catalogSynchronization: "push",
        role: "both"
      }
    ];

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockPlanes), {
        headers: { "content-type": "application/json" }
      })
    );

    const result = await catalog.getDataplanes();
    expect(result).toHaveLength(1);
  });

  it("should refresh registry", async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await catalog.refreshRegistry();

    const req = mockFetch.mock.calls[0][0] as Request;
    expect(req.method).toBe("POST");
    expect(req.url).toContain("/management/registry/refresh");
  });
});
