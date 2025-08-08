import { importJWK, JWK, SignJWT } from "jose";

import { generateSignedJwt, validateJwt } from "../index.js";

describe("JWT validation", () => {
  const privateJwk: JWK = {
    crv: "Ed25519",
    d: "r3i3AEII1Cv97rOIaNifsyw0OSJ1tzY1giR-lgMjCMo",
    x: "mt7dyxIpQ36nxQeO69q0mKbfeNWMDmYWjLUj3PvDdRU",
    kty: "OKP"
  };
  const publicKeyMultibase = "z6MkpsowBu74vFhAfuM2JipTgFNXemu2x5pQosnwZ5RtpPwz";
  it("should validate a valid JWT", async () => {
    const signedJwt = await generateSignedJwt(
      { foo: "bar" },
      `did:key:${publicKeyMultibase}`,
      {
        key: {
          identifier: publicKeyMultibase,
          signingKey: privateJwk,
          algorithm: "EdDSA"
        },
        audience: "aud-1",
        iss: true,
        subject: "sub-1",
        jti: crypto.randomUUID()
      }
    );
    const verifyResult = await validateJwt(signedJwt);
    expect(verifyResult).toBeDefined();
  });
  it("should throw on invalid JWT", async () => {
    await expect(validateJwt("invalid.jwt.token")).rejects.toThrow(
      "Could not decode JWT"
    );
  });
  it("should throw on missing kid in JWT header", async () => {
    const payload = { foo: "bar" };
    const jwt = new SignJWT(payload).setProtectedHeader({
      alg: "EdDSA"
    });
    const signedJwt = await jwt.sign(await importJWK(privateJwk, "EdDSA"));
    await expect(validateJwt(signedJwt)).rejects.toThrow(
      "Could not validate JWT. Missing Key ID in JWT."
    );
  });
  it("should throw on missing issuer if required", async () => {
    const payload = { foo: "bar", jti: crypto.randomUUID() };
    const jwt = new SignJWT(payload).setProtectedHeader({
      alg: "EdDSA",
      kid: `did:key:${publicKeyMultibase}#${publicKeyMultibase}`
    });
    const signedJwt = await jwt.sign(await importJWK(privateJwk, "EdDSA"));
    await expect(validateJwt(signedJwt)).rejects.toThrow(
      "Could not validate JWT. Missing issuer in JWT."
    );
    const verifyResult = await validateJwt(signedJwt, {
      validateIssuer: false
    });
    expect(verifyResult).toBeDefined();
  });
  it("should throw on missing JTI if required", async () => {
    const payload = { foo: "bar", iss: `did:key:${publicKeyMultibase}` };
    const jwt = new SignJWT(payload).setProtectedHeader({
      alg: "EdDSA",
      kid: `did:key:${publicKeyMultibase}#${publicKeyMultibase}`
    });
    const signedJwt = await jwt.sign(await importJWK(privateJwk, "EdDSA"));
    await expect(validateJwt(signedJwt)).rejects.toThrow(
      "Could not validate JWT, JTI error."
    );
    const verifyResult = await validateJwt(signedJwt, {
      validateJti: false
    });
    expect(verifyResult).toBeDefined();
  });
  it("should throw on repeated JTI", async () => {
    const payload = {
      foo: "bar",
      iss: `did:key:${publicKeyMultibase}`,
      jti: crypto.randomUUID()
    };
    const jwt = new SignJWT(payload).setProtectedHeader({
      alg: "EdDSA",
      kid: `did:key:${publicKeyMultibase}#${publicKeyMultibase}`
    });
    const signedJwt = await jwt.sign(await importJWK(privateJwk, "EdDSA"));
    await validateJwt(signedJwt);
    await expect(validateJwt(signedJwt)).rejects.toThrow(
      "Could not validate JWT, JTI error."
    );
  });
  it("should validate JWT with expiration", async () => {
    const payload = {
      foo: "bar",
      exp: Math.floor(Date.now() / 1000) + 60,
      jti: crypto.randomUUID(),
      iss: `did:key:${publicKeyMultibase}`
    };
    const jwt = new SignJWT(payload).setProtectedHeader({
      alg: "EdDSA",
      kid: `did:key:${publicKeyMultibase}#${publicKeyMultibase}`
    });
    const signedJwt = await jwt.sign(await importJWK(privateJwk, "EdDSA"));
    const verifyResult = await validateJwt(signedJwt);
    expect(verifyResult).toBeDefined();
  });
  it("should throw on expired JWT", async () => {
    const payload = { foo: "bar", exp: Math.floor(Date.now() / 1000) - 60 };
    const jwt = new SignJWT(payload).setProtectedHeader({
      alg: "EdDSA",
      kid: `did:key:${publicKeyMultibase}#${publicKeyMultibase}`
    });
    const signedJwt = await jwt.sign(await importJWK(privateJwk, "EdDSA"));
    await expect(
      validateJwt(signedJwt, { validateJti: false, validateIssuer: false })
    ).rejects.toThrow("Could not validate JWT. Invalid JWT signature for key");
  });
});
