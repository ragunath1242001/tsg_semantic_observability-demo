import { signingAlgorithm } from "@tsg-dsp/common-signing-and-validation";
import { jwkToMultibase } from "@tsg-dsp/common-signing-and-validation";
import { Service, VerificationMethod } from "did-resolver";

import { DidServiceConfig } from "../config.js";
import { KeyMaterialDao } from "../model/credentials.dao.js";

export function createVerificationMethods(
  didId: string,
  KeyMaterialDao: KeyMaterialDao[],
  keyFormat: "JWK" | "Multikey"
): VerificationMethod[] {
  return KeyMaterialDao.map((key) => {
    if (keyFormat === "Multikey") {
      return {
        id: key.id,
        type: "Multikey",
        controller: didId,
        publicKeyMultibase: jwkToMultibase(key.publicKey)
      };
    } else {
      return {
        id: `${didId}#${key.id}`,
        type: "JsonWebKey2020",
        controller: didId,
        publicKeyJwk: {
          alg: signingAlgorithm(key.type),
          kty: key.publicKey.kty ?? "",
          ...key.publicKey
        }
      };
    }
  });
}
export function createServices(services: DidServiceConfig[]): Service[] {
  return services.map((s) => {
    return {
      id: s.id,
      type: s.type,
      serviceEndpoint: s.serviceEndpoint
    };
  });
}
