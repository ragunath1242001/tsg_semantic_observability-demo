import { DIDDocument } from "did-resolver";
import { JWK } from "jose";
import { http, HttpResponse } from "msw";
import { SetupServer, setupServer } from "msw/node";

import { jwkToMultibase } from "../utils/keyconverter.js";
import { parseVerificationMethod } from "./parse.js";

describe("Parse verification methods", () => {
  let server: SetupServer;
  const testJwk: JWK = {
    crv: "Ed25519",
    x: "mt7dyxIpQ36nxQeO69q0mKbfeNWMDmYWjLUj3PvDdRU",
    kty: "OKP"
  };
  const publicMultibase = jwkToMultibase(testJwk, false);
  beforeAll(async () => {
    server = setupServer(
      http.get("https://example.com/.well-known/did.json", () => {
        return HttpResponse.json<DIDDocument>({
          "@context": "https://www.w3.org/ns/did/v1",
          id: "did:web:example.com",
          verificationMethod: [
            {
              id: "did:web:example.com#key-1",
              type: "Ed25519VerificationKey2018",
              controller: "did:web:example.com",
              publicKeyMultibase: publicMultibase
            },
            {
              id: "did:web:example.com#key-2",
              type: "JsonWebKey2020",
              controller: "did:web:example.com",
              publicKeyJwk: {
                crv: "Ed25519",
                x: "mt7dyxIpQ36nxQeO69q0mKbfeNWMDmYWjLUj3PvDdRU",
                kty: "OKP"
              }
            }
          ]
        });
      })
    );
    server.listen({ onUnhandledRequest: "error" });
  });
  afterAll(() => {
    server.close();
  });
  it("should parse Ed25519 verification method", async () => {
    const verificationMethod = "did:web:example.com#key-1";
    const issuerDidId = "did:web:example.com";
    const cryptosuite = "eddsa-rdfc-2022";

    const jwk = await parseVerificationMethod(
      verificationMethod,
      issuerDidId,
      cryptosuite
    );

    expect(jwk).toBeDefined();
    expect(jwk.kty).toBe("OKP");
    expect(jwk.crv).toBe("Ed25519");
    expect(jwk.x).toBe(testJwk.x);
  });
  it("should parse JWK verification method", async () => {
    const verificationMethod = "did:web:example.com#key-2";
    const issuerDidId = "did:web:example.com";
    const cryptosuite = "eddsa-rdfc-2022";

    const jwk = await parseVerificationMethod(
      verificationMethod,
      issuerDidId,
      cryptosuite
    );

    expect(jwk).toBeDefined();
    expect(jwk.kty).toBe("OKP");
    expect(jwk.crv).toBe("Ed25519");
    expect(jwk.x).toBe(testJwk.x);
  });
  it("should parse multibase verification method", async () => {
    const verificationMethod = `${publicMultibase}#key-0`;
    const issuerDidId = "did:web:example.com";
    const cryptosuite = "eddsa-rdfc-2022";

    const jwk = await parseVerificationMethod(
      verificationMethod,
      issuerDidId,
      cryptosuite
    );

    expect(jwk).toBeDefined();
    expect(jwk.kty).toBe("OKP");
    expect(jwk.crv).toBe("Ed25519");
    expect(jwk.x).toBe(testJwk.x);
  });
  it("should parse multibase verification method for did:key", async () => {
    const verificationMethod =
      "did:key:z6MkpsowBu74vFhAfuM2JipTgFNXemu2x5pQosnwZ5RtpPwz#z6MkpsowBu74vFhAfuM2JipTgFNXemu2x5pQosnwZ5RtpPwz";
    const cryptosuite = "eddsa-rdfc-2022";

    const jwk = await parseVerificationMethod(
      verificationMethod,
      undefined,
      cryptosuite
    );

    expect(jwk).toBeDefined();
    expect(jwk.kty).toBe("OKP");
    expect(jwk.crv).toBe("Ed25519");
    expect(jwk.x).toBe(testJwk.x);
  });
  it("should throw error for unknown verification method", async () => {
    const verificationMethod = "unknown#key";
    const issuerDidId = "did:web:example.com";
    const cryptosuite = "eddsa-rdfc-2022";

    await expect(
      parseVerificationMethod(verificationMethod, issuerDidId, cryptosuite)
    ).rejects.toThrow("Could not find matching public key for");
  });
  it("should throw error for unsupported cryptosuite", async () => {
    const verificationMethod = "did:web:example.com#key-1";
    const issuerDidId = "did:web:example.com";
    const cryptosuite = "unsupported-cryptosuite";

    await expect(
      parseVerificationMethod(verificationMethod, issuerDidId, cryptosuite)
    ).rejects.toThrow("Unsupported cryptosuite type unsupported-cryptosuite");
  });
  it("should throw error for unsupported cryptosuite", async () => {
    const verificationMethod =
      "z6MkpsowBu74vFhAfuM2JipTgFNXemu2x5pQosnwZ5RtpPwz#z6MkpsowBu74vFhAfuM2JipTgFNXemu2x5pQosnwZ5RtpPwz";
    await expect(parseVerificationMethod(verificationMethod)).rejects.toThrow(
      "Unsupported cryptosuite type"
    );
  });
});
