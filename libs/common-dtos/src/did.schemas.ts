import {
  ApiExtraModels,
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath
} from "@nestjs/swagger";
import { elementOrArray } from "@tsg-dsp/common-dsp";
import {
  DIDDocument,
  JsonWebKey,
  Service,
  ServiceEndpoint,
  VerificationMethod
} from "did-resolver";

const randomUUID = "bdfd4c8e-3a44-4b9f-bc3e-1a8e26e3e99d";

export class JsonWebKeyDto implements JsonWebKey {
  @ApiPropertyOptional({ example: "RS256" })
  alg?: string;
  @ApiPropertyOptional({ example: "P-256" })
  crv?: string;
  @ApiPropertyOptional({ example: "AQAB" })
  e?: string;
  @ApiPropertyOptional({ example: false })
  ext?: boolean;
  @ApiPropertyOptional({ type: [String], example: ["sign", "verify"] })
  key_ops?: string[];
  @ApiPropertyOptional({ example: randomUUID })
  kid?: string;
  @ApiProperty({ example: "RSA" })
  kty!: string;
  @ApiPropertyOptional({ example: "sample_modulus" })
  n?: string;
  @ApiPropertyOptional({ example: "sig" })
  use?: string;
  @ApiPropertyOptional({ example: "sample_x_coordinate" })
  x?: string;
  @ApiPropertyOptional({ example: "sample_y_coordinate" })
  y?: string;
}

export class VerificationMethodDto implements VerificationMethod {
  @ApiProperty({ example: randomUUID })
  id!: string;
  @ApiProperty({ example: "Ed25519VerificationKey2020" })
  type!: string;
  @ApiProperty({ example: randomUUID })
  controller!: string;
  @ApiPropertyOptional()
  publicKeyJwk?: JsonWebKeyDto;
}

export class ServiceDto implements Service {
  @ApiProperty({ example: randomUUID })
  id!: string;
  @ApiProperty({ example: "LinkedDomains" })
  type!: string;
  @ApiProperty({
    example: "https://example.com",
    ...elementOrArray({ type: "string" })
  })
  serviceEndpoint!: ServiceEndpoint | ServiceEndpoint[];
}

@ApiExtraModels(VerificationMethodDto)
export class DIDDocumentDto implements DIDDocument {
  @ApiPropertyOptional({
    example: "https://www.w3.org/ns/did/v1",
    ...elementOrArray({ type: "string" })
  })
  "@context"?: string | string[];
  @ApiProperty({ example: randomUUID })
  id!: string;
  @ApiPropertyOptional({
    type: [String],
    example: ["https://example.com/profile"]
  })
  alsoKnownAs?: string[];
  @ApiPropertyOptional({
    example: randomUUID,
    ...elementOrArray({ type: "string" })
  })
  controller?: string | string[];
  @ApiPropertyOptional({
    type: () => [VerificationMethodDto],
    example: [
      {
        id: randomUUID,
        type: "Ed25519VerificationKey2020",
        controller: randomUUID,
        publicKeyJwk: {
          kty: "RSA"
        }
      }
    ]
  })
  verificationMethod?: VerificationMethod[];
  @ApiPropertyOptional({
    type: [ServiceDto],
    example: [
      {
        id: randomUUID,
        type: "LinkedDomains",
        serviceEndpoint: "https://example.com"
      }
    ]
  })
  service?: Service[];
  @ApiPropertyOptional({
    type: () => [VerificationMethodDto],
    example: [
      {
        id: randomUUID,
        type: "Ed25519VerificationKey2020",
        controller: randomUUID,
        publicKeyJwk: {
          kty: "RSA"
        }
      }
    ]
  })
  publicKey?: VerificationMethod[];
  @ApiPropertyOptional({
    type: "array",
    items: {
      oneOf: [
        { type: "string" },
        { $ref: getSchemaPath(VerificationMethodDto) }
      ]
    }
  })
  authentication?: (string | VerificationMethod)[];
  @ApiPropertyOptional({
    type: "array",
    items: {
      oneOf: [
        { type: "string" },
        { $ref: getSchemaPath(VerificationMethodDto) }
      ]
    }
  })
  assertionMethod?: (string | VerificationMethod)[];
  @ApiPropertyOptional({
    type: "array",
    items: {
      oneOf: [
        { type: "string" },
        { $ref: getSchemaPath(VerificationMethodDto) }
      ]
    }
  })
  keyAgreement?: (string | VerificationMethod)[];
  @ApiPropertyOptional({
    type: "array",
    items: {
      oneOf: [
        { type: "string" },
        { $ref: getSchemaPath(VerificationMethodDto) }
      ]
    }
  })
  capabilityInvocation?: (string | VerificationMethod)[];
  @ApiPropertyOptional({
    type: "array",
    items: {
      oneOf: [
        { type: "string" },
        { $ref: getSchemaPath(VerificationMethodDto) }
      ]
    }
  })
  capabilityDelegation?: (string | VerificationMethod)[];
}
