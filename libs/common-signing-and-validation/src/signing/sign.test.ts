import { JWK } from "jose";

import {
  generateSignedDataIntegrityProof,
  generateSignedJwt,
  signAsJws
} from "./sign.js";

describe("Signing tests", () => {
  const ed25519Jwk: JWK = {
    crv: "Ed25519",
    d: "r3i3AEII1Cv97rOIaNifsyw0OSJ1tzY1giR-lgMjCMo",
    x: "mt7dyxIpQ36nxQeO69q0mKbfeNWMDmYWjLUj3PvDdRU",
    kty: "OKP"
  };
  const publicJwk: JWK = {
    crv: "Ed25519",
    x: "mt7dyxIpQ36nxQeO69q0mKbfeNWMDmYWjLUj3PvDdRU",
    kty: "OKP"
  };
  const algorithm = "EdDSA";
  const didId = "did:example:123";
  const id = "key-1";

  describe("signAsJws", () => {
    it("should create a valid JWS signature", async () => {
      const data = Buffer.from("test-data");
      const jws = await signAsJws(data, algorithm, ed25519Jwk);
      expect(typeof jws).toBe("string");
      expect(jws.split(".").length).toBe(3);
    });
    it("should throw with invalid key", async () => {
      await expect(
        signAsJws(Buffer.from("abc"), algorithm, {
          ...ed25519Jwk,
          d: undefined
        })
      ).rejects.toThrow();
    });
  });

  describe("generateSignedJwt", () => {
    it("should create a valid JWT with claims", async () => {
      const payload = { foo: "bar" };
      const jwt = await generateSignedJwt(payload, didId, {
        key: {
          id,
          signingKey: ed25519Jwk,
          algorithm
        },
        audience: "aud-1",
        iss: true,
        subject: "sub-1",
        jti: "jwt-id-1",
        typ: "JWT"
      });
      expect(typeof jwt).toBe("string");
      expect(jwt.split(".").length).toBe(3);
      // Optionally: decode and check claims
      const [_, payloadB64] = jwt.split(".");
      const decodedPayload = JSON.parse(
        Buffer.from(payloadB64, "base64url").toString()
      );
      expect(decodedPayload.foo).toBe("bar");
      expect(decodedPayload.aud).toBe("aud-1");
      expect(decodedPayload.iss).toBe(didId);
      expect(decodedPayload.sub).toBe("sub-1");
      expect(decodedPayload.jti).toBe("jwt-id-1");
    });
    it("should respect expiresIn as number", async () => {
      const jwt = await generateSignedJwt({}, didId, {
        key: { id, signingKey: ed25519Jwk, algorithm },
        expiresIn: 60
      });
      const [, payloadB64] = jwt.split(".");
      const decodedPayload = JSON.parse(
        Buffer.from(payloadB64, "base64url").toString()
      );
      expect(decodedPayload.exp).toBeGreaterThan(decodedPayload.iat);
    });
    it("should respect expiresIn as Date", async () => {
      const date = new Date(Date.now() + 60000);
      const jwt = await generateSignedJwt({}, didId, {
        key: { id, signingKey: ed25519Jwk, algorithm },
        expiresIn: date
      });
      const [, payloadB64] = jwt.split(".");
      const decodedPayload = JSON.parse(
        Buffer.from(payloadB64, "base64url").toString()
      );
      expect(decodedPayload.exp).toBeCloseTo(
        Math.floor(date.getTime() / 1000),
        -1
      );
    });
    it("should default iat to now if not set", async () => {
      const jwt = await generateSignedJwt({}, didId, {
        key: { id, signingKey: ed25519Jwk, algorithm }
      });
      const [, payloadB64] = jwt.split(".");
      const decodedPayload = JSON.parse(
        Buffer.from(payloadB64, "base64url").toString()
      );
      expect(decodedPayload.iat).toBeDefined();
    });
    it("should allow subject=true to set sub to didId", async () => {
      const jwt = await generateSignedJwt({}, didId, {
        key: { id, signingKey: ed25519Jwk, algorithm },
        subject: true
      });
      const [, payloadB64] = jwt.split(".");
      const decodedPayload = JSON.parse(
        Buffer.from(payloadB64, "base64url").toString()
      );
      expect(decodedPayload.sub).toBe(didId);
    });
    it("should not set iat if options.iat is false", async () => {
      const jwt = await generateSignedJwt({}, didId, {
        key: { id, signingKey: ed25519Jwk, algorithm },
        iat: false
      });
      const [, payloadB64] = jwt.split(".");
      const decodedPayload = JSON.parse(
        Buffer.from(payloadB64, "base64url").toString()
      );
      expect(decodedPayload.iat).toBeUndefined();
    });

    it("should set nonce if provided", async () => {
      const jwt = await generateSignedJwt({}, didId, {
        key: { id, signingKey: ed25519Jwk, algorithm },
        nonce: "test-nonce"
      });
      const [, payloadB64] = jwt.split(".");
      const decodedPayload = JSON.parse(
        Buffer.from(payloadB64, "base64url").toString()
      );
      expect(decodedPayload.nonce).toBe("test-nonce");
    });
  });

  describe("generateSignedDataIntegrityProof", () => {
    it("should create a DataIntegrityProof with expected fields", async () => {
      const doc = {
        "@context": {
          schema: "http://schema.org",
          Person: { "@id": "schema:Person" },
          name: { "@id": "schema:name" },
          jobTitle: { "@id": "schema:jobTitle" },
          url: { "@id": "schema:url", "@type": "@id" },
          telephone: { "@id": "schema:telephone" }
        },
        "@type": "Person",
        name: "Jane Doe",
        jobTitle: "Professor",
        url: "http://www.janedoe.com",
        telephone: "(425) 123-4567"
      };
      const proof = await generateSignedDataIntegrityProof(
        doc,
        didId,
        id,
        publicJwk,
        ed25519Jwk,
        algorithm,
        "assertionMethod"
      );
      expect(proof).toBeDefined();
      expect(proof.type).toBe("DataIntegrityProof");
      expect(proof.verificationMethod).toContain(id);
      expect(proof.proofPurpose).toBe("assertionMethod");
      expect(proof.cryptosuite).toContain("eddsa");
      expect(proof.proofValue).toBeDefined();
    });
    it("should embed verification method if requested", async () => {
      const doc = {
        "@context": {
          schema: "http://schema.org",
          Person: { "@id": "schema:Person" },
          name: { "@id": "schema:name" },
          jobTitle: { "@id": "schema:jobTitle" },
          url: { "@id": "schema:url", "@type": "@id" },
          telephone: { "@id": "schema:telephone" }
        },
        "@type": "Person",
        name: "Jane Doe",
        jobTitle: "Professor",
        url: "http://www.janedoe.com",
        telephone: "(425) 123-4567"
      };
      const proof = await generateSignedDataIntegrityProof(
        doc,
        didId,
        id,
        publicJwk,
        ed25519Jwk,
        algorithm,
        "authentication",
        "RDFC",
        true
      );
      expect(
        proof.verificationMethod &&
          proof.verificationMethod.startsWith("did:key:")
      ).toBe(true);
    });
    it("should allow custom proof options", async () => {
      const doc = {
        "@context": {
          schema: "http://schema.org",
          Person: { "@id": "schema:Person" },
          name: { "@id": "schema:name" },
          jobTitle: { "@id": "schema:jobTitle" },
          url: { "@id": "schema:url", "@type": "@id" },
          telephone: { "@id": "schema:telephone" }
        },
        "@type": "Person",
        name: "Jane Doe",
        jobTitle: "Professor",
        url: "http://www.janedoe.com",
        telephone: "(425) 123-4567"
      };
      const customCreated = "2020-01-01T00:00:00Z";
      const proof = await generateSignedDataIntegrityProof(
        doc,
        didId,
        id,
        publicJwk,
        ed25519Jwk,
        algorithm,
        "authentication",
        "RDFC",
        false,
        { created: customCreated }
      );
      expect(proof.created).toBe(customCreated);
    });
    it("should support JCS canonization", async () => {
      const doc = {
        "@context": {
          schema: "http://schema.org",
          Person: { "@id": "schema:Person" },
          name: { "@id": "schema:name" },
          jobTitle: { "@id": "schema:jobTitle" },
          url: { "@id": "schema:url", "@type": "@id" },
          telephone: { "@id": "schema:telephone" }
        },
        "@type": "Person",
        name: "Jane Doe",
        jobTitle: "Professor",
        url: "http://www.janedoe.com",
        telephone: "(425) 123-4567"
      };
      const proof = await generateSignedDataIntegrityProof(
        doc,
        didId,
        id,
        publicJwk,
        ed25519Jwk,
        algorithm,
        "assertionMethod",
        "JCS"
      );
      expect(proof).toBeDefined();
      expect(proof.cryptosuite).toContain("jcs");
    });
  });
});
