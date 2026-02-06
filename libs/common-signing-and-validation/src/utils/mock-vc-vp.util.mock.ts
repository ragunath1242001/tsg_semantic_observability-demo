import {
  Credential,
  CredentialSubject,
  EnvelopedVerifiableCredential,
  OrArray,
  toArray,
  VerifiableCredential
} from "@tsg-dsp/common-dsp";
import { plainToInstance } from "class-transformer";
import { JWK } from "jose";

import {
  generateSignedDataIntegrityProof,
  generateSignedJwt
} from "../signing/sign.js";

const publicJwk: JWK = {
  crv: "Ed25519",
  x: "mt7dyxIpQ36nxQeO69q0mKbfeNWMDmYWjLUj3PvDdRU",
  kty: "OKP"
};
const privateJwk: JWK = {
  crv: "Ed25519",
  d: "r3i3AEII1Cv97rOIaNifsyw0OSJ1tzY1giR-lgMjCMo",
  x: "mt7dyxIpQ36nxQeO69q0mKbfeNWMDmYWjLUj3PvDdRU",
  kty: "OKP"
};
const publicKeyMultibase = "z6MkpsowBu74vFhAfuM2JipTgFNXemu2x5pQosnwZ5RtpPwz";
export const testDidId = `did:key:${publicKeyMultibase}`;

interface CreateTestVerifiableCredentialOptions {
  credentialType?: string;
  validFrom?: Date;
  validUntil?: Date | false;
}

export async function createTestVerifiableCredential(
  credentialSubject: CredentialSubject,
  format: "vc+jwt",
  options?: CreateTestVerifiableCredentialOptions
): Promise<{ typ: "vc+jwt"; jwt: string }>;
export async function createTestVerifiableCredential(
  credentialSubject: CredentialSubject,
  format: "enveloped",
  options?: CreateTestVerifiableCredentialOptions
): Promise<EnvelopedVerifiableCredential>;
export async function createTestVerifiableCredential(
  credentialSubject: CredentialSubject,
  format: "jwt_vc",
  options?: CreateTestVerifiableCredentialOptions
): Promise<{ typ: "jwt_vc"; jwt: string }>;
export async function createTestVerifiableCredential(
  credentialSubject: CredentialSubject,
  format: "DataIntegrityProof",
  options?: CreateTestVerifiableCredentialOptions
): Promise<VerifiableCredential>;
export async function createTestVerifiableCredential(
  credentialSubject: CredentialSubject = { id: testDidId },
  format: "vc+jwt" | "enveloped" | "jwt_vc" | "DataIntegrityProof" = "vc+jwt",
  options?: CreateTestVerifiableCredentialOptions
): Promise<
  | VerifiableCredential
  | EnvelopedVerifiableCredential
  | { typ: "vc+jwt" | "jwt_vc"; jwt: string }
> {
  const credential: Credential = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    id: `${testDidId}#${crypto.randomUUID()}`,
    type: ["VerifiableCredential"],
    issuer: testDidId,
    validFrom: options?.validFrom
      ? options?.validFrom.toISOString()
      : new Date().toISOString(),
    validUntil:
      options?.validUntil === false
        ? undefined
        : options?.validUntil
          ? options.validUntil.toISOString()
          : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    credentialSubject
  };
  if (options?.credentialType) {
    credential.type.push(options.credentialType);
  }
  switch (format) {
    case "vc+jwt": {
      return {
        typ: "vc+jwt",
        jwt: await generateSignedJwt(credential, testDidId, {
          key: {
            id: publicKeyMultibase,
            signingKey: privateJwk,
            algorithm: "EdDSA"
          },
          iss: true,
          iat: true,
          expiresIn: 3600,
          typ: "vc+jwt",
          cty: "vc"
        })
      };
    }
    case "enveloped": {
      const vpJwt = await generateSignedJwt(credential, testDidId, {
        key: {
          id: publicKeyMultibase,
          signingKey: privateJwk,
          algorithm: "EdDSA"
        },
        iss: true,
        iat: true,
        expiresIn: 3600,
        typ: "vc+jwt",
        cty: "vc"
      });
      return plainToInstance(EnvelopedVerifiableCredential, {
        "@context": ["https://www.w3.org/ns/credentials/v2"],
        id: `data:application/vc+jwt,${vpJwt}`,
        type: ["EnvelopedVerifiableCredential"]
      });
    }
    case "jwt_vc": {
      return {
        typ: "jwt_vc",
        jwt: await generateSignedJwt({ vc: credential }, testDidId, {
          key: {
            id: publicKeyMultibase,
            signingKey: privateJwk,
            algorithm: "EdDSA"
          },
          iss: true,
          iat: true,
          expiresIn: 3600,
          typ: "vc+jwt",
          cty: "vc"
        })
      };
    }
    case "DataIntegrityProof": {
      const proof = await generateSignedDataIntegrityProof(
        credential,
        testDidId,
        publicKeyMultibase,
        publicJwk,
        privateJwk,
        "EdDSA",
        "assertionMethod",
        "RDFC"
      );
      return {
        ...credential,
        proof
      };
    }
  }
}

export async function createTestVerifiablePresentation(
  credential?: OrArray<
    | VerifiableCredential
    | EnvelopedVerifiableCredential
    | { typ: "vc+jwt" | "jwt_vc"; jwt: string }
  >,
  format: "vp+jwt" | "enveloped" | "jwt_vp" = "vp+jwt"
): Promise<any> {
  const credentials = toArray(credential).map((c) => {
    if ("jwt" in c) {
      return plainToInstance(EnvelopedVerifiableCredential, {
        "@context": ["https://www.w3.org/ns/credentials/v2"],
        id: `data:application/vc+jwt,${c.jwt}`,
        type: ["EnvelopedVerifiableCredential"]
      });
    } else {
      return c;
    }
  });
  switch (format) {
    case "vp+jwt": {
      return {
        typ: "vp+jwt",
        jwt: await generateSignedJwt(
          {
            "@context": ["https://www.w3.org/ns/credentials/v2"],
            type: ["VerifiablePresentation"],
            id: `${testDidId}#${crypto.randomUUID()}`,
            verifiableCredential: credentials
          },
          testDidId,
          {
            key: {
              id: publicKeyMultibase,
              signingKey: privateJwk,
              algorithm: "EdDSA"
            },
            iss: true,
            iat: true,
            expiresIn: 24 * 60 * 60, // 24 hours
            typ: "vp+jwt",
            cty: "vp"
          }
        )
      };
    }
    case "enveloped": {
      const vpJwt = await generateSignedJwt(
        { verifiableCredential: credential },
        testDidId,
        {
          key: {
            id: publicKeyMultibase,
            signingKey: privateJwk,
            algorithm: "EdDSA"
          },
          iss: true,
          iat: true,
          expiresIn: 24 * 60 * 60, // 24 hours
          typ: "vp+jwt",
          cty: "vp"
        }
      );
      return plainToInstance(EnvelopedVerifiableCredential, {
        "@context": ["https://www.w3.org/ns/credentials/v2"],
        id: `data:application/vp+jwt,${vpJwt}`,
        type: ["EnvelopedVerifiablePresentation"]
      });
    }
    case "jwt_vp": {
      return {
        vp: await generateSignedJwt(
          { vp: { verifiableCredential: credential } },
          testDidId,
          {
            key: {
              id: publicKeyMultibase,
              signingKey: privateJwk,
              algorithm: "EdDSA"
            },
            iss: true,
            iat: true,
            expiresIn: 24 * 60 * 60, // 24 hours
            typ: "vp+jwt",
            cty: "vp"
          }
        )
      };
    }
  }
}

// it("empty test", () => {});
