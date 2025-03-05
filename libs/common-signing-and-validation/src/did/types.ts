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
