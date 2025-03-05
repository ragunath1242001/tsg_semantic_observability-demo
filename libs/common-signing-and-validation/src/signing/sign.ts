import { plainToInstance } from "class-transformer";
import { CompactSign, importJWK, JWK, JWTPayload, SignJWT } from "jose";
import { signingAlgorithm } from "../utils/keymapping.js";
import { DataIntegrityProof, JsonWebSignature2020 } from "@tsg-dsp/common-dsp";
import { computeProofConfigHash } from "../utils/hash.js";
import { canonizeAndHash } from "../utils/canonization.js";
import { jwkToMultibase } from "../utils/keyconverter.js";
import { getCryptoSuite } from "../utils/cryptosuite.js";
import { base64urlToBase58btc } from "../utils/typeconverter.js";

export async function signAsJws(
  hash: Buffer,
  algorithm: "EdDSA" | "ES384" | "X509",
  privateKey: JWK
) {
  const signature = new CompactSign(hash).setProtectedHeader({
    alg: signingAlgorithm(algorithm),
    b64: false,
    crit: ["b64"]
  });
  const privateKeyJWK = await importJWK(privateKey, algorithm);
  return await signature.sign(privateKeyJWK);
}

export async function generateSignedJwt(
  body: JWTPayload,
  identifier: string,
  signingKey: JWK,
  algorithm: "EdDSA" | "ES384" | "X509",
  didId: string,
  audience?: string | string[],
  options?: {
    key?: string;
    subject?: boolean | string;
    expirationTime?: string;
    typ?: string;
    jti?: boolean | string;
  }
) {
  const jwt = new SignJWT(body)
    .setProtectedHeader({
      alg: signingAlgorithm(algorithm),
      kid: `${didId}#${identifier}`,
      typ: options?.typ
    })
    .setIssuedAt()
    .setIssuer(didId);
  if (audience) {
    jwt.setAudience(audience);
  }
  if (options?.subject !== false) {
    if (typeof options?.subject === "string") {
      jwt.setSubject(options.subject);
    } else {
      jwt.setSubject(didId);
    }
  }
  if (options?.expirationTime) {
    jwt.setExpirationTime(options.expirationTime);
  }
  if (options?.jti !== false) {
    if (typeof options?.jti === "string") {
      jwt.setJti(options.jti);
    } else {
      jwt.setJti(crypto.randomUUID());
    }
  }
  return await jwt.sign(await importJWK(signingKey, algorithm));
}

export async function generateSignedDataIntegrityProof(
  document: any,
  didId: string,
  identifier: string,
  publicKey: JWK,
  privateKey: JWK,
  algorithm: "EdDSA" | "ES384" | "X509",
  proofPurpose: string,
  normalization: "RDFC" | "JCS" = "RDFC",
  embeddedVerificationMethod: boolean = false,
  options: Partial<DataIntegrityProof> = {}
) {
  let verificationMethod: string;
  if (embeddedVerificationMethod) {
    const multibase = jwkToMultibase(publicKey, false);
    verificationMethod = `did:key:${multibase}#${multibase}`;
  } else {
    verificationMethod = `${didId}#${identifier}`;
  }
  const documentHash = await canonizeAndHash(document, normalization);
  const proof: Omit<DataIntegrityProof, "proofValue"> = {
    type: "DataIntegrityProof",
    proofPurpose: proofPurpose,
    verificationMethod: verificationMethod,
    cryptosuite: getCryptoSuite(algorithm, normalization),
    created: new Date().toISOString(),
    ...options
  };
  const proofConfigHash = await computeProofConfigHash(
    proof,
    normalization,
    document["@context"],
    "https://w3id.org/security/data-integrity/v2"
  );
  const hash = Buffer.concat([proofConfigHash, documentHash]);
  const jws = await signAsJws(hash, algorithm, privateKey);
  return plainToInstance(DataIntegrityProof, {
    ...proof,
    proofValue: base64urlToBase58btc(jws.split(".")[2])
  });
}

export async function generateSignedJsonWebSignature2020(
  document: any,
  didId: string,
  identifier: string,
  signingKey: JWK,
  algorithm: "EdDSA" | "ES384" | "X509",
  proofPurpose: string
) {
  const verificationMethod = `${didId}#${identifier}`;
  const documentHash = await canonizeAndHash(document, "RDFC");
  const proofConfig: Omit<JsonWebSignature2020, "jws"> = {
    type: "JsonWebSignature2020",
    created: new Date().toISOString(),
    proofPurpose: proofPurpose,
    verificationMethod: verificationMethod
  };
  const proofConfigHash = await computeProofConfigHash(
    proofConfig,
    "RDFC",
    document["@context"],
    "https://w3id.org/security/suites/jws-2020/v1"
  );
  const combinedHash = Buffer.concat([proofConfigHash, documentHash]);
  const jws = await signAsJws(combinedHash, algorithm, signingKey);
  return plainToInstance(JsonWebSignature2020, {
    ...proofConfig,
    jws
  });
}
