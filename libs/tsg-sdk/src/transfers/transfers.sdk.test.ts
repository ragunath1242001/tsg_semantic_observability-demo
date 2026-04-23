import { defaultContext } from "@tsg-dsp/common-dsp";
import createClient from "openapi-fetch";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { paths } from "../../.generated/control-plane.js";
import { TransferSdk } from "./transfers.sdk.js";

const mockFetch = vi.fn();

function createTestClient() {
  return createClient<paths>({
    baseUrl: "http://localhost:3000",
    fetch: mockFetch as any
  });
}

describe("TransferSdk", () => {
  let transfers: TransferSdk;

  beforeEach(() => {
    mockFetch.mockReset();
    transfers = new TransferSdk(createTestClient());
  });

  it("should request transfer with correct params", async () => {
    const mockTransfer = {
      "@context": defaultContext(),
      "@type": "TransferProcess",
      consumerPid: "urn:uuid:tp-1",
      providerPid: "urn:uuid:pp-1",
      state: "REQUESTED"
    };

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockTransfer), {
        headers: { "content-type": "application/json" }
      })
    );

    const result = await transfers.requestTransfer(
      "agr-1",
      "did:example:456",
      "http://remote.example.com",
      "application/json",
      "dp-1",
      true
    );
    expect(result.consumerPid).toBe("urn:uuid:tp-1");

    const calledUrl = (mockFetch.mock.calls[0][0] as Request).url;
    expect(calledUrl).toContain("/management/transfers/request");
    expect(calledUrl).toContain("agreementId=agr-1");
    expect(calledUrl).toContain("audience=did%3Aexample%3A456");
  });

  it("should complete transfer", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ status: "ok" }), {
        headers: { "content-type": "application/json" }
      })
    );

    await transfers.completeTransfer("tp-1");
    const calledUrl = (mockFetch.mock.calls[0][0] as Request).url;
    expect(calledUrl).toContain("/management/transfers/tp-1/completion");
  });

  it("should terminate transfer", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({}), {
        headers: { "content-type": "application/json" }
      })
    );

    await transfers.terminateTransfer("tp-1", "ERR001", "Some reason");
    const calledUrl = (mockFetch.mock.calls[0][0] as Request).url;
    expect(calledUrl).toContain("/management/transfers/tp-1/termination");

    const body = JSON.parse(
      await (mockFetch.mock.calls[0][0] as Request).text()
    );
    expect(body.code).toBe("ERR001");
    expect(body.reason).toBe("Some reason");
  });

  it("should poll until STARTED state for waitForStart", async () => {
    let callCount = 0;
    mockFetch.mockImplementation(async () => {
      callCount++;
      const state = callCount >= 2 ? "STARTED" : "REQUESTED";
      return new Response(
        JSON.stringify({
          id: "t-1",
          state,
          agreementId: "agr-1",
          remoteParty: "did:example:456",
          remoteAddress: "http://remote.example.com",
          role: "consumer",
          modifiedDate: "2025-01-01T00:00:00Z",
          events: [],
          dataPlaneTransfer: {}
        }),
        { headers: { "content-type": "application/json" } }
      );
    });

    const result = await transfers.waitForStart("tp-1", {
      intervalMs: 10,
      maxRetries: 5
    });
    expect(result.state).toBe("STARTED");
    expect(callCount).toBe(2);
  });

  it("should poll until COMPLETED state for waitForCompletion", async () => {
    let callCount = 0;
    mockFetch.mockImplementation(async () => {
      callCount++;
      const state = callCount >= 3 ? "COMPLETED" : "STARTED";
      return new Response(
        JSON.stringify({
          id: "t-1",
          state,
          agreementId: "agr-1",
          remoteParty: "did:example:456",
          remoteAddress: "http://remote.example.com",
          role: "consumer",
          modifiedDate: "2025-01-01T00:00:00Z",
          events: [],
          dataPlaneTransfer: {}
        }),
        { headers: { "content-type": "application/json" } }
      );
    });

    const result = await transfers.waitForCompletion("tp-1", {
      intervalMs: 10,
      maxRetries: 5
    });
    expect(result.state).toBe("COMPLETED");
    expect(callCount).toBe(3);
  });

  it("should list transfers", async () => {
    const mockTransfers = [
      {
        id: "t-1",
        state: "STARTED",
        agreementId: "agr-1",
        remoteParty: "did:example:456",
        remoteAddress: "http://remote.example.com",
        role: "consumer",
        modifiedDate: "2025-01-01T00:00:00Z",
        events: [],
        dataPlaneTransfer: {}
      }
    ];

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockTransfers), {
        headers: { "content-type": "application/json" }
      })
    );

    const result = await transfers.listTransfers();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("t-1");
  });

  it("should get transfer by process ID", async () => {
    const mockTransfer = {
      id: "t-1",
      state: "STARTED",
      agreementId: "agr-1",
      remoteParty: "did:example:456",
      remoteAddress: "http://remote.example.com",
      role: "consumer",
      modifiedDate: "2025-01-01T00:00:00Z",
      events: [],
      dataPlaneTransfer: {}
    };

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockTransfer), {
        headers: { "content-type": "application/json" }
      })
    );

    const result = await transfers.getTransfer("tp-1");
    expect(result.id).toBe("t-1");

    const calledUrl = (mockFetch.mock.calls[0][0] as Request).url;
    expect(calledUrl).toContain("/management/transfers/tp-1");
  });

  it("should start transfer", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ status: "ok" }), {
        headers: { "content-type": "application/json" }
      })
    );

    await transfers.startTransfer("tp-1");
    const req = mockFetch.mock.calls[0][0] as Request;
    expect(req.url).toContain("/management/transfers/tp-1/start");
    expect(req.method).toBe("POST");
  });

  it("should start transfer with data address", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ status: "ok" }), {
        headers: { "content-type": "application/json" }
      })
    );

    await transfers.startTransfer("tp-1", {
      endpointType: "https",
      endpoint: "https://data.example.com/transfer"
    } as any);

    const req = mockFetch.mock.calls[0][0] as Request;
    const body = JSON.parse(await req.text());
    expect(body.endpoint).toBe("https://data.example.com/transfer");
  });

  it("should suspend transfer", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({}), {
        headers: { "content-type": "application/json" }
      })
    );

    await transfers.suspendTransfer("tp-1", "Maintenance window");

    const req = mockFetch.mock.calls[0][0] as Request;
    expect(req.url).toContain("/management/transfers/tp-1/suspension");
    const body = JSON.parse(await req.text());
    expect(body.reason).toBe("Maintenance window");
  });

  it("should wait for a specific state", async () => {
    let callCount = 0;
    mockFetch.mockImplementation(async () => {
      callCount++;
      const state = callCount >= 2 ? "SUSPENDED" : "STARTED";
      return new Response(
        JSON.stringify({
          id: "t-1",
          state,
          agreementId: "agr-1",
          remoteParty: "did:example:456",
          remoteAddress: "http://remote.example.com",
          role: "consumer",
          modifiedDate: "2025-01-01T00:00:00Z",
          events: [],
          dataPlaneTransfer: {}
        }),
        { headers: { "content-type": "application/json" } }
      );
    });

    const result = await transfers.waitForState("tp-1", "SUSPENDED", {
      intervalMs: 10,
      maxRetries: 5
    });
    expect(result.state).toBe("SUSPENDED");
  });

  it("should request transfer and wait for start", async () => {
    let callCount = 0;
    mockFetch.mockImplementation(async (request: Request) => {
      const url = request.url;
      if (url.includes("/management/transfers/request")) {
        return new Response(
          JSON.stringify({
            "@context": defaultContext(),
            "@type": "TransferProcess",
            consumerPid: "urn:uuid:tp-created",
            providerPid: "urn:uuid:pp-1",
            state: "REQUESTED"
          }),
          { headers: { "content-type": "application/json" } }
        );
      }
      // Polling calls
      callCount++;
      const state = callCount >= 2 ? "STARTED" : "REQUESTED";
      return new Response(
        JSON.stringify({
          id: "tp-created",
          state,
          agreementId: "agr-1",
          remoteParty: "did:example:456",
          remoteAddress: "http://remote.example.com",
          role: "consumer",
          modifiedDate: "2025-01-01T00:00:00Z",
          events: [],
          dataPlaneTransfer: {}
        }),
        { headers: { "content-type": "application/json" } }
      );
    });

    const result = await transfers.transferAndWaitForStart(
      "agr-1",
      "did:example:456",
      "http://remote.example.com",
      "application/json",
      "dp-1",
      { intervalMs: 10, maxRetries: 5 }
    );
    expect(result.state).toBe("STARTED");
  });

  it("should request transfer without returnDto", async () => {
    const mockTransfer = {
      "@context": defaultContext(),
      "@type": "TransferProcess",
      consumerPid: "urn:uuid:tp-1",
      providerPid: "urn:uuid:pp-1",
      state: "REQUESTED"
    };

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify(mockTransfer), {
        headers: { "content-type": "application/json" }
      })
    );

    const result = await transfers.requestTransfer(
      "agr-1",
      "did:example:456",
      "http://remote.example.com",
      "application/json",
      "dp-1"
    );
    expect(result.consumerPid).toBe("urn:uuid:tp-1");
  });
});
