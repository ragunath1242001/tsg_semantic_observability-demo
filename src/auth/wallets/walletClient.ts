
export interface VerifiablePresentationJwt {
  vp: string
}

export interface ValidationResult {
  [key: string]: boolean | boolean[]
}

export abstract class WalletClient {
  abstract requestVerifiablePresentation(audience: string): Promise<VerifiablePresentationJwt>
  abstract requestValidation(jwt: VerifiablePresentationJwt, audience: string): Promise<boolean>
}