export interface CredentialOffer {
  credential_issuer: string;
  credential_configuration_ids: string[];
  grants?: {
    [OfferGrants.PRE_AUTHORIZATION_CODE]?: PreAuthorizationCodeGrant;
    [OfferGrants.AUTHORIZATION_CODE]?: AuthorizationCode;
  };
}

export enum OfferGrants {
  AUTHORIZATION_CODE = "authorization_code",
  PRE_AUTHORIZATION_CODE = "urn:ietf:params:oauth:grant-type:pre-authorized_code",
}

export interface AuthorizationCode {
  issuer_state?: string;
  authorization_server?: string;
}

export interface PreAuthorizationCodeGrant {
  "pre-authorization_code": string;
  tx_code?: {
    input_mode?: "numeric" | "text";
    length?: number;
    description?: string;
  };
  interval?: number;
  authorization_server?: string;
}

export interface AccessToken {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  c_nonce?: string;
  c_nonce_expires_in?: number;
}

export interface CredentialRequest {
  format: "jwt_vc_json-ld";
  proof: JwtProof | CwtProof | LdpVpProof;
}

export interface JwtProof {
  proof_type: "jwt";
  jwt: string;
}

export interface CwtProof {
  proof_type: "cbt";
  cbt: string;
}

export interface LdpVpProof {
  proof_type: "ldp_vp";
  ldp_vp: VpProof;
}

export interface VpProof {
  "@context": string[];
  type: string[];
  holder: string;
  proof: DataIntegrityProof;
}

export interface DataIntegrityProof {
  id?: string;
  type: "DataIntegrityProof";
  cryptosuite: string;
  proofPurpose: "authentication";
  verificationMethod: string;
  created?: string;
  expires?: string;
  domain?: string;
  challenge?: string;
  proofValue: string; 
}

export type CredentialResponse =
  | ImmediateCredentialResponse
  | DeferredCredentialResponse;

export interface ImmediateCredentialResponse {
  credential: string;
  c_nonce?: string;
  c_nonce_expires_in?: number;
}

export interface DeferredCredentialResponse {
  transaction_id: string;
  c_nonce?: string;
  c_nonce_expires_in?: number;
}
