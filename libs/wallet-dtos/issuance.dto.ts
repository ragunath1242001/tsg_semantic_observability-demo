import { CredentialSubject } from "@tsg-dsp/common";

export interface CredentialOfferRequest {
  holderId: string;
  credentialType: string;
  credentialSubject: CredentialSubject;
  preAuthorizedCode?: string;
}

export interface CredentialOffer {
  credential_issuer: string;
  credential_configuration_ids: string[];
  grants?: {
    [OfferGrants.PRE_AUTHORIZATION_CODE]?: PreAuthorizationCodeGrant;
    [OfferGrants.AUTHORIZATION_CODE]?: AuthorizationCode;
  };
}

export interface CredentialOfferStatus {
  id: number;
  created: Date;
  preAuthorizedCode: string;
  holderId: string;
  credentialType: string;
  credentialId?: string;
  revoked: boolean;
  credentialSubject: CredentialSubject;
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
  authorization_details: AuthorizationDetail[];
}

export interface AuthorizationDetail {
  type: "openid_credential";
  credential_configuration_id: string;
  credential_identifiers: string[];
}

export interface CredentialRequest {
  format: "jwt_vc_json-ld";
  credential_definition: CredentialDefinition;
  proof: JwtProof | CwtProof | LdpVpProof;
}

export interface CredentialDefinition {
  "@context": string[];
  type: string[];
  credentialSubject?: CredentialSubjectDefinition;
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

export interface CredentialIssuerMetadata {
  credential_issuer: string;
  authorization_servers?: string[];
  token_endpoint?: string;
  credential_endpoint: string;
  batch_credential_endpoint?: string;
  deferred_credential_endpoint?: string;
  notification_endpoint?: string;
  credential_response_encryption?: {
    alg_values_supported: string[];
    enc_values_supported: string[];
    encryption_required: boolean;
  };
  credential_identifiers_supported?: boolean;
  signed_metadata?: string;
  display?: LogoDisplay[];
  credential_configurations_supported: {
    [id: string]: CredentialConfiguration;
  };
}

export interface CredentialConfiguration {
  format: string;
  "@context": string[];
  scope?: string;
  cryptographic_binding_methods_supported?: string[];
  credential_signing_alg_values_supported?: string[];
  proof_types_supported?: {
    [id: string]: {
      proof_signing_alg_values_supported: string[];
    };
  };
  credential_definition: CredentialDefinition;
  display?: ExtendedDisplay[];
}

export type CredentialSubjectDefinition = {
  [name: string]:
    | CredentialSubjectElementDefinition
    | CredentialSubjectDefinition;
};

export interface CredentialSubjectElementDefinition {
  mandatory?: boolean;
  value_type?: string;
  display?: BaseDisplay[];
}

export interface BaseDisplay {
  name?: string;
  locale?: string;
}

export interface LogoDisplay extends BaseDisplay {
  logo?: {
    uri: string;
    alt_text?: string;
  };
}

export interface ExtendedDisplay extends LogoDisplay {
  name: string;
  description?: string;
  background_color?: string;
  background_image?: {
    uri: string;
  };
  text_color?: string;
}
