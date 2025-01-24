import { signingAlgorithm } from "./keymapping.js";
import { Service, VerificationMethod } from "did-resolver";
import { KeyMaterialDao } from "../model/credentials.dao.js";
import { DidServiceConfig } from "../config.js";
import { jwkToMultibase } from "./keys/keyconverter.js";

export enum DIDMethod {
  WEB = "did:web:",
  TDW = "did:tdw:",
  KEY = "did:key:"
}
export type DIDMethodTypes = DIDMethod.WEB | DIDMethod.TDW | DIDMethod.KEY;
export const DIDMethodList: string[] = [DIDMethod.WEB, DIDMethod.TDW];
export const VERIFICATION_METHOD_CONTEXT = [
  "https://w3id.org/security/suites/jws-2020/v1",
  "https://w3id.org/security/multikey/v1"
];
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
