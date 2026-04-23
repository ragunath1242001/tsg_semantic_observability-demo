import {
  CatalogSchema,
  ContractNegotiationSchema,
  TransferProcessSchema
} from "@tsg-dsp/common-dsp";
import { NegotiationDetailDto, SignedJwtResponse } from "@tsg-dsp/common-dtos";
import { KeyInfo } from "@tsg-dsp/wallet-dtos";
import { CredentialOffer } from "@tsg-dsp/wallet-dtos";
import { describe, expect, it } from "vitest";

import { SdkError, SdkErrorCode } from "./errors.js";
import { validateResponse } from "./validate.js";

describe("validateResponse", () => {
  it("should pass valid NegotiationDetailDto", () => {
    const data = {
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
    const result = validateResponse(NegotiationDetailDto, data);
    expect(result).toMatchObject({
      ...data,
      modifiedDate: new Date("2025-01-01T00:00:00Z")
    });
    expect(result).toBeInstanceOf(NegotiationDetailDto);
  });

  it("should reject NegotiationDetailDto with missing required fields", () => {
    const data = { id: "neg-1" };
    expect(() => validateResponse(NegotiationDetailDto, data)).toThrow(
      SdkError
    );
  });

  it("should pass valid ContractNegotiationSchema", () => {
    const data = {
      consumerPid: "cp-1",
      providerPid: "pp-1",
      state: "REQUESTED"
    };
    expect(validateResponse(ContractNegotiationSchema, data)).toEqual(data);
  });

  it("should pass valid TransferProcessSchema", () => {
    const data = {
      consumerPid: "tp-1",
      providerPid: "pp-1",
      agreementId: "agr-1",
      state: "REQUESTED"
    };
    expect(validateResponse(TransferProcessSchema, data)).toEqual(data);
  });

  it("should pass valid CatalogSchema", () => {
    const data = { participantId: "did:web:example", dataset: [] };
    expect(validateResponse(CatalogSchema, data)).toEqual(data);
  });

  it("should pass valid SignedJwtResponse", () => {
    const data = { jwt: "eyJhbGciOi..." };
    expect(validateResponse(SignedJwtResponse, data)).toEqual(data);
  });

  it("should reject SignedJwtResponse with missing jwt", () => {
    const data = {};
    expect(() => validateResponse(SignedJwtResponse, data)).toThrow(SdkError);
  });

  it("should pass valid CredentialOffer", () => {
    const data = {
      credential_issuer: "issuer-1",
      credential_configuration_ids: ["config-1"]
    };
    expect(validateResponse(CredentialOffer, data)).toEqual(data);
  });

  it("should preserve transformed field types from DTO classes", () => {
    const result = validateResponse(KeyInfo, {
      id: "key-1",
      type: "EdDSA",
      default: true,
      publicKey: { kty: "OKP", crv: "Ed25519" },
      createdDate: "2025-01-01T00:00:00Z",
      modifiedDate: "2025-01-01T00:00:00Z"
    });

    expect(result.createdDate).toBeInstanceOf(Date);
    expect(result.modifiedDate).toBeInstanceOf(Date);
  });

  it("should preserve original data (including extra properties)", () => {
    const data = {
      id: "neg-1",
      remoteId: "remote-neg-1",
      state: "FINALIZED",
      remoteParty: "did:example:456",
      role: "provider",
      dataSet: "ds-1",
      remoteAddress: "http://remote.example.com",
      modifiedDate: "2025-01-01T00:00:00Z",
      events: [],
      offer: { "@id": "offer-1" },
      agreement: { "@id": "agr-1" }
    };
    const result = validateResponse(NegotiationDetailDto, data);
    expect(result).toMatchObject({
      id: "neg-1",
      remoteId: "remote-neg-1",
      state: "FINALIZED",
      remoteParty: "did:example:456",
      role: "provider",
      dataSet: "ds-1",
      remoteAddress: "http://remote.example.com",
      modifiedDate: new Date("2025-01-01T00:00:00Z"),
      offer: { "@id": "offer-1" },
      agreement: { "@id": "agr-1" }
    });
    expect(result).toBeInstanceOf(NegotiationDetailDto);
    expect((result as any).offer).toEqual({ "@id": "offer-1" });
  });

  it("should include validation details in error message", () => {
    const data = { id: "neg-1" };
    try {
      validateResponse(NegotiationDetailDto, data);
      expect.unreachable("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(SdkError);
      expect((error as SdkError).code).toBe(SdkErrorCode.VALIDATION_FAILED);
      expect((error as SdkError).message).toContain("NegotiationDetailDto");
    }
  });
});
