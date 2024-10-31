import { keyTypes, signingAlgorithm } from "./keymapping.js";
import { Service, VerificationMethod } from "did-resolver";
import { KeyMaterials } from "../model/credentials.dao.js";
import { DidServiceConfig } from "../config.js";

export enum DIDMethod {
  WEB = "did:web:",
  TDW = "did:tdw:"
}
export type DIDMethodTypes = DIDMethod.WEB | DIDMethod.TDW;
export const DIDMethodList: string[] = Object.values(DIDMethod);
export const VERIFICATION_METHOD_CONTEXT = [
  "https://w3id.org/security/suites/jws-2020/v1"
];
export function createVerificationMethods(
  didId: string,
  keyMaterials: KeyMaterials[]
): VerificationMethod[] {
  return keyMaterials.map((key) => {
    return {
      id: `${didId}#${key.id}`,
      type: "JsonWebKey2020",
      controller: didId,
      publicKeyJwk: {
        kty: keyTypes(key.type),
        alg: signingAlgorithm(key.type),
        ...key.publicKey
      }
    };
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
