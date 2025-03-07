import {
  ApiExtraModels,
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath
} from "@nestjs/swagger";
import { CredentialSubject } from "@tsg-dsp/common-dsp";
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
  PRE_AUTHORIZATION_CODE = "urn:ietf:params:oauth:grant-type:pre-authorized_code"
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

export class PreAuthorizationCodeGrant {
  @ApiProperty({ example: "pre-auth-code-xyz" })
  "pre-authorization_code": string;

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
    type: () => PreAuthorizationCodeGrant,
    example: {
      "pre-authorization_code": "pre-auth-code-xyz",
      tx_code: {
        input_mode: "numeric",
        length: 4,
        description: "Sample transaction code"
      },
      interval: 30,
      authorization_server: "authorization-server-sample"
    }
  })
  [OfferGrants.PRE_AUTHORIZATION_CODE]?: PreAuthorizationCodeGrant;

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
        "pre-authorization_code": "pre-auth-code-xyz",
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
  @ApiProperty({ example: 1 })
  id!: number;

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

  @ApiPropertyOptional({ example: "c-nonce-sample" })
  c_nonce?: string;

  @ApiPropertyOptional({ example: 300 })
  c_nonce_expires_in?: number;

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
  @ApiProperty({ example: "jwt" })
  proof_type!: "jwt";

  @ApiProperty({ example: "jwt-token-sample" })
  jwt!: string;
}

export class CwtProof {
  @ApiProperty({ example: "cbt" })
  proof_type!: "cbt";

  @ApiProperty({ example: "cbt-token-sample" })
  cbt!: string;
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
  @ApiProperty({ example: ["https://www.w3.org/2018/credentials/v1"] })
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

export class LdpVpProof {
  @ApiProperty({ example: "ldp_vp" })
  proof_type!: "ldp_vp";

  @ApiProperty({
    type: () => VpProof,
    example: {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
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
  ldp_vp!: VpProof;
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

export class CredentialSubjectElementDefinition {
  @ApiPropertyOptional({ example: true })
  mandatory?: boolean;

  @ApiPropertyOptional({ example: "string" })
  value_type?: string;

  @ApiPropertyOptional({
    type: () => [BaseDisplay],
    example: [{ name: "Field Label", locale: "en-US" }]
  })
  display?: BaseDisplay[];
}

export class CredentialSubjectDefinition {
  [name: string]:
    | CredentialSubjectElementDefinition
    | CredentialSubjectDefinition;
}

export class CredentialDefinition {
  @ApiProperty({
    type: [String],
    example: ["https://www.w3.org/2018/credentials/v1"]
  })
  "@context": string[];

  @ApiProperty({
    type: [String],
    example: ["VerifiableCredential"]
  })
  type!: string[];

  @ApiPropertyOptional({
    type: () => CredentialSubjectDefinition,
    example: {
      id: {
        mandatory: true,
        value_type: "string",
        display: [{ name: "ID", locale: "en-US" }]
      }
    }
  })
  credentialSubject?: CredentialSubjectDefinition;
}

@ApiExtraModels(JwtProof, CwtProof, LdpVpProof)
export class CredentialRequest {
  @ApiProperty({
    enum: ["jwt_vc_json-ld", "jwt_vc_json"],
    example: "jwt_vc_json-ld"
  })
  format!: "jwt_vc_json-ld" | "jwt_vc_json";

  @ApiProperty({
    type: () => CredentialDefinition,
    example: {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: ["VerifiableCredential"],
      credentialSubject: {
        id: {
          mandatory: true,
          value_type: "string",
          display: [{ name: "ID", locale: "en-US" }]
        }
      }
    }
  })
  credential_definition!: CredentialDefinition;

  @ApiProperty({
    oneOf: [
      { $ref: getSchemaPath(JwtProof) },
      { $ref: getSchemaPath(CwtProof) },
      { $ref: getSchemaPath(LdpVpProof) }
    ],
    example: { proof_type: "jwt", jwt: "jwt-token-sample" }
  })
  proof!: JwtProof | CwtProof | LdpVpProof;

  [key: string]: any;
}

export type CredentialResponse =
  | ImmediateCredentialResponse
  | DeferredCredentialResponse;

export class ImmediateCredentialResponse {
  @ApiProperty({ example: "credential-token-sample" })
  credential!: string;

  @ApiPropertyOptional({ example: "c-nonce-123" })
  c_nonce?: string;

  @ApiPropertyOptional({ example: 3600 })
  c_nonce_expires_in?: number;
}

export class DeferredCredentialResponse {
  @ApiProperty({ example: "tx-id-sample" })
  transaction_id!: string;

  @ApiPropertyOptional({ example: "c-nonce-123" })
  c_nonce?: string;

  @ApiPropertyOptional({ example: 3600 })
  c_nonce_expires_in?: number;
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

export class CredentialConfiguration {
  @ApiProperty({ example: "jwt_vc_json" })
  format!: string;

  @ApiProperty({
    type: [String],
    example: ["https://www.w3.org/2018/credentials/v1"]
  })
  "@context": string[];

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
    example: { proof_signing_alg_values_supported: ["RS256"] }
  })
  proof_types_supported?: {
    [id: string]: {
      proof_signing_alg_values_supported: string[];
    };
  };

  @ApiProperty({
    example: {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      type: ["VerifiableCredential"],
      credentialSubject: {
        id: {
          mandatory: true,
          value_type: "string",
          display: [{ name: "ID", locale: "en-US" }]
        }
      }
    }
  })
  credential_definition!: CredentialDefinition;

  @ApiPropertyOptional({
    type: () => [ExtendedDisplay],
    example: [
      {
        name: "Extended Display Name",
        locale: "en-US",
        description: "Extended display description",
        background_color: "#ffffff",
        background_image: { uri: "https://example.com/background.png" },
        text_color: "#000000",
        logo: { uri: "https://example.com/logo.png", alt_text: "Logo alt text" }
      }
    ]
  })
  display?: ExtendedDisplay[];
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

  @ApiPropertyOptional({ example: "https://issuer.example.com/batch" })
  batch_credential_endpoint?: string;

  @ApiPropertyOptional({ example: "https://issuer.example.com/deferred" })
  deferred_credential_endpoint?: string;

  @ApiPropertyOptional({ example: "https://issuer.example.com/notify" })
  notification_endpoint?: string;

  @ApiPropertyOptional({
    type: () => CredentialResponseEncryption,
    example: {
      alg_values_supported: ["RSA-OAEP"],
      enc_values_supported: ["A256GCM"],
      encryption_required: true
    }
  })
  credential_response_encryption?: CredentialResponseEncryption;

  @ApiPropertyOptional({ example: true })
  credential_identifiers_supported?: boolean;

  @ApiPropertyOptional({ example: "signed-metadata-sample" })
  signed_metadata?: string;

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
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        scope: "openid",
        cryptographic_binding_methods_supported: ["method1", "method2"],
        credential_signing_alg_values_supported: ["RS256", "ES256"],
        proof_types_supported: {
          example: { proof_signing_alg_values_supported: ["RS256"] }
        },
        credential_definition: {
          "@context": ["https://www.w3.org/2018/credentials/v1"],
          type: ["VerifiableCredential"],
          credentialSubject: {
            id: {
              mandatory: true,
              value_type: "string",
              display: [{ name: "ID", locale: "en-US" }]
            }
          }
        },
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
  })
  credential_configurations_supported!: {
    [id: string]: CredentialConfiguration;
  };
}
