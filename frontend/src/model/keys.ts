import { JWK } from "jose"


export interface KeyMaterials {
  id: string
  type: 'EdDSA' | 'ES384' | 'X509'
  default: boolean
  publicKey: JWK
  created: Date
  modified: Date
}
