import { DataIntegrityProof } from "@tsg-dsp/common-dsp";
import { plainToInstance } from "class-transformer";
import { CompactSign, importJWK, JWK, JWTPayload, SignJWT } from "jose";

import { canonizeAndHash } from "../utils/canonization.js";
import { getCryptoSuite } from "../utils/cryptosuite.js";
import { computeProofConfigHash } from "../utils/hash.js";
import { jwkToMultibase } from "../utils/keyconverter.js";
import { signingAlgorithm } from "../utils/keymapping.js";
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
  container: object,
  didId: string,
  options: {
    key: {
      id: string;
      signingKey: JWK;
      algorithm: "EdDSA" | "ES384" | "X509";
    };
    audience?: string | string[];
    iat?: boolean;
    expiresIn?: number | Date;
    iss?: boolean;
    jti?: string;
    nonce?: string;
    typ?: string;
    cty?: string;
    subject?: boolean | string;
  }
) {
  const payload: JWTPayload = {
    ...container
  };
  if (options.audience) {
    payload.aud = options.audience;
  }
  if (options.iat !== false) {
    payload.iat = Math.floor(Date.now() / 1000);
  }
  if (options.expiresIn) {
    if (typeof options.expiresIn === "number") {
      payload.exp = Math.floor(Date.now() / 1000) + options.expiresIn;
    } else {
      payload.exp = Math.floor(options.expiresIn.getTime() / 1000);
    }
  }
  if (options.iss) {
    payload.iss = didId;
  }
  if (options.jti) {
    payload.jti = options.jti;
  }
  if (options.nonce) {
    payload.nonce = options.nonce;
  }
  if (options.subject) {
    payload.sub = options.subject === true ? didId : options.subject;
  }
  const jwt = new SignJWT(payload).setProtectedHeader({
    alg: signingAlgorithm(options.key.algorithm),
    kid: `${didId}#${options.key.id}`,
    typ: options.typ,
    cty: options.cty
  });
  return await jwt.sign(
    await importJWK(options.key.signingKey, options.key.algorithm)
  );
}
export async function generateSignedDataIntegrityProof(
  document: any,
  didId: string,
  id: string,
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
    verificationMethod = `${didId}#${id}`;
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
