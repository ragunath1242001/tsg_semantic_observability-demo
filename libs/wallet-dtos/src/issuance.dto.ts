import { CredentialSubject } from "@tsg-dsp/common-dsp";
import {
  ApiExtraModels,
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath
} from "@nestjs/swagger";

export class CredentialOfferRequest {
  @ApiProperty()
  holderId!: string;

  @ApiProperty()
  credentialType!: string;

  @ApiProperty({ type: () => CredentialSubject })
  credentialSubject!: CredentialSubject;

  @ApiPropertyOptional()
  preAuthorizedCode?: string;
}

export enum OfferGrants {
  AUTHORIZATION_CODE = "authorization_code",
  PRE_AUTHORIZATION_CODE = "urn:ietf:params:oauth:grant-type:pre-authorized_code"
}
export class AuthorizationCode {
  @ApiPropertyOptional()
  issuer_state?: string;

  @ApiPropertyOptional()
  authorization_server?: string;
}

export class TransactionCode {
  @ApiPropertyOptional()
  input_mode?: "numeric" | "text";

  @ApiPropertyOptional()
  length?: number;

  @ApiPropertyOptional()
  description?: string;
}

export class PreAuthorizationCodeGrant {
  @ApiProperty()
  "pre-authorization_code": string;

  @ApiPropertyOptional({ type: () => TransactionCode })
  tx_code?: TransactionCode;

  @ApiPropertyOptional()
  interval?: number;

  @ApiPropertyOptional()
  authorization_server?: string;
}

export class CredentialOfferGrants {
  @ApiPropertyOptional({ type: () => PreAuthorizationCodeGrant })
  [OfferGrants.PRE_AUTHORIZATION_CODE]?: PreAuthorizationCodeGrant;

  @ApiPropertyOptional({ type: () => AuthorizationCode })
  [OfferGrants.AUTHORIZATION_CODE]?: AuthorizationCode;
}

export class CredentialOffer {
  @ApiProperty()
  credential_issuer!: string;

  @ApiProperty({ type: [String] })
  credential_configuration_ids!: string[];

  @ApiPropertyOptional({ type: () => CredentialOfferGrants })
  grants?: CredentialOfferGrants;
}

export class CredentialOfferStatus {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  created!: Date;

  @ApiProperty()
  preAuthorizedCode!: string;

  @ApiProperty()
  holderId!: string;

  @ApiProperty()
  credentialType!: string;

  @ApiPropertyOptional()
  credentialId?: string;

  @ApiProperty()
  revoked!: boolean;

  @ApiProperty({ type: () => CredentialSubject })
  credentialSubject!: CredentialSubject;
}

export class AccessToken {
  @ApiProperty()
  access_token!: string;

  @ApiPropertyOptional()
  token_type?: string;

  @ApiPropertyOptional()
  expires_in?: number;

  @ApiPropertyOptional()
  refresh_token?: string;

  @ApiPropertyOptional()
  c_nonce?: string;

  @ApiPropertyOptional()
  c_nonce_expires_in?: number;

  @ApiProperty({ type: () => [AuthorizationDetail] })
  authorization_details!: AuthorizationDetail[];
}

export class AuthorizationDetail {
  @ApiProperty()
  type!: "openid_credential";

  @ApiProperty()
  credential_configuration_id!: string;

  @ApiProperty({ type: [String] })
  credential_identifiers!: string[];
}

export class JwtProof {
  @ApiProperty()
  proof_type!: "jwt";

  @ApiProperty()
  jwt!: string;
}

export class CwtProof {
  @ApiProperty()
  proof_type!: "cbt";

  @ApiProperty()
  cbt!: string;
}

export class DataIntegrityProof {
  @ApiPropertyOptional()
  id?: string;

  @ApiProperty()
  type!: "DataIntegrityProof";

  @ApiProperty()
  cryptosuite!: string;

  @ApiProperty()
  proofPurpose!: "authentication";

  @ApiProperty()
  verificationMethod!: string;

  @ApiPropertyOptional()
  created?: string;

  @ApiPropertyOptional()
  expires?: string;

  @ApiPropertyOptional()
  domain?: string;

  @ApiPropertyOptional()
  challenge?: string;

  @ApiProperty()
  proofValue!: string;
}

export class VpProof {
  @ApiProperty({ type: [String] })
  "@context": string[];

  @ApiProperty({ type: [String] })
  type!: string[];

  @ApiProperty()
  holder!: string;

  @ApiProperty({ type: () => DataIntegrityProof })
  proof!: DataIntegrityProof;
}

export class LdpVpProof {
  @ApiProperty()
  proof_type!: "ldp_vp";

  @ApiProperty({ type: () => VpProof })
  ldp_vp!: VpProof;
}

export class BaseDisplay {
  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  locale?: string;
}

export class Image {
  @ApiProperty()
  uri!: string;
}

export class Logo extends Image {
  @ApiPropertyOptional()
  alt_text?: string;
}

export class LogoDisplay extends BaseDisplay {
  @ApiPropertyOptional({ type: () => Logo })
  logo?: Logo;
}

export class ExtendedDisplay extends LogoDisplay {
  @ApiProperty()
  declare name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  background_color?: string;

  @ApiPropertyOptional({ type: () => Image })
  background_image?: Image;

  @ApiPropertyOptional()
  text_color?: string;
}

export class CredentialSubjectElementDefinition {
  @ApiPropertyOptional()
  mandatory?: boolean;

  @ApiPropertyOptional()
  value_type?: string;

  @ApiPropertyOptional({ type: () => [BaseDisplay] })
  display?: BaseDisplay[];
}

export class CredentialSubjectDefinition {
  [name: string]:
    | CredentialSubjectElementDefinition
    | CredentialSubjectDefinition;
}

export class CredentialDefinition {
  @ApiProperty({ type: [String] })
  "@context": string[];

  @ApiProperty({ type: [String] })
  type!: string[];

  @ApiPropertyOptional({ type: () => CredentialSubjectDefinition })
  credentialSubject?: CredentialSubjectDefinition;
}

@ApiExtraModels(JwtProof, CwtProof, LdpVpProof)
export class CredentialRequest {
  @ApiProperty({ enum: ["jwt_vc_json-ld", "jwt_vc_json"] })
  format!: "jwt_vc_json-ld" | "jwt_vc_json";

  @ApiProperty({ type: () => CredentialDefinition })
  credential_definition!: CredentialDefinition;

  @ApiProperty({
    oneOf: [
      { $ref: getSchemaPath(JwtProof) },
      { $ref: getSchemaPath(CwtProof) },
      { $ref: getSchemaPath(LdpVpProof) }
    ]
  })
  proof!: JwtProof | CwtProof | LdpVpProof;

  [key: string]: any;
}

export type CredentialResponse =
  | ImmediateCredentialResponse
  | DeferredCredentialResponse;

export class ImmediateCredentialResponse {
  @ApiProperty()
  credential!: string;

  @ApiPropertyOptional()
  c_nonce?: string;

  @ApiPropertyOptional()
  c_nonce_expires_in?: number;
}

export class DeferredCredentialResponse {
  @ApiProperty()
  transaction_id!: string;

  @ApiPropertyOptional()
  c_nonce?: string;

  @ApiPropertyOptional()
  c_nonce_expires_in?: number;
}

export class CredentialResponseEncryption {
  @ApiProperty({ type: [String] })
  alg_values_supported!: string[];

  @ApiProperty({ type: [String] })
  enc_values_supported!: string[];

  @ApiProperty()
  encryption_required!: boolean;
}

export class CredentialConfiguration {
  @ApiProperty()
  format!: string;

  @ApiProperty({ type: [String] })
  "@context": string[];

  @ApiPropertyOptional()
  scope?: string;

  @ApiPropertyOptional({ type: [String] })
  cryptographic_binding_methods_supported?: string[];

  @ApiPropertyOptional({ type: [String] })
  credential_signing_alg_values_supported?: string[];

  @ApiPropertyOptional({
    type: "object",
    additionalProperties: {
      type: "object",
      properties: {
        proof_signing_alg_values_supported: {
          type: "array",
          items: { type: "string" }
        }
      }
    }
  })
  proof_types_supported?: {
    [id: string]: {
      proof_signing_alg_values_supported: string[];
    };
  };

  @ApiProperty()
  credential_definition!: CredentialDefinition;

  @ApiPropertyOptional({ type: () => [ExtendedDisplay] })
  display?: ExtendedDisplay[];
}

@ApiExtraModels(CredentialConfiguration)
export class CredentialIssuerMetadata {
  @ApiProperty()
  credential_issuer!: string;

  @ApiPropertyOptional({ type: [String] })
  authorization_servers?: string[];

  @ApiPropertyOptional()
  token_endpoint?: string;

  @ApiProperty()
  credential_endpoint!: string;

  @ApiPropertyOptional()
  batch_credential_endpoint?: string;

  @ApiPropertyOptional()
  deferred_credential_endpoint?: string;

  @ApiPropertyOptional()
  notification_endpoint?: string;

  @ApiPropertyOptional({ type: () => CredentialResponseEncryption })
  credential_response_encryption?: CredentialResponseEncryption;

  @ApiPropertyOptional()
  credential_identifiers_supported?: boolean;

  @ApiPropertyOptional()
  signed_metadata?: string;

  @ApiPropertyOptional({ type: () => [LogoDisplay] })
  display?: LogoDisplay[];

  @ApiProperty({
    type: "object",
    additionalProperties: { $ref: getSchemaPath(CredentialConfiguration) }
  })
  credential_configurations_supported!: {
    [id: string]: CredentialConfiguration;
  };
}
