import {
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath
} from "@nestjs/swagger";
import {
  DIDDocument,
  JsonWebKey,
  Service,
  ServiceEndpoint,
  VerificationMethod
} from "did-resolver";

export function elementOrArray<T>(schema: T) {
  return {
    oneOf: [
      schema,
      {
        type: "array",
        items: schema
      }
    ]
  };
}

export class JsonWebKeyDto implements JsonWebKey {
  @ApiPropertyOptional()
  alg?: string;
  @ApiPropertyOptional()
  crv?: string;
  @ApiPropertyOptional()
  e?: string;
  @ApiPropertyOptional()
  ext?: boolean;
  @ApiPropertyOptional({ type: [String] })
  key_ops?: string[];
  @ApiPropertyOptional()
  kid?: string;
  @ApiProperty()
  kty!: string;
  @ApiPropertyOptional()
  n?: string;
  @ApiPropertyOptional()
  use?: string;
  @ApiPropertyOptional()
  x?: string;
  @ApiPropertyOptional()
  y?: string;
}

export class VerificationMethodDto implements VerificationMethod {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  type!: string;
  @ApiProperty()
  controller!: string;
  @ApiPropertyOptional()
  publicKeyJwk?: JsonWebKeyDto;
}

export class ServiceDto implements Service {
  @ApiProperty()
  id!: string;
  @ApiProperty()
  type!: string;
  @ApiProperty(elementOrArray({ type: "string" }))
  serviceEndpoint!: ServiceEndpoint | ServiceEndpoint[];
}

export class DIDDocumentDto implements DIDDocument {
  @ApiPropertyOptional(elementOrArray({ type: "string" }))
  "@context"?: string | string[];
  @ApiProperty()
  id!: string;
  @ApiPropertyOptional({ type: [String] })
  alsoKnownAs?: string[];
  @ApiPropertyOptional(elementOrArray({ type: "string" }))
  controller?: string | string[];
  @ApiPropertyOptional({ type: [VerificationMethodDto] })
  verificationMethod?: VerificationMethod[];
  @ApiPropertyOptional({ type: [ServiceDto] })
  service?: Service[];
  @ApiPropertyOptional({ type: [VerificationMethodDto] })
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
