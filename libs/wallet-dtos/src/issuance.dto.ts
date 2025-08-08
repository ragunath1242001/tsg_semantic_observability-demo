import {
  ApiExtraModels,
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath
} from "@nestjs/swagger";
import { CredentialSubject, VerifiableCredential } from "@tsg-dsp/common-dsp";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  ValidateNested
} from "class-validator";

export enum CredentialFormat {
  JWT_VC_JSON = "jwt_vc_json",
  JWT_VC_JSON_LD = "jwt_vc_json-ld",
  LDP_VC = "ldp_vc",
  ISO_MSO_MDOC = "iso_mso_mdoc"
}

export enum ProofType {
  JWT = "jwt",
  DI_VP = "di_vp",
  ATTESTATION = "attestation"
}

export class DCPCredentialRequestInitiation {
  @ApiProperty({
    example: "did:web:issuer.example",
    pattern: "^did:[a-z0-9]+:.*"
  })
  @IsString()
  @Matches(/^did:[a-z0-9]+:.*/)
  issuerId!: string;

  @ApiProperty({ example: "pre-auth-code-xyz" })
  @IsString()
  preAuthorizedCode!: string;

  @ApiProperty({ example: ["ExampleCredential"] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  credentialType!: string[];
}

export class AuthorizedRequestParams {
  @ApiProperty({ example: "access-token" })
  @IsString()
  accessToken!: string;

  @ApiProperty({ example: "credential-type" })
  @IsString()
  credentialIdentifier!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  additionalRequestParams?: Record<string, unknown>;
}

export class OID4VCICredentialRequestInitiation {
  @ApiProperty({ example: "https://issuer.example.com" })
  @IsString()
  issuerUrl!: string;

  @ApiPropertyOptional({ example: "pre-auth-code-xyz" })
  @IsString()
  @IsOptional()
  preAuthorizedCode?: string;

  @ApiPropertyOptional({
    type: () => AuthorizedRequestParams
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AuthorizedRequestParams)
  authorized?: AuthorizedRequestParams;
}

export class CredentialOfferRequest {
  @ApiPropertyOptional({ example: "holder-123" })
  holderId?: string;

  @ApiProperty({ example: "sample-credential-type" })
  credentialType!: string;

  @ApiProperty({
    type: () => CredentialSubject,
    example: { id: "subject-id", name: "Sample Subject" }
  })
  credentialSubject!: CredentialSubject;

  @ApiPropertyOptional({ example: "preauth-code-abc" })
  preAuthorizedCode?: string;
}

export enum OfferGrants {
  AUTHORIZATION_CODE = "authorization_code",
  PRE_AUTHORIZED_CODE = "urn:ietf:params:oauth:grant-type:pre-authorized_code"
}

export class AuthorizationCode {
  @ApiPropertyOptional({ example: "issuer-state-example" })
  issuer_state?: string;

  @ApiPropertyOptional({ example: "authorization-server-example" })
  authorization_server?: string;
}

export class TransactionCode {
  @ApiPropertyOptional({ example: "text" })
  input_mode?: "numeric" | "text";

  @ApiPropertyOptional({ example: 6 })
  length?: number;

  @ApiPropertyOptional({ example: "Enter transaction code" })
  description?: string;
}

export class PreAuthorizedCodeGrant {
  @ApiProperty({ example: "pre-auth-code-xyz" })
  "pre-authorized_code": string;

  @ApiPropertyOptional({
    type: () => TransactionCode,
    example: {
      input_mode: "numeric",
      length: 4,
      description: "Sample transaction code"
    }
  })
  tx_code?: TransactionCode;

  @ApiPropertyOptional({ example: 30 })
  interval?: number;

  @ApiPropertyOptional({ example: "authorization-server-sample" })
  authorization_server?: string;
}

export class CredentialOfferGrants {
  @ApiPropertyOptional({
    type: () => PreAuthorizedCodeGrant,
    example: {
      "pre-authorized_code": "pre-auth-code-xyz",
      tx_code: {
        input_mode: "numeric",
        length: 4,
        description: "Sample transaction code"
      },
      interval: 30,
      authorization_server: "authorization-server-sample"
    }
  })
  [OfferGrants.PRE_AUTHORIZED_CODE]?: PreAuthorizedCodeGrant;

  @ApiPropertyOptional({
    type: () => AuthorizationCode,
    example: {
      issuer_state: "issuer-state-example",
      authorization_server: "authorization-server-example"
    }
  })
  [OfferGrants.AUTHORIZATION_CODE]?: AuthorizationCode;
}

export class CredentialOffer {
  @ApiProperty({ example: "credential-issuer-sample" })
  credential_issuer!: string;

  @ApiProperty({
    type: [String],
    example: ["config-id-1", "config-id-2"]
  })
  credential_configuration_ids!: string[];

  @ApiPropertyOptional({
    type: () => CredentialOfferGrants,
    example: {
      "urn:ietf:params:oauth:grant-type:pre-authorized_code": {
        "pre-authorized_code": "pre-auth-code-xyz",
        tx_code: {
          input_mode: "numeric",
          length: 4,
          description: "Sample transaction code"
        },
        interval: 30,
        authorization_server: "authorization-server-sample"
      }
    }
  })
  grants?: CredentialOfferGrants;
}

export class CredentialOfferStatus {
  @ApiProperty({ example: "1f05bade-80ff-4637-9743-5a5e9b1cc162" })
  id!: string;

  @ApiProperty({ example: "2023-10-01T00:00:00Z" })
  createdDate!: Date;

  @ApiProperty({ example: "preauth-code-abc" })
  preAuthorizedCode!: string;

  @ApiPropertyOptional({ example: "holder-123" })
  holderId?: string;

  @ApiProperty({ example: "sample-credential-type" })
  credentialType!: string;

  @ApiPropertyOptional({ example: "credential-id-xyz" })
  credentialId?: string;

  @ApiProperty({ example: false })
  revoked!: boolean;

  @ApiProperty({
    type: () => CredentialSubject,
    example: { id: "subject-id", name: "Sample Subject" }
  })
  credentialSubject!: CredentialSubject;

  @ApiPropertyOptional({ example: "remote-id-123" })
  remoteId?: string;

  constructor(value: Partial<CredentialOfferStatus>) {
    Object.assign(this, value);
  }
}

export class AccessToken {
  @ApiProperty({ example: "access-token-sample" })
  access_token!: string;

  @ApiPropertyOptional({ example: "Bearer" })
  token_type?: string;

  @ApiPropertyOptional({ example: 3600 })
  expires_in?: number;

  @ApiPropertyOptional({ example: "refresh-token-sample" })
  refresh_token?: string;

  @ApiProperty({
    type: () => [AuthorizationDetail],
    example: [
      {
        type: "openid_credential",
        credential_configuration_id: "cred-config-123",
        credential_identifiers: ["id1", "id2"]
      }
    ]
  })
  authorization_details!: AuthorizationDetail[];
}

export class AuthorizationDetail {
  @ApiProperty({ example: "openid_credential" })
  type!: "openid_credential";

  @ApiProperty({ example: "cred-config-123" })
  credential_configuration_id!: string;

  @ApiProperty({ example: ["id1", "id2"] })
  credential_identifiers!: string[];
}

export class JwtProof {
  @ApiProperty({ enum: ProofType, example: ProofType.JWT })
  @IsString()
  proof_type!: ProofType.JWT;

  @ApiProperty({ example: "jwt-token-sample" })
  @IsString()
  jwt!: string;
}

export class DataIntegrityProof {
  @ApiPropertyOptional({ example: "proof-id-sample" })
  id?: string;

  @ApiProperty({ example: "DataIntegrityProof" })
  type!: "DataIntegrityProof";

  @ApiProperty({ example: "eddsa" })
  cryptosuite!: string;

  @ApiProperty({ example: "authentication" })
  proofPurpose!: "authentication";

  @ApiProperty({ example: "verification-method-sample" })
  verificationMethod!: string;

  @ApiPropertyOptional({ example: "2023-10-10T00:00:00Z" })
  created?: string;

  @ApiPropertyOptional({ example: "2023-10-20T00:00:00Z" })
  expires?: string;

  @ApiPropertyOptional({ example: "example.com" })
  domain?: string;

  @ApiPropertyOptional({ example: "challenge-sample" })
  challenge?: string;

  @ApiProperty({ example: "proof-value-sample" })
  proofValue!: string;
}

export class VpProof {
  @ApiProperty({ example: ["https://www.w3.org/ns/credentials/v2"] })
  "@context": string[];

  @ApiProperty({ example: ["VerifiablePresentation"] })
  type!: string[];

  @ApiProperty({ example: "holder-sample" })
  holder!: string;

  @ApiProperty({
    type: () => DataIntegrityProof,
    example: {
      id: "proof-id-sample",
      type: "DataIntegrityProof",
      cryptosuite: "eddsa",
      proofPurpose: "authentication",
      verificationMethod: "verification-method-sample",
      created: "2023-10-10T00:00:00Z",
      expires: "2023-10-20T00:00:00Z",
      domain: "example.com",
      challenge: "challenge-sample",
      proofValue: "proof-value-sample"
    }
  })
  proof!: DataIntegrityProof;
}

export class DiVpProof {
  @ApiProperty({ enum: ProofType, example: ProofType.DI_VP })
  @IsString()
  proof_type!: ProofType.DI_VP;

  @ApiProperty({
    type: () => VpProof,
    example: {
      "@context": ["https://www.w3.org/ns/credentials/v2"],
      type: ["VerifiablePresentation"],
      holder: "holder-sample",
      proof: {
        id: "proof-id-sample",
        type: "DataIntegrityProof",
        cryptosuite: "eddsa",
        proofPurpose: "authentication",
        verificationMethod: "verification-method-sample",
        created: "2023-10-10T00:00:00Z",
        expires: "2023-10-20T00:00:00Z",
        domain: "example.com",
        challenge: "challenge-sample",
        proofValue: "proof-value-sample"
      }
    }
  })
  @ValidateNested()
  @Type(() => VpProof)
  di_vp!: VpProof;
}

export class AttestationProof {
  @ApiProperty({ enum: ProofType, example: ProofType.ATTESTATION })
  @IsString()
  proof_type!: ProofType.ATTESTATION;

  @ApiProperty({
    example: "eyJ0eXAiOiJrZXktYXR0ZXN0YXRpb24rand0IiwiYWxnIjoiRVMyNTYifQ..."
  })
  @IsString()
  attestation!: string;
}

export class BaseDisplay {
  @ApiPropertyOptional({ example: "Display Name" })
  name?: string;

  @ApiPropertyOptional({ example: "en-US" })
  locale?: string;
}

export class Image {
  @ApiProperty({ example: "https://example.com/image.png" })
  uri!: string;
}

export class Logo extends Image {
  @ApiPropertyOptional({ example: "Logo alt text" })
  alt_text?: string;
}

export class LogoDisplay extends BaseDisplay {
  @ApiPropertyOptional({
    type: () => Logo,
    example: { uri: "https://example.com/logo.png", alt_text: "Logo alt text" }
  })
  logo?: Logo;
}

export class ExtendedDisplay extends LogoDisplay {
  @ApiProperty({ example: "Extended Display Name" })
  declare name: string;

  @ApiPropertyOptional({ example: "Extended display description" })
  description?: string;

  @ApiPropertyOptional({ example: "#ffffff" })
  background_color?: string;

  @ApiPropertyOptional({
    type: () => Image,
    example: { uri: "https://example.com/background.png" }
  })
  background_image?: Image;

  @ApiPropertyOptional({ example: "#000000" })
  text_color?: string;
}

export class ClaimDescription {
  @ApiProperty({
    type: "array",
    items: {
      oneOf: [{ type: "string" }, { type: "null" }]
    },
    example: ["name", null]
  })
  path!: (string | null)[];

  @ApiPropertyOptional({ example: true })
  mandatory?: boolean;

  @ApiPropertyOptional({
    type: () => [BaseDisplay],
    example: [{ name: "Full Name", locale: "en-US" }]
  })
  display?: BaseDisplay[];
}

export class CredentialMetadata {
  @ApiPropertyOptional({
    type: () => [ExtendedDisplay],
    example: [
      {
        name: "University Degree",
        locale: "en-US",
        description: "A verified university degree credential",
        background_color: "#ffffff",
        text_color: "#000000",
        logo: {
          uri: "https://example.com/logo.png",
          alt_text: "Logo alt text"
        }
      }
    ]
  })
  display?: ExtendedDisplay[];

  @ApiPropertyOptional({
    type: () => [ClaimDescription],
    example: [
      {
        path: ["name"],
        mandatory: true,
        display: [{ name: "Full Name", locale: "en-US" }]
      },
      {
        path: ["degree"],
        mandatory: true,
        display: [{ name: "Degree", locale: "en-US" }]
      },
      {
        path: ["id"],
        mandatory: false,
        display: [{ name: "Student ID", locale: "en-US" }]
      }
    ]
  })
  claims?: ClaimDescription[];
}

export class CredentialDefinition {
  @ApiPropertyOptional({
    type: [String],
    example: ["https://www.w3.org/ns/credentials/v2"]
  })
  "@context"?: string[];

  @ApiProperty({
    type: [String],
    example: ["VerifiableCredential", "UniversityDegree"]
  })
  type!: string[];
}

@ApiExtraModels(JwtProof, DiVpProof, AttestationProof)
export class CredentialRequest {
  @ApiPropertyOptional({ example: "credential-identifier-123" })
  @IsOptional()
  @IsString()
  credential_identifier?: string;

  @ApiPropertyOptional({ example: "credential-config-id-123" })
  @IsOptional()
  @IsString()
  credential_configuration_id?: string;

  @ApiPropertyOptional({
    type: "array",
    items: {
      oneOf: [
        { $ref: getSchemaPath(JwtProof) },
        { $ref: getSchemaPath(DiVpProof) },
        { $ref: getSchemaPath(AttestationProof) }
      ]
    },
    example: [{ proof_type: "jwt", jwt: "jwt-token-sample" }]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  proofs?: (JwtProof | DiVpProof | AttestationProof)[];

  @ApiPropertyOptional({
    type: "object",
    properties: {
      jwk: { type: "object", additionalProperties: true },
      enc: { type: "string" },
      zip: { type: "string" }
    },
    example: {
      jwk: { kty: "EC", crv: "P-256" },
      enc: "A256GCM"
    }
  })
  credential_response_encryption?: {
    jwk: Record<string, unknown>;
    enc: string;
    zip?: string;
  };
}

export type CredentialResponse =
  | ImmediateCredentialResponse
  | DeferredCredentialResponse;

@ApiExtraModels(VerifiableCredential)
export class CredentialItem {
  @ApiProperty({
    example: "credential-token-sample",
    oneOf: [{ type: "string" }, { $ref: getSchemaPath(VerifiableCredential) }]
  })
  credential!: string | VerifiableCredential;
}

export class ImmediateCredentialResponse {
  @ApiProperty({
    type: () => [CredentialItem],
    example: [{ credential: "credential-token-sample" }]
  })
  credentials!: CredentialItem[];

  @ApiPropertyOptional({ example: "notification-id-123" })
  notification_id?: string;
}

export class DeferredCredentialResponse {
  @ApiProperty({ example: "tx-id-sample" })
  transaction_id!: string;

  @ApiProperty({ example: 3600 })
  interval!: number;
}

export class CredentialResponseEncryption {
  @ApiProperty({
    type: [String],
    example: ["RSA-OAEP"]
  })
  alg_values_supported!: string[];

  @ApiProperty({
    type: [String],
    example: ["A256GCM"]
  })
  enc_values_supported!: string[];

  @ApiProperty({ example: true })
  encryption_required!: boolean;
}

export class CredentialRequestEncryption {
  @ApiProperty({
    type: "object",
    additionalProperties: true,
    example: { kty: "EC", crv: "P-256" }
  })
  jwks!: Record<string, unknown>;

  @ApiProperty({
    type: [String],
    example: ["A256GCM"]
  })
  enc_values_supported!: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ["gzip"]
  })
  zip_values_supported?: string[];

  @ApiProperty({ example: false })
  encryption_required!: boolean;
}

export class BatchCredentialIssuance {
  @ApiProperty({ example: 10 })
  batch_size!: number;
}

export class CredentialConfiguration {
  @ApiProperty({
    enum: CredentialFormat,
    example: CredentialFormat.JWT_VC_JSON
  })
  format!: CredentialFormat;

  @ApiProperty({
    type: [String],
    example: ["https://www.w3.org/ns/credentials/v2"]
  })
  "@context"?: string[];

  @ApiPropertyOptional({ example: "openid" })
  scope?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ["method1", "method2"]
  })
  cryptographic_binding_methods_supported?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ["RS256", "ES256"]
  })
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
    },
    example: {
      jwt: { proof_signing_alg_values_supported: ["RS256", "ES256"] },
      di_vp: { proof_signing_alg_values_supported: ["EdDSA"] },
      attestation: { proof_signing_alg_values_supported: ["ES256"] }
    }
  })
  proof_types_supported?: {
    [id: string]: {
      proof_signing_alg_values_supported: string[];
    };
  };

  @ApiProperty({
    type: () => CredentialDefinition,
    example: {
      "@context": ["https://www.w3.org/ns/credentials/v2"],
      type: ["VerifiableCredential", "UniversityDegree"]
    }
  })
  credential_definition!: CredentialDefinition;

  @ApiPropertyOptional({
    type: () => CredentialMetadata,
    example: {
      display: [
        {
          name: "University Degree",
          locale: "en-US",
          description: "A verified university degree credential",
          background_color: "#ffffff",
          text_color: "#000000",
          logo: {
            uri: "https://example.com/logo.png",
            alt_text: "Logo alt text"
          }
        }
      ],
      claims: [
        {
          path: ["name"],
          mandatory: true,
          display: [{ name: "Full Name", locale: "en-US" }]
        }
      ]
    }
  })
  credential_metadata?: CredentialMetadata;
}

@ApiExtraModels(CredentialConfiguration)
export class CredentialIssuerMetadata {
  @ApiProperty({ example: "https://issuer.example.com" })
  credential_issuer!: string;

  @ApiPropertyOptional({
    type: [String],
    example: ["https://auth.example.com"]
  })
  authorization_servers?: string[];

  @ApiPropertyOptional({ example: "https://issuer.example.com/token" })
  token_endpoint?: string;

  @ApiProperty({ example: "https://issuer.example.com/credential" })
  credential_endpoint!: string;

  @ApiPropertyOptional({ example: "https://issuer.example.com/nonce" })
  nonce_endpoint?: string;

  @ApiPropertyOptional({ example: "https://issuer.example.com/deferred" })
  deferred_credential_endpoint?: string;

  @ApiPropertyOptional({ example: "https://issuer.example.com/notify" })
  notification_endpoint?: string;

  @ApiPropertyOptional({
    type: () => CredentialRequestEncryption,
    example: {
      jwks: { kty: "EC", crv: "P-256" },
      enc_values_supported: ["A256GCM"],
      encryption_required: false
    }
  })
  credential_request_encryption?: CredentialRequestEncryption;

  @ApiPropertyOptional({
    type: () => CredentialResponseEncryption,
    example: {
      alg_values_supported: ["RSA-OAEP"],
      enc_values_supported: ["A256GCM"],
      encryption_required: true
    }
  })
  credential_response_encryption?: CredentialResponseEncryption;

  @ApiPropertyOptional({
    type: () => BatchCredentialIssuance,
    example: {
      batch_size: 10
    }
  })
  batch_credential_issuance?: BatchCredentialIssuance;

  @ApiPropertyOptional({
    type: () => [LogoDisplay],
    example: [
      {
        name: "Logo Display",
        locale: "en-US",
        logo: { uri: "https://example.com/logo.png", alt_text: "Logo alt text" }
      }
    ]
  })
  display?: LogoDisplay[];

  @ApiProperty({
    type: "object",
    additionalProperties: { $ref: getSchemaPath(CredentialConfiguration) },
    example: {
      "config-id": {
        format: "jwt_vc_json",
        "@context": ["https://www.w3.org/ns/credentials/v2"],
        scope: "openid",
        cryptographic_binding_methods_supported: ["method1", "method2"],
        credential_signing_alg_values_supported: ["RS256", "ES256"],
        proof_types_supported: {
          example: { proof_signing_alg_values_supported: ["RS256"] }
        },
        credential_definition: {
          "@context": ["https://www.w3.org/ns/credentials/v2"],
          type: ["VerifiableCredential", "UniversityDegree"]
        },
        credential_metadata: {
          display: [
            {
              name: "Extended Display Name",
              locale: "en-US",
              description: "Extended display description",
              background_color: "#ffffff",
              background_image: { uri: "https://example.com/background.png" },
              text_color: "#000000",
              logo: {
                uri: "https://example.com/logo.png",
                alt_text: "Logo alt text"
              }
            }
          ]
        }
      }
    }
  })
  credential_configurations_supported!: {
    [id: string]: CredentialConfiguration;
  };
}

export class DeferredCredentialRequest {
  @ApiProperty({ example: "tx-id-sample" })
  transaction_id!: string;

  @ApiPropertyOptional({
    type: "object",
    properties: {
      jwk: { type: "object", additionalProperties: true },
      enc: { type: "string" },
      zip: { type: "string" }
    },
    example: {
      jwk: { kty: "EC", crv: "P-256" },
      enc: "A256GCM"
    }
  })
  credential_response_encryption?: {
    jwk: Record<string, unknown>;
    enc: string;
    zip?: string;
  };
}

export class NotificationRequest {
  @ApiProperty({ example: "3fwe98js" })
  notification_id!: string;

  @ApiProperty({
    enum: ["credential_accepted", "credential_failure", "credential_deleted"],
    example: "credential_accepted"
  })
  event!: "credential_accepted" | "credential_failure" | "credential_deleted";

  @ApiPropertyOptional({
    example: "Could not store the Credential. Out of storage."
  })
  event_description?: string;
}

export class NotificationResponse {
  @ApiPropertyOptional({ example: "Notification received successfully" })
  message?: string;
}

export class CredentialErrorResponse {
  @ApiProperty({
    enum: [
      "invalid_credential_request",
      "unknown_credential_configuration",
      "unknown_credential_identifier",
      "invalid_proof",
      "invalid_nonce",
      "invalid_encryption_parameters",
      "credential_request_denied"
    ],
    example: "invalid_credential_request"
  })
  error!: string;

  @ApiPropertyOptional({
    example: "The credential request is missing required parameters"
  })
  error_description?: string;
}

export class NonceResponse {
  @ApiProperty({ example: "wKI4LT17ac15ES9bw8ac4" })
  c_nonce!: string;
}
