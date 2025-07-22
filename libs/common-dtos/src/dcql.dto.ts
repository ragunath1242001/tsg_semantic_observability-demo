import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested
} from "class-validator";

/**
 * DCQL Claims Path Pointer - points to specific claims within a credential
 * Supports JSON path syntax with strings, numbers, and null for array selection
 */
export class ClaimsPathPointer {
  @ApiProperty({
    type: [String],
    example: ["credentialSubject", "familyName"],
    description: "Array representing path to claim in credential"
  })
  @IsArray()
  path!: (string | number | null)[];
}

/**
 * Claims Query - specifies individual claims to request from a credential
 */
export class ClaimsQuery {
  @ApiPropertyOptional({
    example: "family_name_claim",
    description: "Unique identifier for this claim query"
  })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({
    type: [String],
    example: ["credentialSubject", "familyName"],
    description: "Array representing path to claim in credential"
  })
  @IsArray()
  path!: (string | number | null)[];

  @ApiPropertyOptional({
    type: [String],
    example: ["Doe", "Smith"],
    description: "Expected values for value matching"
  })
  @IsOptional()
  @IsArray()
  values?: (string | number | boolean)[];
}

/**
 * Trusted Authorities Query - specifies trusted issuers or trust frameworks
 */
export class TrustedAuthoritiesQuery {
  @ApiProperty({
    enum: ["aki", "etsi_tl", "openid_federation"],
    example: "openid_federation",
    description: "Type of trusted authority mechanism"
  })
  @IsString()
  @IsIn(["aki", "etsi_tl", "openid_federation"])
  type!: string;

  @ApiProperty({
    type: [String],
    example: ["https://trustanchor.example.com"],
    description: "Array of trusted authority identifiers"
  })
  @IsArray()
  @IsString({ each: true })
  values!: string[];
}

/**
 * Meta parameters for credential queries - format-specific metadata
 */
export class CredentialMeta {
  @ApiPropertyOptional({
    type: [String],
    example: ["https://credentials.example.com/identity_credential"],
    description: "For SD-JWT VC: allowed vct values"
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  vct_values?: string[];

  @ApiPropertyOptional({
    type: "array",
    items: {
      type: "array",
      items: { type: "string" }
    },
    example: [["VerifiableCredential", "IDCredential"]],
    description: "For W3C VC: allowed type values"
  })
  @IsOptional()
  @IsArray()
  type_values?: string[][];

  @ApiPropertyOptional({
    example: "org.iso.18013.5.1.mDL",
    description: "For mdoc: document type value"
  })
  @IsOptional()
  @IsString()
  doctype_value?: string;

  // Allow additional format-specific properties
  [key: string]: unknown;
}

/**
 * Credential Query - specifies requirements for a single credential
 */
export class CredentialQuery {
  @ApiProperty({
    example: "identity_credential",
    description: "Unique identifier for this credential query"
  })
  @IsString()
  id!: string;

  @ApiProperty({
    example: "dc+sd-jwt",
    description: "Credential format identifier",
    enum: ["jwt_vc_json", "ldp_vc", "dc+sd-jwt", "mso_mdoc"]
  })
  @IsString()
  format!: string;

  @ApiPropertyOptional({
    example: false,
    description: "Whether multiple credentials can be returned for this query"
  })
  @IsOptional()
  @IsBoolean()
  multiple?: boolean = false;

  @ApiProperty({
    type: CredentialMeta,
    description: "Format-specific metadata and constraints"
  })
  @ValidateNested()
  @Type(() => CredentialMeta)
  meta!: CredentialMeta;

  @ApiPropertyOptional({
    type: [TrustedAuthoritiesQuery],
    description: "Trusted authorities or trust frameworks"
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TrustedAuthoritiesQuery)
  trusted_authorities?: TrustedAuthoritiesQuery[];

  @ApiPropertyOptional({
    example: true,
    description: "Whether cryptographic holder binding is required"
  })
  @IsOptional()
  @IsBoolean()
  require_cryptographic_holder_binding?: boolean;

  @ApiPropertyOptional({
    type: [ClaimsQuery],
    description: "Specific claims to request from the credential"
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClaimsQuery)
  claims?: ClaimsQuery[];

  @ApiPropertyOptional({
    type: "array",
    items: {
      type: "array",
      items: { type: "string" }
    },
    example: [["claim1", "claim2"], ["claim3"]],
    description: "Alternative combinations of claims"
  })
  @IsOptional()
  @IsArray()
  claim_sets?: string[][];
}

/**
 * Credential Set Query - specifies alternative credential combinations
 */
export class CredentialSetQuery {
  @ApiProperty({
    type: "array",
    items: {
      type: "array",
      items: { type: "string" }
    },
    example: [["identity_cred"], ["passport_cred", "visa_cred"]],
    description:
      "Array of credential ID combinations that satisfy the requirement"
  })
  @IsArray()
  options!: string[][];

  @ApiPropertyOptional({
    example: true,
    description: "Whether this credential set is required"
  })
  @IsOptional()
  @IsBoolean()
  required?: boolean = true;
}

/**
 * Digital Credentials Query Language (DCQL) main query object
 */
export class DcqlQuery {
  @ApiProperty({
    type: [CredentialQuery],
    description: "Array of credential queries"
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CredentialQuery)
  credentials!: CredentialQuery[];

  @ApiPropertyOptional({
    type: [CredentialSetQuery],
    description: "Optional credential set constraints"
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CredentialSetQuery)
  credential_sets?: CredentialSetQuery[];
}

/**
 * Enhanced Authorization Request with DCQL support
 */
export class OID4VPAuthorizationRequest {
  @ApiProperty({
    example: "vp_token",
    description: "Response type - must be vp_token for OID4VP"
  })
  @IsString()
  @IsIn(["vp_token", "vp_token id_token"])
  response_type!: string;

  @ApiProperty({
    example: "direct_post",
    description: "Response mode - how the response should be delivered"
  })
  @IsString()
  @IsIn(["direct_post", "direct_post.jwt", "fragment"])
  response_mode!: string;

  @ApiProperty({
    example: "x509_san_dns:client.example.org",
    description: "Client identifier with optional prefix"
  })
  @IsString()
  client_id!: string;

  @ApiPropertyOptional({
    example: "https://client.example.org/callback",
    description: "Redirect URI (only if response_mode is not direct_post)"
  })
  @IsOptional()
  @IsString()
  redirect_uri?: string;

  @ApiPropertyOptional({
    example: "https://client.example.org/response",
    description: "Response URI (only if response_mode is direct_post)"
  })
  @IsOptional()
  @IsString()
  response_uri?: string;

  @ApiProperty({
    type: DcqlQuery,
    description: "DCQL query specifying credential requirements"
  })
  @ValidateNested()
  @Type(() => DcqlQuery)
  dcql_query!: DcqlQuery;

  @ApiProperty({
    example: "n-0S6_WzA2Mj",
    description: "Cryptographically random nonce for replay protection"
  })
  @IsString()
  nonce!: string;

  @ApiPropertyOptional({
    example: "state123",
    description: "State parameter for request/response binding"
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({
    type: Object,
    description: "Client metadata object"
  })
  @IsOptional()
  @IsObject()
  client_metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    type: [String],
    example: ["eyJhbGciOiJSUzI1NiJ9..."],
    description: "Transaction data for binding user authorization"
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  transaction_data?: string[];

  @ApiPropertyOptional({
    type: [Object],
    description: "Verifier attestations and metadata"
  })
  @IsOptional()
  @IsArray()
  verifier_info?: Record<string, unknown>[];

  @ApiPropertyOptional({
    example: "post",
    description: "HTTP method for request_uri (get or post)"
  })
  @IsOptional()
  @IsString()
  @IsIn(["get", "post"])
  request_uri_method?: string;
}

/**
 * VP Token structure according to OID4VP 1.0-final
 */
export class VpToken {
  [credentialId: string]: string[];
}

/**
 * Enhanced Authorization Response with VP Token
 */
export class OID4VPAuthorizationResponse {
  @ApiProperty({
    type: VpToken,
    example: { identity_credential: ["eyJhbGciOiJFUzI1NiJ9..."] },
    description: "VP Token with credential ID to presentations mapping"
  })
  @Transform(({ value }) => {
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        throw new Error("vp_token must be valid JSON");
      }
    }
    return value;
  })
  @IsObject()
  vp_token!: VpToken;

  @ApiProperty({
    example: "state123",
    description: "State parameter from the authorization request"
  })
  @IsString()
  state!: string;
}
