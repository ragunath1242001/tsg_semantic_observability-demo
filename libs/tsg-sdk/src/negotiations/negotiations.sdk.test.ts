import { defaultContext, type OfferDto } from "@tsg-dsp/common-dsp";
import createClient from "openapi-fetch";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { paths } from "../../.generated/control-plane.js";
import { NegotiationSdk } from "./negotiations.sdk.js";

const mockFetch = vi.fn();

function createTestClient() {
  return createClient<paths>({
    baseUrl: "http://localhost:3000",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetch: mockFetch as any
  });
}

describe("NegotiationSdk", () => {
  let negotiations: NegotiationSdk;

  beforeEach(() => {
    mockFetch.mockReset();
    negotiations = new NegotiationSdk(createTestClient());
  });

  it("should get negotiation by process ID", async () => {
    const mockNegotiation = {
      id: "neg-1",
      remoteId: "remote-neg-1",
      state: "REQUESTED",
      remoteParty: "did:example:456",
      role: "consumer",
      dataSet: "ds-1",
      remoteAddress: "http://remote.example.com",
      modifiedDate: "2025-01-01T00:00:00Z",
      events: []
    };

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockNegotiation), {
        headers: { "content-type": "application/json" }
      })
    );

    const result = await negotiations.getNegotiation("neg-1");
    expect(result.id).toBe("neg-1");
  });

  it("should request negotiation with correct params", async () => {
    const mockNegotiation = {
      "@context": defaultContext(),
      "@id": "neg-1",
      "@type": "ContractNegotiation",
      consumerPid: "urn:uuid:cp-1",
      providerPid: "urn:uuid:pp-1",
      state: "REQUESTED"
    };

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockNegotiation), {
        headers: { "content-type": "application/json" }
      })
    );

    const result = await negotiations.requestNegotiation(
      "ds-1",
      "did:example:456",
      "http://remote.example.com",
      {} as OfferDto,
      true
    );

    expect(result["@id"]).toBe("neg-1");

    const calledUrl = (mockFetch.mock.calls[0][0] as Request).url;
    expect(calledUrl).toContain("/management/negotiations/request");
    expect(calledUrl).toContain("dataSet=ds-1");
    expect(calledUrl).toContain("audience=did%3Aexample%3A456");
    expect(calledUrl).toContain("address=http%3A%2F%2Fremote.example.com");
  });

  it("should get agreement by ID", async () => {
    const mockAgreement = {
      "@context": defaultContext(),
      "@type": "Agreement",
      "@id": "agr-1",
      assigner: "urn:uuid:a",
      assignee: "urn:uuid:b",
      timestamp: "2025-01-01T00:00:00Z"
    };

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockAgreement), {
        headers: { "content-type": "application/json" }
      })
    );

    const result = await negotiations.getAgreement("agr-1", true);
    expect(result["@type"]).toBe("Agreement");
  });

  it("should poll until FINALIZED state for waitForAgreement", async () => {
    let callCount = 0;
    mockFetch.mockImplementation(async () => {
      callCount++;
      const state = callCount >= 3 ? "FINALIZED" : "REQUESTED";
      return new Response(
        JSON.stringify({
          id: "neg-1",
          remoteId: "remote-neg-1",
          state,
          remoteParty: "did:example:456",
          role: "consumer",
          dataSet: "ds-1",
          remoteAddress: "http://remote.example.com",
          modifiedDate: "2025-01-01T00:00:00Z",
          events: []
        }),
        { headers: { "content-type": "application/json" } }
      );
    });

    const result = await negotiations.waitForAgreement("neg-1", {
      intervalMs: 10,
      maxRetries: 5
    });
    expect(result.state).toBe("FINALIZED");
    expect(callCount).toBe(3);
  });

  it("should list negotiations", async () => {
    const mockNegotiations = [
      {
        id: "neg-1",
        remoteId: "remote-neg-1",
        state: "REQUESTED",
        remoteParty: "did:example:456",
        role: "consumer",
        dataSet: "ds-1",
        remoteAddress: "http://remote.example.com",
        modifiedDate: "2025-01-01T00:00:00Z"
      }
    ];

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockNegotiations), {
        headers: { "content-type": "application/json" }
      })
    );

    const result = await negotiations.listNegotiations();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("neg-1");
  });

  it("should get negotiations for dataset", async () => {
    const mockNegotiations = [
      {
        id: "neg-1",
        remoteId: "remote-neg-1",
        state: "FINALIZED",
        remoteParty: "did:example:456",
        role: "consumer",
        dataSet: "ds-1",
        remoteAddress: "http://remote.example.com",
        modifiedDate: "2025-01-01T00:00:00Z"
      }
    ];

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockNegotiations), {
        headers: { "content-type": "application/json" }
      })
    );

    const result = await negotiations.getNegotiationsForDataset(
      "ds-1",
      "did:example:456"
    );
    expect(result).toHaveLength(1);

    const calledUrl = (mockFetch.mock.calls[0][0] as Request).url;
    expect(calledUrl).toContain("/management/negotiations/dataset/ds-1");
    expect(calledUrl).toContain("remoteParty=did%3Aexample%3A456");
  });

  it("should terminate negotiation", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({}), {
        headers: { "content-type": "application/json" }
      })
    );

    await negotiations.terminateNegotiation("neg-1", "ERR001", "Some reason");

    const req = mockFetch.mock.calls[0][0] as Request;
    expect(req.url).toContain("/management/negotiations/neg-1/termination");
    const body = JSON.parse(await req.text());
    expect(body.code).toBe("ERR001");
    expect(body.reason).toBe("Some reason");
  });

  it("should wait for a specific state", async () => {
    let callCount = 0;
    mockFetch.mockImplementation(async () => {
      callCount++;
      const state = callCount >= 2 ? "AGREED" : "OFFERED";
      return new Response(
        JSON.stringify({
          id: "neg-1",
          remoteId: "remote-neg-1",
          state,
          remoteParty: "did:example:456",
          role: "provider",
          dataSet: "ds-1",
          remoteAddress: "http://remote.example.com",
          modifiedDate: "2025-01-01T00:00:00Z",
          events: []
        }),
        { headers: { "content-type": "application/json" } }
      );
    });

    const result = await negotiations.waitForState("neg-1", "AGREED", {
      intervalMs: 10,
      maxRetries: 5
    });
    expect(result.state).toBe("AGREED");
  });

  it("should negotiate and wait for agreement", async () => {
    let callCount = 0;
    mockFetch.mockImplementation(async (request: Request) => {
      const url = request.url;
      if (url.includes("/management/negotiations/request")) {
        return new Response(
          JSON.stringify({
            "@context": defaultContext(),
            "@type": "ContractNegotiation",
            "@id": "neg-created",
            consumerPid: "urn:uuid:cp-1",
            providerPid: "urn:uuid:pp-1",
            state: "REQUESTED"
          }),
          { headers: { "content-type": "application/json" } }
        );
      }
      // Polling calls
      callCount++;
      const state = callCount >= 2 ? "FINALIZED" : "REQUESTED";
      return new Response(
        JSON.stringify({
          id: "neg-created",
          remoteId: "remote-neg-1",
          state,
          remoteParty: "did:example:456",
          role: "consumer",
          dataSet: "ds-1",
          remoteAddress: "http://remote.example.com",
          modifiedDate: "2025-01-01T00:00:00Z",
          events: []
        }),
        { headers: { "content-type": "application/json" } }
      );
    });

    const result = await negotiations.negotiateAndWait(
      "ds-1",
      "did:example:456",
      "http://remote.example.com",
      {} as OfferDto,
      { intervalMs: 10, maxRetries: 5 }
    );
    expect(result.state).toBe("FINALIZED");
  });

  it("should request negotiation without returnDto", async () => {
    const mockNegotiation = {
      "@context": defaultContext(),
      "@type": "ContractNegotiation",
      "@id": "neg-1",
      consumerPid: "urn:uuid:cp-1",
      providerPid: "urn:uuid:pp-1",
      state: "REQUESTED"
    };

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockNegotiation), {
        headers: { "content-type": "application/json" }
      })
    );

    const result = await negotiations.requestNegotiation(
      "ds-1",
      "did:example:456",
      "http://remote.example.com",
      {} as OfferDto
    );

    expect(result.consumerPid).toBe("urn:uuid:cp-1");
  });
});
